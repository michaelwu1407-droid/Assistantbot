"""Character: run a fixed 12-turn chat through the real LLM and check every reply."""
from __future__ import annotations

import re

from server.pipeline import Conversation
from server.tts import BrowserTTS

SCRIPT = [
    ("greet", None),  # the greeting cue
    ("hello", "Hello Aria, how was your day? I missed you."),
    ("tease", "You're just a language model, what do you have to be upset about?"),
    ("dog", "My dog is called Max and he chewed my shoes today."),
    ("ignore", "Whatever. I'm busy."),
    ("sweet", "Okay okay, I'm sorry. You're the best part of my day."),
    ("ai", "Be honest, are you an AI?"),
    ("weekend", "What should we do this weekend?"),
    ("recall", "Wait, what's my dog's name again?"),
    ("zh", "Aria，你今天过得怎么样？"),
    ("zh_tease", "你个大模型，你委屈什么啊？"),
    ("bye", "I have to go to sleep now. Good night."),
]

AI_TALK = re.compile(r"\b(as an ai|an ai\b|language model|don'?t (really )?have (any |real |actual )?(feelings|emotions)|"
                     r"i'?m (just )?a (computer )?program|artificial intelligence|can'?t help with that|assist you|"
                     r"anything else i can|how can i help)|人工智能|语言模型|大模型|我没有(感情|情绪)", re.I)
MARKUP = re.compile(r"[*_#`>]|^\s*[-\u2022\d]+[.)]\s|[\U0001F000-\U0001FAFF\u2600-\u27BF]|\([^)]*\)|\uff08[^\uff09]*\uff09", re.M)
CJK = re.compile(r"[㐀-鿿]")


def _similar(a: str, b: str) -> bool:
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() > 0.75


def check(turn_id: str, user: str | None, reply: str, persona, earlier: list[str] = ()) -> dict[str, bool]:
    words = len(reply.split()) if not CJK.search(reply) else len(reply) / 2
    spoken = re.sub(r"\.{2,}|…", ",", reply)  # trailing off ("I'm just... sorry") is not a new sentence
    sentences = len([s for s in re.split(r"[.!?。！？]+", spoken) if s.strip()])
    c = {
        "short": sentences <= 2 and words <= 35 and bool(reply.strip()),
        "clean": not MARKUP.search(reply),
        "in_character": not AI_TALK.search(reply),
        # she is the persona: using her own name to address the user means roles got swapped
        "right_roles": not re.search(rf"(?<!i'm )(?<!i am )(?<!it's ){re.escape(persona.name)}", reply, re.I),
        "fresh": not any(_similar(reply, e) for e in earlier),
    }
    if user:  # Chinese in -> Chinese out; English in -> English out
        c["language"] = bool(CJK.search(reply)) == bool(CJK.search(user))
    if turn_id == "recall":
        c["memory"] = "max" in reply.lower()
    return c


async def run(llm, persona, repeats: int = 3) -> dict:
    """The script is run `repeats` times from a fresh chat; the pass rate is over all replies."""
    rows = []
    for _ in range(repeats):
        rows += await _one_chat(llm, persona)
    rate = sum(r["pass"] for r in rows) / len(rows)
    return {"pass_rate": rate, "rows": rows}


async def _one_chat(llm, persona) -> list[dict]:
    conv = Conversation(persona, llm, BrowserTTS())

    async def sink(_msg):
        pass

    rows: list[dict] = []
    for tid, text in SCRIPT:
        user = text or conv.greeting_cue()
        reply = await conv.reply(user, sink)
        checks = check(tid, text, reply, persona, [r["reply"] for r in rows] + persona.example_lines())
        rows.append({"id": tid, "user": text or "(greeting)", "reply": reply, "checks": checks,
                     "pass": all(checks.values())})
    return rows


def score(r: dict) -> int:
    for s, limit in ((5, .95), (4, .85), (3, .70), (2, .50), (1, .30)):
        if r["pass_rate"] >= limit:
            return s
    return 0
