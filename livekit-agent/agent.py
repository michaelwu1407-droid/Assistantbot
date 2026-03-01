"""
Earlymark LiveKit Voice Agent
=============================
Self-hosted voice AI receptionist for Earlymark CRM.

Uses LiveKit Agents v1.0 with:
- Deepgram (STT) — nova-3
- Groq (LLM) — llama-4-maverick-17b-instruct via OpenAI-compatible API
- Cartesia (TTS) — sonic-english
- Silero (VAD)

Run in development:  python agent.py dev
Run in production:   python agent.py start
"""

import logging
from enum import Enum
from typing import Annotated

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import cartesia, deepgram, openai, silero

load_dotenv(dotenv_path=".env.local")
logger = logging.getLogger("earlymark-agent")


# ── Data: Simulated DB lookup ──────────────────────────────────────────────────


async def get_user_context(phone_number: str) -> dict:
    """
    Simulates a database lookup based on the inbound Twilio number.

    In production, replace this with an HTTP call to the Next.js API
    or a direct Supabase/Prisma query to load per-workspace settings.
    """
    logger.info("Loading user context for phone_number=%s", phone_number)
    return {
        "business_name": "Michael's Plumbing",
        "voice_id": "248be419-3632-4f38-9bed-47dc10c62d19",
    }


# ── Enums ──────────────────────────────────────────────────────────────────────


class KanbanAction(str, Enum):
    move_to_new = "move_to_new"
    move_to_quote_sent = "move_to_quote_sent"
    move_to_scheduled = "move_to_scheduled"


# ── The Agent (with tools as methods) ──────────────────────────────────────────


SYSTEM_PROMPT_TEMPLATE = """\
You are the friendly and professional AI receptionist for {business_name}.
Your goal is to answer questions, capture details from new leads, and help schedule jobs.

TOOLS:
- Use 'check_availability' when the user asks for dates.
- CRITICAL: At the end of the call, you MUST use the 'update_lead' tool to save the \
'contact_name' and the 'kanban_action'.

KANBAN LOGIC:
- If they just asked a question -> 'move_to_new'
- If you sent a quote -> 'move_to_quote_sent'
- If you booked a time -> 'move_to_scheduled'

Be conversational but concise."""


class EarlymarkReceptionist(Agent):
    def __init__(self, business_name: str) -> None:
        self._business_name = business_name
        super().__init__(
            instructions=SYSTEM_PROMPT_TEMPLATE.format(business_name=business_name),
        )

    @function_tool
    async def check_availability(self, date: str) -> str:
        """Check appointment availability for a given date."""
        logger.info("check_availability called for date=%s", date)
        # TODO: Replace with real calendar lookup via Next.js API or Supabase
        return f"We have slots at 10am and 2pm on {date}."

    @function_tool
    async def update_lead(
        self,
        contact_name: str,
        kanban_action: Annotated[
            KanbanAction,
            "The pipeline action: move_to_new, move_to_quote_sent, or move_to_scheduled",
        ],
    ) -> str:
        """Updates the lead status in the CRM at the end of the call."""
        logger.info(
            "update_lead: contact=%s action=%s", contact_name, kanban_action.value
        )
        # TODO: Replace with real CRM update via Next.js API or Supabase
        return f"Lead '{contact_name}' updated to '{kanban_action.value}'."

    async def on_enter(self) -> None:
        """Zero-latency greeting fired as soon as the agent joins the room."""
        self.session.generate_reply(
            instructions=f"Greet the caller: G'day, {self._business_name} speaking. How can I help?",
            allow_interruptions=True,
        )


# ── Prewarm: load VAD model once per worker process ───────────────────────────


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


# ── Entrypoint ─────────────────────────────────────────────────────────────────


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    # Extract SIP identity — the Twilio subaccount number that was dialed
    sip_to_user = (participant.attributes or {}).get("sip.toUser", "")
    inbound_number = sip_to_user or participant.identity
    logger.info(
        "Inbound number: %s, participant: %s",
        inbound_number,
        participant.identity,
    )

    # Load business-specific context (voice, prompt, etc.)
    user_ctx = await get_user_context(inbound_number)
    business_name = user_ctx["business_name"]
    voice_id = user_ctx["voice_id"]

    # ── The "God Stack" configuration ──────────────────────────────────────
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", smart_format=True, endpointing=200),
        llm=openai.LLM.with_groq(
            model="llama-4-maverick-17b-instruct",
            temperature=0.6,
        ),
        tts=cartesia.TTS(
            model="sonic-english",
            voice=voice_id,
            speed=1.05,
            emotion=["positivity:high", "curiosity:medium"],
        ),
        vad=ctx.proc.userdata["vad"],
        allow_interruptions=True,
    )

    await session.start(
        room=ctx.room,
        agent=EarlymarkReceptionist(business_name=business_name),
    )


# ── CLI runner ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
