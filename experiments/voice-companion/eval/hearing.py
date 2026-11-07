"""Hearing: word error rate, names, and noise rejection through the app's own STT code."""
from __future__ import annotations

import re
import time

from . import corpus

NAMES = {"hello": ["Aria"], "weekend": ["Aria"], "kobe": ["Kobe"], "dog": ["Max"]}


def _tokens(text: str) -> list[str]:
    text = re.sub(r"[^\w\s㐀-鿿']", " ", text.lower())
    if re.search(r"[㐀-鿿]", text):
        return [c for c in text if not c.isspace()]  # Chinese: score per character
    return text.split()


def edit_distance(a: list[str], b: list[str]) -> int:
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def run(stt) -> dict:
    clips = corpus.load()
    errors = words = 0
    rows, names_ok, names_total, times = [], 0, 0, []
    for uid, (ref, audio) in clips.items():
        stt.reset_language()  # each clip is judged cold, like a first sentence
        t = time.perf_counter()
        hyp = stt.transcribe(audio)
        times.append(time.perf_counter() - t)
        r, h = _tokens(ref), _tokens(hyp)
        e = edit_distance(r, h)
        errors, words = errors + e, words + len(r)
        for name in NAMES.get(uid, []):
            names_total += 1
            names_ok += name.lower() in hyp.lower()
        rows.append({"id": uid, "ref": ref, "hyp": hyp, "errors": e, "words": len(r)})
    noise = {k: stt.transcribe(v) for k, v in corpus.noise_clips().items()}
    noise_ok = sum(1 for v in noise.values() if not v)
    wer = errors / max(words, 1)
    return {
        "wer": wer, "names": f"{names_ok}/{names_total}", "names_ok": names_ok == names_total,
        "noise": f"{noise_ok}/{len(noise)}", "noise_ok": noise_ok == len(noise), "noise_heard": noise,
        "stt_seconds_p50": sorted(times)[len(times) // 2], "rows": rows,
    }


def score(r: dict) -> int:
    if r["names_ok"] and r["noise_ok"]:
        for s, limit in ((5, .05), (4, .08), (3, .12), (2, .20), (1, .30)):
            if r["wer"] <= limit:
                return s
        return 0
    return min(3, score({**r, "names_ok": True, "noise_ok": True}))  # cap if names/noise fail
