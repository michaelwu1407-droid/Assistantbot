"""Responsiveness: user goes quiet -> her first sound, through the running server's websocket.

end-to-end = VAD wait (browser's silence window, read from web/app.js) + server time to first audio.
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import re
import statistics
import time
import wave
from pathlib import Path

import numpy as np
import websockets

from . import corpus

TURNS = ["hello", "weekend", "sorry", "movie", "dog", "kobe"]


def vad_wait_ms() -> int:
    js = (Path(__file__).resolve().parent.parent / "web" / "app.js").read_text()
    return int(re.search(r"const SILENCE_MS = (\d+)", js).group(1)) + 32  # + one VAD frame


def spec_after_ms() -> int:
    js = (Path(__file__).resolve().parent.parent / "web" / "app.js").read_text()
    return int(re.search(r"const SPEC_FRAMES = (\d+)", js).group(1)) * 32


def _dur(b64: str | None) -> float:
    if not b64:
        return 0.0
    with wave.open(io.BytesIO(base64.b64decode(b64))) as w:
        return w.getnframes() / w.getframerate()


async def _turn(ws, audio: np.ndarray) -> dict:
    """Plays the browser's part exactly: provisional audio after a short pause, commit when the
    VAD's silence window closes. Times are from the moment the user went quiet."""
    early, wait = spec_after_ms() / 1000, vad_wait_ms() / 1000
    t0 = time.perf_counter() - early  # the user went quiet `early` seconds before we send
    await ws.send(json.dumps({"type": "speculate"}))
    await ws.send(audio.astype(np.float32).tobytes())

    async def commit_later():
        await asyncio.sleep(max(0.0, wait - (time.perf_counter() - t0)))
        await ws.send(json.dumps({"type": "commit"}))
    committer = asyncio.create_task(commit_later())
    out = {"stt_ms": None, "first_ms": None, "llm_ms": None, "tts_ms": None, "stall_s": 0.0, "speech_s": 0.0}
    play_end = None
    while True:
        m = json.loads(await ws.recv())
        now = time.perf_counter() - t0
        if m["type"] == "user":
            out["stt_ms"] = m["stt_ms"]
        elif m["type"] == "sentence":
            if out["first_ms"] is None:
                out.update(first_ms=int(now * 1000), llm_ms=m.get("llm_ms"), tts_ms=m.get("tts_ms"))
                play_end = now
            # silence the listener hears between sentences (audio not ready when the last one ended)
            out["stall_s"] += max(0.0, now - play_end)
            play_end = max(now, play_end) + _dur(m["audio"]) + 0.12
            out["speech_s"] = play_end - now if out["speech_s"] == 0 else out["speech_s"] + _dur(m["audio"]) + 0.12
        elif m["type"] == "state" and m.get("ignored") or m["type"] in ("done", "error"):
            await committer
            return out


async def run(url: str = "ws://127.0.0.1:7860/ws") -> dict:
    clips = corpus.load()
    rows = []
    async with websockets.connect(url, max_size=None) as ws:
        await ws.recv()
        await _turn(ws, clips["hello"][1])  # warm-up turn, not scored (detects language)
        for uid in TURNS:
            r = await _turn(ws, clips[uid][1])
            rows.append({"id": uid, **r})
            # real pacing: the user hears her out, then takes half a second before talking
            await asyncio.sleep(r["speech_s"] + 0.5)
        await ws.send(json.dumps({"type": "reset"}))
    firsts = [r["first_ms"] for r in rows if r["first_ms"] is not None]
    med = lambda k: statistics.median([r[k] for r in rows if r[k] is not None])  # noqa: E731
    return {
        "vad_wait_ms": vad_wait_ms(), "spec_after_ms": spec_after_ms(),
        "end_to_end_ms_p50": statistics.median(firsts),
        "stt_ms_p50": med("stt_ms"), "llm_first_clause_ms_p50": med("llm_ms"), "tts_first_clause_ms_p50": med("tts_ms"),
        "stall_s_p50": statistics.median([r["stall_s"] for r in rows]),
        "rows": rows,
    }


def score(r: dict) -> int:
    s = r["end_to_end_ms_p50"] / 1000
    for points, limit in ((5, 1.0), (4, 1.5), (3, 2.5), (2, 4.0), (1, 6.0)):
        if s <= limit:
            return points
    return 0


async def split_check(url: str = "ws://127.0.0.1:7860/ws") -> bool:
    """User pauses mid-thought: two utterances back to back must give ONE reply to both."""
    clips = corpus.load()
    async with websockets.connect(url, max_size=None) as ws:
        await ws.recv()
        await ws.send(clips["sorry"][1].tobytes())
        await ws.send(clips["movie"][1].tobytes())
        users, sentence_turns = [], set()
        while True:
            m = json.loads(await asyncio.wait_for(ws.recv(), 120))
            if m["type"] == "user":
                users.append(m["text"])
            elif m["type"] == "sentence":
                sentence_turns.add(m["turn"])
            elif m["type"] == "done" and len(users) == 2 and sentence_turns:
                break
        await ws.send(json.dumps({"type": "reset"}))
    return len(users) == 2 and len(sentence_turns) == 1
