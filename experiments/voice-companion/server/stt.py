"""Speech-to-text with faster-whisper (local Whisper)."""
from __future__ import annotations

import numpy as np

from .config import STTConfig


class WhisperSTT:
    def __init__(self, cfg: STTConfig):
        from faster_whisper import WhisperModel  # heavy import, keep lazy

        device = cfg.device
        if device == "auto":
            device = "cuda" if _cuda_available() else "cpu"
        compute = cfg.compute_type
        if compute == "auto":
            compute = "float16" if device == "cuda" else "int8"
        self.model = WhisperModel(cfg.model, device=device, compute_type=compute)
        self.language = cfg.language or None

    def transcribe(self, pcm16k: np.ndarray) -> str:
        """pcm16k: mono float32 samples in [-1, 1] at 16 kHz."""
        segments, _info = self.model.transcribe(
            pcm16k,
            language=self.language,
            beam_size=1,
            vad_filter=False,  # the browser already ran Silero VAD
            condition_on_previous_text=False,
        )
        return "".join(s.text for s in segments).strip()


def _cuda_available() -> bool:
    try:
        import ctranslate2

        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False
