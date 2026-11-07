"""Turn raw measurements into 0-5 scores and write eval/results/latest.{md,json} + history.md."""
from __future__ import annotations

import json
from pathlib import Path

from . import character, hearing, latency

OUT = Path(__file__).resolve().parent / "results"
WEIGHTS = {"R": 25, "C": 25, "H": 15, "T": 15, "B": 10, "U": 10}
NAMES = {"R": "Responsiveness", "C": "Character", "H": "Hearing", "T": "Turn-taking", "B": "Reliability", "U": "Look & setup"}
SETUP_COMMANDS = 4  # README: make venv, pip install, start an LLM, python -m server (downloads are automatic)


def score_t(t: dict) -> tuple[int, str]:
    checks = {"talk over her": t.get("barge_ok"), "ignores her echo": t.get("echo_ok"),
              "talk in her pauses": t.get("gap_ok"), "split sentence merged": t.get("split_ok")}
    passed = sum(1 for v in checks.values() if v)
    stop = (t.get("barge") or {}).get("stop_ms")
    s = passed + (1 if passed == 4 and stop is not None and stop <= 400 else 0)
    detail = ", ".join(f"{k}: {'✓' if v else ('not measured' if v is None else '✗')}" for k, v in checks.items())
    return s, f"{detail}; volume dips {(t.get('barge') or {}).get('duck_ms')} ms, stops {stop} ms after you start"


def score_b(b: dict) -> tuple[int, str]:
    checks = {"tests": b.get("tests_ok"), "LLM-down banner + auto-recovery": b.get("llm_down_banner") and b.get("llm_recovers"),
              "reconnects after restart": b.get("reconnects") and b.get("works_after_restart"), "no console errors": not b.get("errors")}
    passed = sum(1 for v in checks.values() if v)
    return {4: 5, 3: 3, 2: 2, 1: 1}.get(passed, 0), ", ".join(f"{k}: {'✓' if v else '✗'}" for k, v in checks.items())


def score_u(b: dict) -> tuple[int, str]:
    look = b.get("look", {})
    ok = all(v.get("fits") and not v.get("hscroll") and v.get("feedback_ms", 999) <= 100 for v in look.values()) and look
    s = (5 if SETUP_COMMANDS <= 4 else 4) if ok else 2
    parts = [f"{k}: fits={v.get('fits')} feedback={v.get('feedback_ms')}ms" for k, v in look.items()]
    return s, "; ".join(parts) + f"; {SETUP_COMMANDS} setup commands"


def write_report(res: dict) -> None:
    OUT.mkdir(exist_ok=True)
    rows = {}
    if "R" in res:
        r = res["R"]
        rows["R"] = (latency.score(r), f"{r['end_to_end_ms_p50']/1000:.2f}s p50 from going quiet to her voice (work starts {r.get('spec_after_ms', r['vad_wait_ms'])}ms into the pause): STT {r['stt_ms_p50']}ms"
                     f" + LLM first clause {r['llm_first_clause_ms_p50']}ms + voice {r['tts_first_clause_ms_p50']}ms (+ overhead);"
                     f" silent stalls between sentences {r['stall_s_p50']:.1f}s per reply")
    if "C" in res:
        c = res["C"]
        fails = [f"{x['id']}: {[k for k, v in x['checks'].items() if not v]}" for x in c["rows"] if not x["pass"]]
        rows["C"] = (character.score(c), f"{c['pass_rate']:.0%} of replies pass; fails → {'; '.join(fails) or 'none'}")
    if "H" in res:
        h = res["H"]
        rows["H"] = (hearing.score(h), f"WER {h['wer']:.1%}, names {h['names']}, noise ignored {h['noise']}, STT {h['stt_seconds_p50']:.2f}s p50")
    if "T" in res:
        rows["T"] = score_t(res["T"])
    if "BU" in res:
        rows["B"] = score_b(res["BU"])
        rows["U"] = score_u(res["BU"])
    total = sum(WEIGHTS[k] * s for k, (s, _) in rows.items()) / max(sum(WEIGHTS[k] for k in rows), 1)
    bar = all(s >= 4 for s, _ in rows.values()) and rows.get("R", (5,))[0] == 5 and rows.get("C", (5,))[0] == 5
    lines = [f"# Scorecard {res['time']} {res.get('label','')}", "",
             f"Hardware: {res['hardware']} · STT: {res.get('stt_model','-')} · LLM: {res.get('llm_model','-')}", "",
             f"**Weighted score: {total:.2f} / 5** · best-in-class bar met: **{'yes' if bar else 'no'}**", "",
             "| Dimension | Score | Evidence |", "|---|---|---|"]
    lines += [f"| {NAMES[k]} | {s}/5 | {d} |" for k, (s, d) in rows.items()]
    if "C" in res:
        lines += ["", "## Replies", "", "| Turn | User | Her reply | Pass |", "|---|---|---|---|"]
        lines += [f"| {x['id']} | {x['user']} | {x['reply']} | {'✓' if x['pass'] else '✗'} |" for x in res["C"]["rows"]]
    if "H" in res:
        lines += ["", "## Hearing", "", "| Clip | Reference | Heard |", "|---|---|---|"]
        lines += [f"| {x['id']} | {x['ref']} | {x['hyp']} |" for x in res["H"]["rows"]]
    (OUT / "latest.md").write_text("\n".join(lines) + "\n")
    (OUT / "latest.json").write_text(json.dumps(res, indent=1, ensure_ascii=False, default=str))
    with open(OUT / "history.md", "a") as f:
        f.write(f"- {res['time']} {res.get('label','')}: {total:.2f}/5 · " + " · ".join(f"{k}={s}" for k, (s, _) in rows.items()) + "\n")
    print("\n".join(lines[:6 + len(rows) + 2]))
