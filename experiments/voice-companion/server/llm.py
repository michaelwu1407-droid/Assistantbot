"""Streaming chat against any OpenAI-compatible server (llama.cpp llama-server, Ollama, LM Studio...)."""
from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from .config import LLMConfig


class ChatLLM:
    def __init__(self, cfg: LLMConfig, client: httpx.AsyncClient | None = None):
        self.cfg = cfg
        headers = {"Authorization": f"Bearer {cfg.api_key}"} if cfg.api_key else {}
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(120, connect=5), headers=headers)

    async def stream(self, messages: list[dict]) -> AsyncIterator[str]:
        body = {
            "model": self.cfg.model,
            "messages": messages,
            "stream": True,
            "temperature": self.cfg.temperature,
            "max_tokens": self.cfg.max_tokens,
            # llama.cpp (--jinja) honours this to skip Qwen3 "thinking"; others ignore it.
            "chat_template_kwargs": {"enable_thinking": False},
        }
        url = self.cfg.base_url.rstrip("/") + "/chat/completions"
        async with self.client.stream("POST", url, json=body) as resp:
            if resp.status_code >= 400:
                detail = (await resp.aread()).decode(errors="replace")[:300]
                raise RuntimeError(f"LLM server returned {resp.status_code}: {detail}")
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

    async def aclose(self) -> None:
        await self.client.aclose()
