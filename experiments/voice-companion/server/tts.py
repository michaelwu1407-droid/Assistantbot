"""Text-to-speech backends.

openai  -> POST {base_url}/audio/speech (Kokoro-FastAPI, Qwen3-TTS wrappers, openedai-speech, ...)
browser -> returns None; the web page speaks with speechSynthesis instead.
"""
from __future__ import annotations

import httpx

from .config import TTSConfig


class BrowserTTS:
    name = "browser"

    async def synth(self, text: str) -> bytes | None:
        return None

    async def aclose(self) -> None:
        pass


class OpenAICompatTTS:
    name = "openai"

    def __init__(self, cfg: TTSConfig, client: httpx.AsyncClient | None = None):
        self.cfg = cfg
        headers = {"Authorization": f"Bearer {cfg.api_key}"} if cfg.api_key else {}
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(60, connect=5), headers=headers)

    async def synth(self, text: str) -> bytes | None:
        url = self.cfg.base_url.rstrip("/") + "/audio/speech"
        body = {"model": self.cfg.model, "voice": self.cfg.voice, "input": text, "response_format": "wav"}
        resp = await self.client.post(url, json=body)
        if resp.status_code >= 400:
            raise RuntimeError(f"TTS server returned {resp.status_code}: {resp.text[:300]}")
        return resp.content

    async def aclose(self) -> None:
        await self.client.aclose()


def make_tts(cfg: TTSConfig):
    if cfg.backend == "openai":
        return OpenAICompatTTS(cfg)
    if cfg.backend == "browser":
        return BrowserTTS()
    raise ValueError(f"Unknown tts.backend {cfg.backend!r} (use 'openai' or 'browser')")
