"""Engine: owns the swappable STT / LLM / TTS backends and reports their health."""
from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict, dataclass

from .config import Config, load_config
from .llm import ChatLLM
from .tts import BrowserTTS, make_tts

log = logging.getLogger("voice-companion")


@dataclass
class Status:
    ok: bool = False
    label: str = "loading…"
    error: str = ""


class Engine:
    def __init__(self, demo: bool = False):
        self.demo = demo
        self.cfg: Config = load_config()
        self.stt = self.llm = self.tts = None
        self.status = {"stt": Status(), "llm": Status(), "tts": Status()}
        self.loading = True
        self.lock = asyncio.Lock()

    async def reload(self) -> None:
        async with self.lock:
            self.loading = True
            try:
                await self._reload()
            finally:
                self.loading = False

    async def _reload(self) -> None:
        cfg = load_config()
        p = cfg.persona
        old_llm, old_tts = self.llm, self.tts
        if self.demo:
            from .demo import DemoLLM
            self.llm, self.tts = DemoLLM(), BrowserTTS()
            self.status = {"stt": Status(False, "off in demo mode", "Demo mode: type, or run without --demo to talk."),
                           "llm": Status(True, "demo replies"), "tts": Status(True, "browser voice")}
            self.cfg = cfg
            return

        # STT: only rebuild when its settings changed (loading Whisper is slow)
        if self.stt is None or cfg.stt != self.cfg.stt:
            self.status["stt"] = Status(False, "loading Whisper…")
            self.stt, self.status["stt"] = await asyncio.to_thread(_load_stt, cfg)
        if self.stt is not None:
            self.stt.set_names(p.name, p.user_name)

        self.status["tts"] = Status(False, "loading voice…")
        try:
            tts = await asyncio.to_thread(make_tts, cfg.tts)
            await asyncio.to_thread(tts.warmup)
            self.tts = tts
            self.status["tts"] = Status(True, {"kokoro": f"Kokoro · {cfg.tts.voice}", "browser": "browser voice",
                                               "openai": f"{cfg.tts.model} · {cfg.tts.voice}"}[tts.name])
        except Exception as exc:
            log.warning("voice unavailable: %s", exc)
            self.tts = BrowserTTS()
            self.status["tts"] = Status(True, "browser voice", f"Built-in voice failed ({exc}); using the browser's.")

        llm = ChatLLM(cfg.llm)
        self.llm = llm
        self.status["llm"] = Status(False, "looking for a model…")
        try:
            await llm.connect()
            await llm.warmup(p.render_prompt())
            self.status["llm"] = Status(True, llm.label)
        except Exception as exc:
            self.status["llm"] = Status(False, "not connected", str(exc))

        self.cfg = cfg
        for backend in (old_llm, old_tts):
            if backend is not None and backend not in (self.llm, self.tts):
                await backend.aclose()

    async def recheck_llm(self) -> None:
        """Called while the LLM is down: reconnect as soon as the user starts their server."""
        now = asyncio.get_running_loop().time()
        if self.loading or self.demo or self.status["llm"].ok or now - getattr(self, "_last_check", 0) < 3:
            return
        self._last_check = now
        llm = ChatLLM(self.cfg.llm)
        try:
            await llm.connect()
        except Exception:
            await llm.aclose()
            return
        old, self.llm = self.llm, llm
        self.status["llm"] = Status(True, llm.label)
        if old is not None:
            await old.aclose()

    def info(self) -> dict:
        p = self.cfg.persona
        return {
            "name": p.name, "user_name": p.user_name, "avatar": p.avatar, "greet": p.greet,
            "demo": self.demo, "loading": self.loading,
            "tts": getattr(self.tts, "name", "browser"),
            "status": {k: asdict(v) for k, v in self.status.items()},
        }


def _load_stt(cfg: Config):
    try:
        from .stt import WhisperSTT
        stt = WhisperSTT(cfg.stt)
        stt.warmup()
        return stt, Status(True, f"Whisper {stt.model_name} · {stt.device}")
    except Exception as exc:  # missing package, model download failed, bad device...
        log.warning("speech-to-text unavailable: %s", exc)
        return None, Status(False, "not loaded", f"Speech recognition couldn't start ({exc}). You can still type.")
