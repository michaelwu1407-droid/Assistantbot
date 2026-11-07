"""Test speech for the scorecard: synthesized with Kokoro in several voices, plus noise clips.

Cached as 16 kHz float32 .npy files in eval/cache/ so runs are repeatable.
"""
from __future__ import annotations

import io
import wave
from pathlib import Path

import numpy as np

CACHE = Path(__file__).parent / "cache"

# (id, text, kokoro voice). Two male, two female voices, US + UK accents, and Chinese.
UTTERANCES = [
    ("hello", "Hello Aria, how was your day? I missed you.", "am_michael"),
    ("tease", "You're just a language model, what do you have to be upset about?", "am_adam"),
    ("dog", "My dog is called Max and he chewed my shoes today.", "bf_emma"),
    ("weekend", "What should we do this weekend, Aria?", "af_sarah"),
    ("sorry", "Sorry I was late, work was crazy.", "bm_george"),
    ("movie", "Did you like the movie we watched last night?", "af_nicole"),
    ("stop", "Wait, hold on, stop talking for a second please.", "am_michael"),
    ("kobe", "It's Kobe, I'm back. Did you miss me?", "bm_george"),
    ("zh_day", "小雅，你今天过得怎么样？", "zm_yunxi"),
    ("zh_tease", "你个大模型，你委屈什么啊？", "zm_yunjian"),
]


def _kokoro():
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from server.config import TTSConfig
    from server.tts import KokoroTTS
    return KokoroTTS(TTSConfig(speed=1.0))


def _wav_to_16k(data: bytes) -> np.ndarray:
    with wave.open(io.BytesIO(data)) as w:
        rate = w.getframerate()
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
    return np.interp(np.arange(0, len(pcm), rate / 16000), np.arange(len(pcm)), pcm).astype(np.float32)


def noise_clips() -> dict[str, np.ndarray]:
    """Things that are not speech: room hiss, mains hum, breathing-like puffs, keyboard clicks."""
    rng = np.random.default_rng(7)
    t = np.arange(16000 * 2) / 16000
    clicks = np.zeros_like(t)
    for i in rng.integers(0, len(t) - 200, 14):
        clicks[i:i + 120] += rng.normal(0, 0.25, 120) * np.exp(-np.arange(120) / 20)
    breath = rng.normal(0, 0.03, len(t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)) ** 4
    return {
        "hiss": rng.normal(0, 0.006, len(t)).astype(np.float32),
        "hum": (0.02 * np.sin(2 * np.pi * 50 * t)).astype(np.float32),
        "breath": breath.astype(np.float32),
        "keyboard": clicks.astype(np.float32),
    }


def load() -> dict[str, tuple[str, np.ndarray]]:
    """id -> (reference text, 16 kHz audio). Builds missing clips once."""
    CACHE.mkdir(exist_ok=True)
    out, tts = {}, None
    for uid, text, voice in UTTERANCES:
        path = CACHE / f"{uid}.npy"
        if not path.exists():
            tts = tts or _kokoro()
            tts.cfg.voice = tts.cfg.voice_zh = voice
            np.save(path, _wav_to_16k(tts._synth(text)))
        out[uid] = (text, np.load(path))
    return out
