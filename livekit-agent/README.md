# Earlymark LiveKit Voice Agent

Self-hosted voice AI receptionist for the Earlymark CRM, powered by [LiveKit Agents](https://docs.livekit.io/agents/).

This is a standalone Python microservice that runs alongside the main Next.js CRM app.

## Stack

| Component | Provider | Model |
|-----------|----------|-------|
| STT | Deepgram | nova-3 |
| LLM | Groq | llama-4-maverick-17b-instruct |
| TTS | Cartesia | sonic-english |
| VAD | Silero | — |

## Prerequisites

- Python 3.11+
- A running [LiveKit server](https://docs.livekit.io/home/self-hosting/local/) (self-hosted or LiveKit Cloud)
- SIP trunk configured to route Twilio calls to LiveKit (see [LiveKit SIP docs](https://docs.livekit.io/sip/))
- API keys for Deepgram, Groq, and Cartesia

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Run in development mode (auto-reload)
python agent.py dev

# 4. Run in production
python agent.py start
```

## Architecture

```
Twilio → SIP Trunk → LiveKit Server → This Agent
                                          ├── Deepgram (STT)
                                          ├── Groq (LLM + tool calls)
                                          └── Cartesia (TTS)
```

Inbound calls flow through Twilio's SIP trunk to a LiveKit room. This agent joins the room, transcribes speech, processes it through the LLM (with CRM tool access), and responds with synthesized speech.

## CRM Integration (TODO)

The `check_availability` and `update_lead` tools are currently mocked. To connect them to the real CRM:

1. **Option A**: HTTP calls to the Next.js API routes
2. **Option B**: Direct Supabase/PostgreSQL queries from Python

## Reverting to Retell

The original Retell AI integration is preserved in the main app at `app/api/retell/`. See the README there for revert instructions.
