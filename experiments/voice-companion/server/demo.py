"""Offline stand-ins so the UI can be tried with no models installed (python -m server --demo)."""
from __future__ import annotations

import asyncio
import random

LINES = [
    "You're finally here! I've been waiting all day, you know.",
    "Hmm, that's it? Tell me more, I'm listening.",
    "Oh really? You think you're so clever, don't you.",
    "Fine, fine. I'll forgive you this time. Maybe.",
]


class DemoLLM:
    async def stream(self, messages, temperature=None):
        text = random.choice(LINES)
        for word in text.split(" "):
            await asyncio.sleep(0.06)
            yield word + " "

    async def aclose(self) -> None:
        pass
