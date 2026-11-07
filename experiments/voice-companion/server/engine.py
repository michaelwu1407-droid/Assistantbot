"""Engine: owns the swappable STT / LLM / TTS backends and reports their health."""
from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict, dataclass

from .config import Config, load_config
from .llm import ChatLLM
from .assets import ensure_kokoro, ensure_web_assets, kokoro_missing
from .tts import BrowserTTS, make_tts

log = logging.getLogger("voice-companion")


@dataclass
class Status:
    ok: bool = False
    label: str = "loading…"
    error: str = ""
    busy: bool = False  # working on it (e.g. downloading); the UI shows a pulsing dot


class Engine:
    def __init__(self, demo: bool = False):
        self.demo = demo
        self.cfg: Config = load_config()
        self.stt = self.llm = self.tts = None
        self.status = {"stt": Status(), "llm": Status(), "tts": Status()}
        self.loading = True
        self.lock = asyncio.Lock()
        self.download: asyncio.Task | None = None

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
        if cfg.stt.model == "off":
            self.stt, self.status["stt"] = None, Status(True, "off (type to chat)")
        elif self.stt is None or cfg.stt != self.cfg.stt:
            self.status["stt"] = Status(False, "loading Whisper…")
            self.stt, self.status["stt"] = await asyncio.to_thread(_load_stt, cfg)
        if self.stt is not None:
            self.stt.set_names(p.name, p.user_name, *p.nicknames)

        await self._load_tts(cfg)

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

    async def _load_tts(self, cfg: Config) -> None:
        self.status["tts"] = Status(False, "loading voice…")
        if self.download is None or self.download.done():
            asyncio.get_running_loop().run_in_executor(None, ensure_web_assets)  # page works offline next time
        if cfg.tts.backend in ("auto", "kokoro") and kokoro_missing(cfg.tts) and _has_kokoro_package():
            # first run: talk with the browser's voice while hers downloads, then switch over
            self.tts = BrowserTTS()
            self.status["tts"] = Status(True, "browser voice for now", busy=True)
            if self.download is None or self.download.done():
                self.download = asyncio.create_task(self._download_voice(cfg))
            return
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

    async def _download_voice(self, cfg: Config) -> None:
        loop = asyncio.get_running_loop()

        def progress(msg: str) -> None:
            loop.call_soon_threadsafe(lambda: self.status.__setitem__(
                "tts", Status(True, f"browser voice for now · {msg}", busy=True)))
        try:
            await asyncio.to_thread(ensure_kokoro, cfg.tts, progress)
            tts = await asyncio.to_thread(make_tts, cfg.tts)
            await asyncio.to_thread(tts.warmup)
        except Exception as exc:
            log.warning("%s", exc)
            self.status["tts"] = Status(True, "browser voice", f"Using the browser's voice: {exc}")
            return
        self.tts = tts
        self.status["tts"] = Status(True, f"Kokoro · {cfg.tts.voice}")

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


def _has_kokoro_package() -> bool:
    try:
        import kokoro_onnx  # noqa: F401
        return True
    except ImportError:
        return False
