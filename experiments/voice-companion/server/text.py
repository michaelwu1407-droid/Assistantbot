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


def clean(text: str) -> str:
    text = _EMOJI.sub("", _MARKDOWN.sub("", text))
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
