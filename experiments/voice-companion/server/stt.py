"""Speech-to-text with faster-whisper (local Whisper)."""
from __future__ import annotations

import re
import threading

import numpy as np

from .config import STTConfig, resolve

# Whisper "hears" these in silence, breathing or room noise. Dropping them stops
# the companion from answering things nobody said.
ALWAYS_PHANTOM = {
    "thanks for watching", "thank you for watching", "please subscribe",
    "谢谢观看", "请不吝点赞 订阅 转发 打赏支持明镜与点点栏目", "ご視聴ありがとうございました",
}
# Real words people do say: only dropped when the audio itself looks like noise.
DOUBTFUL_PHANTOM = {"thank you", "you", "so", "uh", "um", "谢谢", "嗯"}
_PUNCT = re.compile(r"[\s.,!?。，！？、…'\"-]+")


def _norm(text: str) -> str:
    return _PUNCT.sub(" ", text.lower()).strip()


_ALWAYS = {_norm(p) for p in ALWAYS_PHANTOM}
_DOUBTFUL = {_norm(p) for p in DOUBTFUL_PHANTOM}


def is_phantom(text: str, noisy: bool) -> bool:
    key = _norm(text)
    if not key or "amara" in key or key in _ALWAYS:
        return True
    return noisy and key in _DOUBTFUL


class WhisperSTT:
    def __init__(self, cfg: STTConfig):
        from faster_whisper import WhisperModel  # heavy import, keep lazy

        device = cfg.device
        if device == "auto":
            device = "cuda" if _cuda_available() else "cpu"
        compute = cfg.compute_type
        if compute == "auto":
            compute = "float16" if device == "cuda" else "int8"
        model = cfg.model
        if model == "auto":  # small is accurate but ~3x slower than base without a GPU
            model = "small" if device == "cuda" else "base"
        model = str(resolve(model)) if resolve(model).is_dir() else model
        self.model_name = model.replace("\\", "/").rsplit("/", 1)[-1]
        self.model = WhisperModel(model, device=device, compute_type=compute)
        self.device = device
        self.mode = cfg.language          # "", "every", or a language code
        self.language = cfg.language if cfg.language not in ("", "every") else None
        self.names: list[str] = []
        self.lock = threading.Lock()      # one transcription at a time per model

    def set_names(self, *names: str) -> None:
        """Bias recognition toward the persona's and user's names."""
        self.names = [n for n in names if n]

    @property
    def hint(self) -> str:
        if self.language == "zh":  # also steers Whisper to simplified characters
            return f"以下是{'和'.join(self.names)}的普通话对话。"
        return f"A chat between {' and '.join(self.names)}." if self.names else ""

    def reset_language(self) -> None:
        if self.mode == "":
            self.language = None

    def warmup(self) -> None:
        self.transcribe(np.zeros(16000, dtype=np.float32))

    def transcribe(self, pcm16k: np.ndarray) -> str:
        """pcm16k: mono float32 samples in [-1, 1] at 16 kHz. Returns "" for non-speech."""
        with self.lock:
            segments, info = self.model.transcribe(
                pcm16k,
                language=self.language,
                beam_size=1,
                vad_filter=False,  # the browser already ran Silero VAD
                condition_on_previous_text=False,
                initial_prompt=self.hint or None,
            )
            segments = [s for s in segments if s.no_speech_prob < 0.6 or s.avg_logprob > -0.8]
            text = "".join(s.text for s in segments).strip()
            rms = float(np.sqrt(np.mean(pcm16k ** 2))) if len(pcm16k) else 0.0
            noisy = rms < 0.01 or any(s.no_speech_prob > 0.3 for s in segments)
            # first confident detection sticks: skips a whole extra encoder pass per turn
            if self.mode == "" and self.language is None and text and info.language_probability > 0.7:
                self.language = info.language
        if is_phantom(text, noisy):
            return ""
        return text


def _cuda_available() -> bool:
    try:
        import ctranslate2

        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False
