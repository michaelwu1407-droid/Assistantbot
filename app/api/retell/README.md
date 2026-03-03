# ARCHIVED — Retell AI Voice Agent Integration

> ⚠️ **DEPRECATED (2026-03)**: Retell AI has been fully replaced by **LiveKit Agents**.
> These files are kept for historical reference ONLY. Do NOT re-enable or modify.
> For the active voice stack, see `/livekit-agent/` and `lib/comms.ts`.

## Files in this directory

- `webhook/route.ts` — Returns 410 Gone (was: post-call event handler)
- `tools/calendar/route.ts` — Returns 410 Gone (was: calendar availability tool)

## Related archived files

- `scripts/create-retell-agent.ts` — Legacy script to create the Retell agent (DO NOT RUN)
- `lib/retell-voice-agent.md.archived` — Legacy Retell voice agent documentation

## Active Voice Architecture

The voice platform is **LiveKit Agents** using:
- **STT:** Deepgram
- **LLM:** DeepInfra (Llama-3.3-70B-Instruct)
- **TTS:** Cartesia

See `lib/comms.ts` for full architecture documentation.
