"""Streaming text helpers: strip <think> blocks and cut tokens into speakable sentences."""
from __future__ import annotations

import re

TERMINAL = set("。！？!?…\n")
SOFT = set("，,；;：:")
_MARKDOWN = re.compile(r"[*_`#>]+")
_EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️]")


class ThinkFilter:
    """Drops <think>...</think> spans from a token stream (Qwen3 / DeepSeek-R1 style)."""

    def __init__(self) -> None:
        self.buf = ""
        self.inside = False

    def feed(self, token: str) -> str:
        self.buf += token
        out = []
        while True:
            tag = "</think>" if self.inside else "<think>"
            i = self.buf.find(tag)
            if i == -1:
                # keep a tail that could be the start of a tag
                keep = _partial_tag_len(self.buf, tag)
                if not self.inside:
                    out.append(self.buf[: len(self.buf) - keep])
                self.buf = self.buf[len(self.buf) - keep:] if keep else ""
                return "".join(out)
            if not self.inside:
                out.append(self.buf[:i])
            self.buf = self.buf[i + len(tag):]
            self.inside = not self.inside

    def flush(self) -> str:
        rest, self.buf = ("" if self.inside else self.buf), ""
        return rest


def _partial_tag_len(s: str, tag: str) -> int:
    for n in range(min(len(tag) - 1, len(s)), 0, -1):
        if s.endswith(tag[:n]):
            return n
    return 0


_SPEAKER = re.compile(r"^\s*[\w\u3400-\u9fff]{1,20}\s*(?::\s+|：\s*)")


_STAGE = re.compile(r"\([^)]{0,40}\)|（[^）]{0,20}）|\*[^*]{0,40}\*")


def clean(text: str) -> str:
    text = _STAGE.sub("", text)  # "(pouts)", "*smiles*": never read stage directions aloud
    text = _SPEAKER.sub("", _EMOJI.sub("", _MARKDOWN.sub("", text)))
    return re.sub(r"\s+", " ", text).strip()


class SentenceChunker:
    """Accumulates tokens and yields chunks that are ready to be spoken.

    The first chunk may be cut at a comma so audio starts sooner.
    """

    def __init__(self, first_soft_min: int = 12, soft_min: int = 60) -> None:
        self.buf = ""
        self.emitted = 0
        self.first_soft_min = first_soft_min
        self.soft_min = soft_min

    def feed(self, text: str) -> list[str]:
        out: list[str] = []
        for ch in text:
            self.buf += ch
            if self._should_cut(ch):
                chunk = clean(self.buf)
                self.buf = ""
                if chunk and any(c.isalnum() for c in chunk):
                    out.append(chunk)
                    self.emitted += 1
        return out

    def _should_cut(self, ch: str) -> bool:
        if ch in TERMINAL:
            return True
        if ch in SOFT:
            limit = self.first_soft_min if self.emitted == 0 else self.soft_min
            return len(self.buf) >= limit
        # English sentence end: ". " is handled when the space arrives
        if ch == " " and len(self.buf) > 1 and self.buf[-2] == ".":
            return True
        return False

    def flush(self) -> list[str]:
        chunk, self.buf = clean(self.buf), ""
        return [chunk] if chunk and any(c.isalnum() for c in chunk) else []


_OOC = re.compile(r"\b(as an ai|an ai\b|language model|(just|only|being) a (computer )?(model|program|machine)|"
                  r"don'?t (really )?have (any |real |actual )?(feelings|emotions)|can'?t help with that|assist you|"
                  r"anything else i can|how can i help)|人工智能|语言模型|大模型|是(个|一个)模型|我(只是)?(一个)?模型|我没有(感情|情绪)", re.I)


def out_of_character(sentence: str) -> bool:
    """Assistant-speak a companion should never say out loud."""
    return bool(_OOC.search(sentence))


def ends_sentence(chunk: str) -> bool:
    chunk = chunk.rstrip()
    if chunk.endswith(("...", "…")):
        return False  # trailing off, not finished
    return bool(chunk) and (chunk[-1] in TERMINAL or chunk[-1] == ".")


def similar(a: str, b: str, threshold: float = 0.8) -> bool:
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() >= threshold


def split_sentences(text: str) -> list[str]:
    return [x.strip() for x in re.split(r"(?<=[.!?。！？])\s*", text) if len(x.strip()) > 3]


def fix_roles(sentence: str, name: str, user_name: str) -> str:
    """Small models sometimes call the user by the companion's own name ("I miss you, Aria.").
    Swap it for the user's name unless she is introducing herself ("I'm Aria")."""
    if not name or not user_name or name.lower() == user_name.lower():
        return sentence
    pattern = re.compile(rf"(?<!i'm )(?<!i am )(?<!it's )(?<!我是)\b{re.escape(name)}\b", re.I)
    return pattern.sub(user_name, sentence)


_LEADING_JOIN = re.compile(r"^(but|and|so|or|also|anyway)\b[\s,]*|^(但是|而且|所以|不过)[，,]?", re.I)


def tidy_opening(sentence: str) -> str:
    """When earlier sentences were dropped, don't start her reply mid-thought ("but I've been busy.")."""
    s = _LEADING_JOIN.sub("", sentence.strip())
    return s[:1].upper() + s[1:] if s else s
