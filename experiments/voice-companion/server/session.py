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
        # Speculation: the browser sends audio as soon as the user *might* have finished. We start
        # transcribing and replying at once, but hold the output until it confirms ("commit").
        self.expect_spec = False
        self.spec_task: asyncio.Task | None = None
        self.holding = False
        self.held: list[dict] = []
        self.spec_mark = 0

    async def send(self, msg: dict) -> None:
        async with self.send_lock:
            await self.socket.send_json(msg)

    async def send_spec(self, msg: dict) -> None:
        async with self.send_lock:
            if self.holding:
                self.held.append(msg)
            else:
                await self.socket.send_json(msg)

    async def commit_spec(self) -> None:
        async with self.send_lock:
            self.holding = False
            for msg in self.held:
                await self.socket.send_json(msg)
            self.held.clear()

    async def cancel_spec(self) -> None:
        was_active = self.holding or (self.spec_task and not self.spec_task.done())
        self.holding = False
        self.held.clear()
        for task in (self.spec_task, self.task if was_active else None):
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
        self.spec_task = None
        if was_active:  # forget the provisional turn entirely
            self.task = None
            del self.conv.history[self.spec_mark:]

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
        elif kind == "speculate":
            self.expect_spec = True  # the next binary message is provisional audio
        elif kind == "commit":
            await self.commit_spec()
        elif kind == "spec_cancel":
            await self.cancel_spec()
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
        if self.expect_spec:
            self.expect_spec = False
            await self.cancel_spec()
            await self.interrupt()
            self.spec_mark, self.holding = len(self.conv.history), True
            self.spec_task = asyncio.create_task(self.process_audio(payload, started, self.send_spec))
            return
        await self.cancel_spec()
        await self.interrupt()
        await self.process_audio(payload, started, self.send)

    async def process_audio(self, payload: bytes, started: float, out) -> None:
        stt = self.engine.stt
        if stt is None:
            err = self.engine.status["stt"].error or "Speech recognition is off. You can still type."
            await out({"type": "error", "message": err})
            await out({"type": "state", "state": "listening"})
            return
        pcm = np.frombuffer(payload[: 16000 * 4 * MAX_AUDIO_SECONDS], dtype=np.float32)
        await out({"type": "state", "state": "transcribing"})
        text = await asyncio.to_thread(stt.transcribe, pcm)
        if not text:  # noise or a phantom phrase: quietly keep listening
            await out({"type": "state", "state": "listening", "ignored": True})
            return
        await out({"type": "user", "text": text, "stt_ms": int((time.perf_counter() - started) * 1000)})
        await self.start_reply(text, started, out)

    async def start_reply(self, text: str, started: float | None = None, out=None) -> None:
        out = out or self.send
        await self.interrupt()
        e = self.engine
        if e.llm is None or e.tts is None:
            await out({"type": "error", "message": "Still waking up, give me a few seconds…"})
            await out({"type": "state", "state": "listening"})
            return
        # pick up hot-swapped backends for each new turn
        self.conv.persona, self.conv.llm, self.conv.tts = e.cfg.persona, e.llm, e.tts
        self.turn += 1
        self.task = asyncio.create_task(self._reply(text, started, self.turn, out))

    async def _reply(self, text: str, started: float | None, turn: int, out) -> None:
        async def send(msg: dict) -> None:
            await out({**msg, "turn": turn})
        try:
            await self.conv.reply(text, send, started)
            if hasattr(self.conv.llm, "prime"):
                await self.conv.llm.prime(self.conv.next_prompt_prefix())
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
