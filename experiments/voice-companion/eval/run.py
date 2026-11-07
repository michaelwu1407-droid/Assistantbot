"""Run the whole scorecard.  python -m eval.run [--only R,C,H,T,B,U] [--label text]

Needs the app running on :7860 with its LLM (python -m server). Writes eval/results/.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import platform
import subprocess
import time
from pathlib import Path

import numpy as np

from server.config import load_config
from . import character, corpus, hearing, latency
from .report import write_report

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CACHE = HERE / "cache"


def hardware() -> str:
    gpu = "no GPU"
    try:
        import ctranslate2
        gpu = f"{ctranslate2.get_cuda_device_count()} CUDA GPU(s)" if ctranslate2.get_cuda_device_count() else gpu
    except Exception:
        pass
    return f"{platform.machine()}, {os.cpu_count()} CPU threads, {gpu}"


def mic_track(name: str, clip: np.ndarray, onset: float, gain: float = 0.9) -> Path:
    """48 kHz WAV for Chromium's fake mic: silence, the clip at `onset` seconds, more silence."""
    import soundfile as sf
    up = np.interp(np.arange(0, len(clip), 1 / 3), np.arange(len(clip)), clip).astype(np.float32)
    track = np.concatenate([np.zeros(int(48000 * onset), np.float32), up * gain, np.zeros(48000 * 12, np.float32)])
    path = CACHE / f"track_{name}.wav"
    sf.write(path, track, 48000, subtype="PCM_16")
    return path


def node(script: str, *args: str) -> dict:
    res = subprocess.run(["node", str(HERE / script), *args], capture_output=True, text=True, timeout=600)
    try:
        return json.loads(res.stdout.strip().splitlines()[-1])
    except Exception:
        return {"fatal": (res.stdout + res.stderr)[-800:]}


async def turn_taking(onset: float = 14.0) -> dict:
    clips = corpus.load()
    from server.config import TTSConfig
    from server.tts import KokoroTTS
    from .corpus import _wav_to_16k
    her = _wav_to_16k(KokoroTTS(TTSConfig())._synth("Oh really? You think you're so clever, don't you."))
    barge = mic_track("barge", clips["stop"][1], 0.0, gain=1.0)
    echo = mic_track("echo", her, 0.0, gain=1.0)  # the page plays it at 0.3: residual echo
    trials = [node("browser_turns.js", "http://127.0.0.1:7860/", str(barge), str(echo)) for _ in range(3)]
    stops = sorted(t["barge"]["stop_ms"] for t in trials if t.get("barge", {}).get("stop_ms") is not None)
    ducks = sorted(t["barge"]["duck_ms"] for t in trials if t.get("barge", {}).get("duck_ms") is not None)
    measured = [t for t in trials if t.get("barge", {}).get("speakingAtOnset")]
    out = {
        "trials": trials,
        "barge": {"stop_ms": stops[len(stops) // 2] if stops else None, "duck_ms": ducks[len(ducks) // 2] if ducks else None},
        "barge_ok": bool(measured) and all(t["barge"]["stop_ms"] is not None for t in measured),
        "echo_ok": all(t.get("echo", {}).get("stop_ms") is None and "fatal" not in t for t in trials),
        "gap_ok": all(t.get("gap_ok") for t in trials),
        "errors": [e for t in trials for e in t.get("errors", [])],
    }
    out["split_ok"] = await latency.split_check()
    return out


def reliability_and_look() -> dict:
    cfg = CACHE / "instance_b.toml"
    cfg.write_text('[server]\nport = 7861\n[stt]\nmodel = "off"\n[tts]\nbackend = "browser"\n'
                   '[llm]\nbase_url = "http://127.0.0.1:18081/v1"\n[persona]\ngreet = false\n')
    out = node("browser_app.js", str(ROOT), str(cfg))
    tests = subprocess.run(["python3", "-m", "pytest", "-q", "-p", "no:warnings"], cwd=ROOT, capture_output=True, text=True)
    out["tests"] = tests.stdout.strip().splitlines()[-1] if tests.stdout else "no output"
    out["tests_ok"] = tests.returncode == 0
    return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="R,C,H,T,B,U")
    ap.add_argument("--label", default="")
    args = ap.parse_args()
    only = set(args.only.split(","))
    CACHE.mkdir(exist_ok=True)
    cfg = load_config()
    res: dict = {"hardware": hardware(), "label": args.label, "time": time.strftime("%Y-%m-%d %H:%M")}
    if "H" in only:
        from server.stt import WhisperSTT
        stt = WhisperSTT(cfg.stt)
        stt.set_names(cfg.persona.name, cfg.persona.user_name, *cfg.persona.nicknames)
        res["H"] = hearing.run(stt)
        res["stt_model"] = stt.model_name
        del stt
    if "C" in only:
        from server.llm import ChatLLM
        llm = ChatLLM(cfg.llm)
        await llm.connect()
        res["llm_model"] = llm.label
        res["C"] = await character.run(llm, cfg.persona)
        await llm.aclose()
    if "R" in only:
        res["R"] = await latency.run()
    if "T" in only:
        res["T"] = await turn_taking()
    if "B" in only or "U" in only:
        res["BU"] = reliability_and_look()
    write_report(res)


if __name__ == "__main__":
    asyncio.run(main())
