"""Text-to-speech backends. Each synth() returns WAV bytes, or None for the browser voice.

kokoro  -> built-in Kokoro-82M (ONNX), runs in this process
openai  -> POST {base_url}/audio/speech on any OpenAI-compatible TTS server
browser -> the web page speaks with speechSynthesis
"""
from __future__ import annotations

import asyncio
import io
import re
import threading
import wave

import httpx
import numpy as np

from .config import TTSConfig, resolve

_CJK = re.compile(r"[㐀-鿿]")


def to_wav(samples: np.ndarray, rate: int) -> bytes:
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes()
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


class BrowserTTS:
    name = "browser"

    async def synth(self, text: str) -> bytes | None:
        return None

    def warmup(self) -> None:
        pass

    async def aclose(self) -> None:
        pass


class KokoroTTS:
    name = "kokoro"

    def __init__(self, cfg: TTSConfig):
        from kokoro_onnx import Kokoro  # heavy import, keep lazy

        self.cfg = cfg
        self.kokoro = Kokoro(str(resolve(cfg.kokoro_model)), str(resolve(cfg.kokoro_voices)))
        self.lock = threading.Lock()

    def _synth(self, text: str) -> bytes:
        zh = bool(_CJK.search(text))
        voice = self.cfg.voice_zh if zh else self.cfg.voice
        lang = "cmn" if zh else ("en-gb" if voice[:1] == "b" else "en-us")
        with self.lock:
            samples, rate = self.kokoro.create(text, voice=voice, speed=self.cfg.speed, lang=lang)
        return to_wav(samples, rate)

    def warmup(self) -> None:
        self._synth("Hi.")

    async def synth(self, text: str) -> bytes | None:
        return await asyncio.to_thread(self._synth, text)

    async def aclose(self) -> None:
        pass


class OpenAICompatTTS:
    name = "openai"

    def __init__(self, cfg: TTSConfig, client: httpx.AsyncClient | None = None):
        self.cfg = cfg
        headers = {"Authorization": f"Bearer {cfg.api_key}"} if cfg.api_key else {}
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(60, connect=5), headers=headers)

    def warmup(self) -> None:
        pass

    async def synth(self, text: str) -> bytes | None:
        url = self.cfg.base_url.rstrip("/") + "/audio/speech"
        voice = self.cfg.voice_zh if _CJK.search(text) else self.cfg.voice
        body = {"model": self.cfg.model, "voice": voice, "input": text, "response_format": "wav"}
        try:
            resp = await self.client.post(url, json=body)
        except httpx.ConnectError:
            raise RuntimeError(f"Can't reach the voice server at {self.cfg.base_url}. Is it running?") from None
        if resp.status_code >= 400:
            raise RuntimeError(f"Voice server returned {resp.status_code}: {resp.text[:200]}")
        return resp.content

    async def aclose(self) -> None:
        await self.client.aclose()


def kokoro_available(cfg: TTSConfig) -> bool:
    try:
        import kokoro_onnx  # noqa: F401
    except ImportError:
        return False
    return resolve(cfg.kokoro_model).is_file() and resolve(cfg.kokoro_voices).is_file()


def make_tts(cfg: TTSConfig):
    backend = cfg.backend
    if backend == "auto":
        backend = "kokoro" if kokoro_available(cfg) else "browser"
    if backend == "kokoro":
        return KokoroTTS(cfg)
    if backend == "openai":
        return OpenAICompatTTS(cfg)
    if backend == "browser":
        return BrowserTTS()
    raise ValueError(f"Unknown tts.backend {backend!r} (use auto, kokoro, openai or browser)")
