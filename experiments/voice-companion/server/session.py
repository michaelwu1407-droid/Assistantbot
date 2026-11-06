"""One browser tab's voice session over /ws."""
from __future__ import annotations

import asyncio
import json
import logging
import time

import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from .engine import Engine
from .pipeline import Conversation

log = logging.getLogger("voice-companion")
MAX_AUDIO_SECONDS = 60


class Session:
    def __init__(self, socket: WebSocket, engine: Engine):
        self.socket, self.engine = socket, engine
        self.conv = Conversation(engine.cfg.persona, engine.llm, engine.tts)
        self.task: asyncio.Task | None = None
        self.send_lock = asyncio.Lock()
        self.greeted = False
        self.turn = 0  # tags every reply message so the browser can drop cancelled turns

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
                    await self.on_json(json.loads(msg["text"]))
        except WebSocketDisconnect:
            pass
        finally:
            await self.interrupt()

    async def on_json(self, data: dict) -> None:
        kind = data.get("type")
        if kind == "text" and str(data.get("text", "")).strip():
            await self.start_reply(str(data["text"]).strip())
        elif kind == "interrupt":
            await self.interrupt(data.get("heard"))
        elif kind == "reset":
            await self.interrupt()
            self.conv.reset()
            self.greeted = False
            if self.engine.stt is not None:
                self.engine.stt.reset_language()
        elif kind == "greet":
            if self.engine.cfg.persona.greet and not self.greeted and not self.conv.history:
                self.greeted = True
                await self.start_reply(self.conv.greeting_cue())

    async def on_audio(self, payload: bytes) -> None:
        started = time.perf_counter()
        await self.interrupt()
        stt = self.engine.stt
        if stt is None:
            err = self.engine.status["stt"].error or "Speech recognition is off. You can still type."
            await self.send({"type": "error", "message": err})
            await self.send({"type": "state", "state": "listening"})
            return
        pcm = np.frombuffer(payload[: 16000 * 4 * MAX_AUDIO_SECONDS], dtype=np.float32)
        await self.send({"type": "state", "state": "transcribing"})
        text = await asyncio.to_thread(stt.transcribe, pcm)
        if not text:  # noise or a phantom phrase: quietly keep listening
            await self.send({"type": "state", "state": "listening", "ignored": True})
            return
        await self.send({"type": "user", "text": text, "stt_ms": int((time.perf_counter() - started) * 1000)})
        await self.start_reply(text, started)

    async def start_reply(self, text: str, started: float | None = None) -> None:
        await self.interrupt()
        e = self.engine
        if e.llm is None or e.tts is None:
            await self.send({"type": "error", "message": "Still waking up, give me a few seconds…"})
            await self.send({"type": "state", "state": "listening"})
            return
        # pick up hot-swapped backends for each new turn
        self.conv.persona, self.conv.llm, self.conv.tts = e.cfg.persona, e.llm, e.tts
        self.turn += 1
        self.task = asyncio.create_task(self._reply(text, started, self.turn))

    async def _reply(self, text: str, started: float | None, turn: int) -> None:
        async def send(msg: dict) -> None:
            await self.send({**msg, "turn": turn})
        try:
            await self.conv.reply(text, send, started)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.warning("reply failed: %s", exc)
            await send({"type": "error", "message": str(exc)})
            await send({"type": "done"})

    async def interrupt(self, heard: int | None = None) -> None:
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except (asyncio.CancelledError, Exception):
                pass
        self.task = None
        if isinstance(heard, int):
            self.conv.trim_to_heard(heard)
