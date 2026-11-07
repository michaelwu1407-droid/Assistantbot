"""Streaming chat against any OpenAI-compatible server (llama.cpp, Ollama, LM Studio...)."""
from __future__ import annotations

import json
from typing import AsyncIterator

import re

import httpx

from .config import LLMConfig

_CJK = re.compile(r"[\u3400-\u9fff]")

# Tried in order when base_url = "auto".
KNOWN_SERVERS = [
    ("llama.cpp", "http://127.0.0.1:8080/v1"),
    ("Ollama", "http://127.0.0.1:11434/v1"),
    ("LM Studio", "http://127.0.0.1:1234/v1"),
]


class LLMUnavailable(RuntimeError):
    pass


class ChatLLM:
    def __init__(self, cfg: LLMConfig, client: httpx.AsyncClient | None = None):
        self.cfg = cfg
        headers = {"Authorization": f"Bearer {cfg.api_key}"} if cfg.api_key else {}
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(120, connect=3), headers=headers)
        self.base_url = "" if cfg.base_url == "auto" else cfg.base_url.rstrip("/")
        self.model = "" if cfg.model == "auto" else cfg.model

    @property
    def label(self) -> str:
        model = (self.model or "?").replace("\\", "/").rsplit("/", 1)[-1].removesuffix(".gguf")
        server = next((n for n, u in KNOWN_SERVERS if u == self.base_url), self.base_url or "not found")
        return f"{model} · {server}"

    async def connect(self) -> None:
        """Find the server and model. Raises LLMUnavailable with a human-readable fix."""
        candidates = [("", self.base_url)] if self.base_url else KNOWN_SERVERS
        for _name, url in candidates:
            try:
                resp = await self.client.get(url + "/models", timeout=3)
            except httpx.HTTPError:
                continue
            self.base_url = url
            if not self.model:
                try:
                    models = resp.json().get("data", []) if resp.status_code == 200 else []
                except ValueError:
                    models = []
                self.model = models[0]["id"] if models else "local"
            return
        if self.base_url:
            raise LLMUnavailable(f"Can't reach the language model at {self.base_url}. Start llama.cpp, Ollama or "
                                 "LM Studio there and she will connect automatically.")
        raise LLMUnavailable("No language model server found. Start llama.cpp "
                             "(llama-server -m model.gguf --port 8080), Ollama or LM Studio and she will connect automatically.")

    async def stream(self, messages: list[dict], temperature: float | None = None) -> AsyncIterator[str]:
        if not self.base_url or not self.model:
            await self.connect()
        if messages and messages[-1]["role"] == "user":
            last = messages[-1]["content"]
            if _CJK.search(last):
                last += "\n（用中文回答）"  # small models drift between languages without an explicit cue
            elif any(_CJK.search(m["content"]) for m in messages[-4:-1] if m["role"] == "assistant"):
                last += "\n(Reply in English.)"
            if "qwen3" in self.model.lower():
                # Qwen3's soft switch for servers that ignore chat_template_kwargs. It must be on
                # the latest user turn: the model obeys the most recent switch.
                last += " /no_think"
            messages = [*messages[:-1], {"role": "user", "content": last}]
        body = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "temperature": self.cfg.temperature if temperature is None else temperature,
            "max_tokens": self.cfg.max_tokens,
            # llama.cpp (--jinja) honours this to skip Qwen3 "thinking"; others ignore it.
            "chat_template_kwargs": {"enable_thinking": False},
            # small models loop ("Max is still chewy in his shoes!") without these
            "frequency_penalty": 0.6,
            "presence_penalty": 0.4,
            "repeat_penalty": 1.15,  # llama.cpp name; ignored elsewhere
        }
        try:
            async with self.client.stream("POST", self.base_url + "/chat/completions", json=body) as resp:
                if resp.status_code >= 400:
                    detail = (await resp.aread()).decode(errors="replace")[:200]
                    raise LLMUnavailable(f"The language model returned an error ({resp.status_code}): {detail}")
                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        choice = json.loads(data)["choices"][0]
                    except (ValueError, KeyError, IndexError):
                        continue
                    token = (choice.get("delta") or {}).get("content")
                    if token:
                        yield token
        except httpx.ConnectError:
            raise LLMUnavailable(f"Lost the language model at {self.base_url}. Is it still running?") from None

    async def prime(self, messages: list[dict]) -> None:
        """Have the server read a prompt prefix into its cache (1 token generated) while the user is
        still listening/talking, so their next turn only costs their own new words."""
        if not self.base_url or not self.model:
            return
        body = {"model": self.model, "messages": messages, "max_tokens": 1, "stream": False,
                "chat_template_kwargs": {"enable_thinking": False}}
        try:
            await self.client.post(self.base_url + "/chat/completions", json=body, timeout=30)
        except httpx.HTTPError:
            pass

    async def warmup(self, system_prompt: str) -> None:
        """Prime the server's prompt cache with the system prompt so the first reply is quick."""
        msgs = [{"role": "system", "content": system_prompt}, {"role": "user", "content": "hi"}]
        async for _ in self.stream(msgs):
            break

    async def aclose(self) -> None:
        await self.client.aclose()
