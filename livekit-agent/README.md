# Earlymark LiveKit Voice Agent

Self-hosted voice AI receptionist for the Earlymark CRM, powered by [LiveKit Agents](https://docs.livekit.io/agents/).

This is a standalone TypeScript service that runs alongside the main Next.js CRM app.

## Stack

| Component | Provider | Model |
|-----------|----------|-------|
| STT | Deepgram | nova-3 |
| LLM | Groq | llama-3.3-70b-versatile |
| TTS | Cartesia | sonic-3 (or sonic-3-2026-01-12) |
| Voice ID | Cartesia | a4a16c5e-5902-4732-b9b6-2a48efd2e11b (Aussie Female) |
| VAD | Silero | default |

## Prerequisites

- Node.js 20+
- A running [LiveKit server](https://docs.livekit.io/home/self-hosting/local/) (self-hosted or LiveKit Cloud)
- SIP trunk configured to route Twilio calls to LiveKit (see [LiveKit SIP docs](https://docs.livekit.io/sip/))
- API keys for Deepgram, Groq, and Cartesia

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Run in development mode
npm run dev

# 4. Run in production
npm run start
```

## Architecture

```
Twilio -> SIP Trunk -> LiveKit Server -> This Agent
                                         |-- Deepgram (STT)
                                         |-- Groq (LLM + tool calls)
                                         `-- Cartesia (TTS)
```

Inbound calls flow through Twilio's SIP trunk to a LiveKit room. This agent joins the room, transcribes speech, processes it through the LLM (with CRM tool access), and responds with synthesized speech.

## Canonical Voice Config

- TTS: Cartesia Sonic 3 (`sonic-3` or `sonic-3-2026-01-12`)
- STT: Deepgram Nova-3
- LLM: Groq Llama 3.3 70B (`llama-3.3-70b-versatile`)
- Voice ID: `a4a16c5e-5902-4732-b9b6-2a48efd2e11b`

## Retell Status

Retell AI is archived and not the active voice runtime.
