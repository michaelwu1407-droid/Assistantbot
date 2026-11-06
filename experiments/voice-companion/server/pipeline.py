"""One conversation: user text -> streamed LLM reply -> per-sentence TTS, sent to the client in order."""
from __future__ import annotations

import asyncio
import base64
import time
from typing import Awaitable, Callable

from .config import Persona
from .text import SentenceChunker, ThinkFilter

Send = Callable[[dict], Awaitable[None]]


class Conversation:
    def __init__(self, persona: Persona, llm, tts):
        self.persona = persona
        self.llm = llm
        self.tts = tts
        self.history: list[dict] = []
        self._last_reply: list[str] = []   # sentences of the latest assistant turn

    def reset(self) -> None:
        self.history.clear()
        self._last_reply = []

    def greeting_cue(self) -> str:
        return f"({self.persona.user_name} just came online. Greet them in one short line, in character.)"

    def messages(self, user_text: str) -> list[dict]:
        keep = self.history[-2 * self.persona.max_history:] if self.persona.max_history else []
        merged: list[dict] = []
        # Interrupted turns can leave two user messages in a row; many chat templates
        # require strict alternation, so join them.
        for m in [*keep, {"role": "user", "content": user_text}]:
            if merged and merged[-1]["role"] == m["role"]:
                merged[-1] = {"role": m["role"], "content": merged[-1]["content"] + "\n" + m["content"]}
            else:
                merged.append(dict(m))
        while merged and merged[0]["role"] == "assistant":
            merged.pop(0)
        return [{"role": "system", "content": self.persona.render_prompt()}, *merged]

    def trim_to_heard(self, heard: int) -> None:
        """After an interruption, remember only the sentences the user actually heard."""
        if not self.history or self.history[-1]["role"] != "assistant" or heard >= len(self._last_reply):
            return
        if heard <= 0:
            self.history.pop()
        else:
            self.history[-1] = {"role": "assistant", "content": " ".join(self._last_reply[:heard]) + " —"}
        self._last_reply = self._last_reply[:heard]

    async def reply(self, user_text: str, send: Send, started: float | None = None) -> str:
        """Generate and send a reply. Safe to cancel; history keeps what was already sent."""
        started = started or time.perf_counter()
        queue: asyncio.Queue[str | None] = asyncio.Queue()
        said: list[str] = []
        self._last_reply = said
        msgs = self.messages(user_text)
        self.history.append({"role": "user", "content": user_text})
        await send({"type": "state", "state": "thinking"})

        async def produce() -> None:
            think, chunker = ThinkFilter(), SentenceChunker()
            try:
                async for token in self.llm.stream(msgs):
                    for s in chunker.feed(think.feed(token)):
                        await queue.put(s)
                for s in chunker.feed(think.flush()) + chunker.flush():
                    await queue.put(s)
            finally:
                await queue.put(None)

        async def consume() -> None:
            idx = 0
            while (sentence := await queue.get()) is not None:
                audio = await self.tts.synth(sentence)
                msg = {"type": "sentence", "id": idx, "text": sentence,
                       "audio": base64.b64encode(audio).decode() if audio else None}
                if idx == 0:
                    msg["latency_ms"] = int((time.perf_counter() - started) * 1000)
                await send(msg)
                said.append(sentence)
                idx += 1

        producer = asyncio.create_task(produce())
        try:
            await consume()
            await producer  # surface LLM errors
        finally:
            producer.cancel()
            if said:
                self.history.append({"role": "assistant", "content": " ".join(said)})
        await send({"type": "done"})
        return " ".join(said)
