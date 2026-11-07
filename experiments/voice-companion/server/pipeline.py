"""One conversation: user text -> streamed LLM reply -> per-sentence TTS, sent to the client in order."""
from __future__ import annotations

import asyncio
import base64
import re
import time
from typing import Awaitable, Callable

from .config import Persona
from .text import (SentenceChunker, ThinkFilter, ends_sentence, fix_roles, out_of_character, similar,
                   split_sentences, tidy_opening)

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

    def messages(self, user_text: str, reminder: bool = False) -> list[dict]:
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
        if self._compact():
            merged = self._compact_history(merged)
        if reminder and self.persona.turn_reminder:
            # Small models follow what came last; a one-line nudge after the history keeps them in role.
            note = self.persona.turn_reminder.format(name=self.persona.name, user_name=self.persona.user_name)
            merged[-1] = {"role": "user", "content": merged[-1]["content"] + "\n" + note}
        return [{"role": "system", "content": self.persona.render_prompt()}, *merged]

    def next_prompt_prefix(self) -> list[dict]:
        """Everything the next request will start with, up to where the user's new words go."""
        msgs = self.messages("")
        msgs[-1] = {"role": "user", "content": ""}
        return msgs

    def _compact(self) -> bool:
        mode = self.persona.history
        if mode == "auto":
            m = re.search(r"(\d+(?:\.\d+)?)\s*b\b", str(getattr(self.llm, "model", "")).lower())
            return bool(m) and float(m.group(1)) < 3
        return mode == "compact"

    def _compact_history(self, merged: list[dict]) -> list[dict]:
        keep = merged[-3:]
        while keep and keep[0]["role"] == "assistant":
            keep = keep[1:]
        earlier = [m["content"] for m in merged[:-len(keep)] if m["role"] == "user"][-6:]
        if earlier and keep:
            note = f"(Earlier {self.persona.user_name} said: " + " | ".join(earlier) + ")\n"
            keep[0] = {"role": "user", "content": note + keep[0]["content"]}
        return keep

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
        reply_start = time.perf_counter()
        first_text_at = 0.0
        queue: asyncio.Queue[str | None] = asyncio.Queue()
        said: list[str] = []
        self._last_reply = said
        msgs = self.messages(user_text, reminder=True)
        self.history.append({"role": "user", "content": user_text})
        await send({"type": "state", "state": "thinking"})

        recent = [m["content"] for m in self.history[-10:] if m["role"] == "assistant"][-4:]
        recent_sentences = [x for r in recent + self.persona.example_lines() for x in split_sentences(r)]

        def verdict(s: str, guard: bool) -> str:
            """'ok' to speak, 'skip' to drop this sentence, 'repeat' when she'd repeat herself."""
            if not s.strip() or out_of_character(s):
                return "skip"  # never voice "I'm just a language model"
            if guard and (any(similar(s, r[:len(s)]) for r in recent)
                          or any(similar(s, x, 0.75) for x in recent_sentences)):
                return "repeat"
            return "ok"

        async def attempt(temperature: float | None, guard: bool = True, note: str = "", bare: bool = False) -> bool:
            """Stream one candidate reply into the queue. False = nothing was spoken."""
            nonlocal first_text_at
            think, chunker, sentences, spoken = ThinkFilter(), SentenceChunker(), 0, 0
            base = [msgs[0], msgs[-1]] if bare else msgs  # bare: no history, which breaks repetition loops
            prompt = base if not note else [*base[:-1], {**base[-1], "content": base[-1]["content"] + "\n" + note}]

            async def speak(s: str) -> bool:  # False = abort this attempt
                nonlocal first_text_at, spoken, sentences
                s = fix_roles(s, self.persona.name, self.persona.user_name)
                v = verdict(s, guard)
                if v == "repeat" and spoken == 0 and temperature is None:
                    return False  # opening like a recent reply: retry hotter
                if v != "ok":
                    return True
                first_text_at = first_text_at or time.perf_counter()
                await queue.put(tidy_opening(s) if spoken == 0 else s)
                spoken += 1
                sentences += ends_sentence(s)
                return True

            async for token in self.llm.stream(prompt, temperature=temperature):
                for s in chunker.feed(think.feed(token)):
                    if not await speak(s):
                        return False
                if self.persona.max_sentences and sentences >= self.persona.max_sentences:
                    return True  # spoken replies stay short; also frees the CPU for the voice
            for s in chunker.feed(think.flush()) + chunker.flush():
                if not await speak(s):
                    return False
            return spoken > 0

        async def produce() -> None:
            hot = min(1.3, self.llm.cfg.temperature + 0.4) if hasattr(self.llm, "cfg") else 1.0
            avoid = f'(You just said "{recent[-1][:90]}". Say something different.)' if recent else ""
            try:
                # normal → hotter with a "don't repeat" note → without history → repeats allowed →
                # a short fallback. She is never silent.
                if not (await attempt(None) or await attempt(hot, note=avoid) or await attempt(hot, note=avoid, bare=True)
                        or await attempt(hot, guard=False, note=avoid)):
                    await queue.put("嗯？你再说一遍？" if re.search(r"[\u3400-\u9fff]", user_text) else "Mm, say that again?")
            finally:
                await queue.put(None)

        async def consume() -> None:
            idx = 0
            while (sentence := await queue.get()) is not None:
                t_tts = time.perf_counter()
                audio = await self.tts.synth(sentence)
                msg = {"type": "sentence", "id": idx, "text": sentence,
                       "audio": base64.b64encode(audio).decode() if audio else None,
                       "tts_ms": int((time.perf_counter() - t_tts) * 1000)}
                if idx == 0:
                    now = time.perf_counter()
                    msg["latency_ms"] = int((now - started) * 1000)
                    # first clause from the LLM (falls back to "now" if it came from flush)
                    msg["llm_ms"] = int(((first_text_at or t_tts) - reply_start) * 1000)
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
