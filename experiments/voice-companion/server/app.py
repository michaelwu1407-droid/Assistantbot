"""FastAPI app: serves the web UI and the /ws voice session."""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from .config import ROOT, Config, load_config
from .llm import ChatLLM
from .pipeline import Conversation
from .tts import make_tts

log = logging.getLogger("voice-companion")
MAX_AUDIO_SECONDS = 60


class Engine:
    """Holds the swappable backends. reload() rebuilds them from config.toml."""

    def __init__(self, demo: bool = False):
        self.demo = demo
        self.cfg: Config = load_config()
        self.stt = None
        self.stt_error = ""
        self.llm = self.tts = None
        self.lock = asyncio.Lock()

    async def reload(self) -> None:
        async with self.lock:
            old = (self.llm, self.tts)
            cfg = load_config()
            if self.demo:
                from .demo import DemoLLM
                from .tts import BrowserTTS
                self.llm, self.tts = DemoLLM(), BrowserTTS()
            else:
                self.llm, self.tts = ChatLLM(cfg.llm), make_tts(cfg.tts)
            if not self.demo and (self.stt is None or cfg.stt != self.cfg.stt):
                self.stt, self.stt_error = await asyncio.to_thread(_load_stt, cfg)
            self.cfg = cfg
            for backend in old:
                if backend is not None:
                    await backend.aclose()

    def info(self) -> dict:
        p = self.cfg.persona
        return {
            "name": p.name, "user_name": p.user_name, "avatar": p.avatar,
            "demo": self.demo, "tts": "browser" if self.demo else self.cfg.tts.backend,
            "stt_ready": self.stt is not None, "stt_error": self.stt_error,
            "llm": "demo" if self.demo else f"{self.cfg.llm.model} @ {self.cfg.llm.base_url}",
        }


def _load_stt(cfg: Config):
    try:
        from .stt import WhisperSTT
        return WhisperSTT(cfg.stt), ""
    except Exception as exc:  # missing package, no model download, bad device...
        log.warning("Speech-to-text unavailable: %s", exc)
        return None, f"Speech-to-text unavailable: {exc}"


def create_app(demo: bool = False) -> FastAPI:
    engine = Engine(demo=demo)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        await engine.reload()
        yield

    app = FastAPI(title="Voice Companion", lifespan=lifespan)
    app.state.engine = engine

    @app.get("/api/info")
    async def info() -> dict:
        return engine.info()

    @app.post("/api/reload")
    async def reload() -> dict:
        await engine.reload()
        return engine.info()

    @app.websocket("/ws")
    async def ws(socket: WebSocket) -> None:
        await socket.accept()
        await Session(socket, engine).run()

    app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
    return app


class Session:
    def __init__(self, socket: WebSocket, engine: Engine):
        self.socket, self.engine = socket, engine
        self.conv = Conversation(engine.cfg.persona, engine.llm, engine.tts)
        self.task: asyncio.Task | None = None
        self.send_lock = asyncio.Lock()

    async def send(self, msg: dict) -> None:
        async with self.send_lock:
            await self.socket.send_json(msg)

    async def run(self) -> None:
        await self.send({"type": "state", "state": "listening"})
        try:
            while True:
                msg = await self.socket.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                if msg.get("bytes") is not None:
                    await self.on_audio(msg["bytes"])
                elif msg.get("text") is not None:
                    await self.on_json(msg["text"])
        except WebSocketDisconnect:
            pass
        finally:
            await self.interrupt()

    async def on_json(self, raw: str) -> None:
        data = json.loads(raw)
        kind = data.get("type")
        if kind == "text" and data.get("text", "").strip():
            await self.start_reply(data["text"].strip())
        elif kind == "interrupt":
            await self.interrupt()
        elif kind == "reset":
            await self.interrupt()
            self.conv.reset()

    async def on_audio(self, payload: bytes) -> None:
        await self.interrupt()
        stt = self.engine.stt
        if stt is None:
            await self.send({"type": "error", "message": self.engine.stt_error or "Speech-to-text is off. Type instead."})
            return
        pcm = np.frombuffer(payload[: 16000 * 4 * MAX_AUDIO_SECONDS], dtype=np.float32)
        await self.send({"type": "state", "state": "transcribing"})
        text = await asyncio.to_thread(stt.transcribe, pcm)
        if not text:
            await self.send({"type": "state", "state": "listening"})
            return
        await self.send({"type": "user", "text": text})
        await self.start_reply(text)

    async def start_reply(self, text: str) -> None:
        await self.interrupt()
        # pick up hot-swapped backends for each new turn
        self.conv.persona, self.conv.llm, self.conv.tts = self.engine.cfg.persona, self.engine.llm, self.engine.tts
        self.task = asyncio.create_task(self._reply(text))

    async def _reply(self, text: str) -> None:
        try:
            await self.conv.reply(text, self.send)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.exception("reply failed")
            await self.send({"type": "error", "message": str(exc)})
            await self.send({"type": "done"})

    async def interrupt(self) -> None:
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except (asyncio.CancelledError, Exception):
                pass
        self.task = None
