# LEGACY — Retell AI Voice Agent Integration

These files are the original Retell AI voice agent integration, preserved as a backup.
The voice agent has been migrated to a self-hosted LiveKit agent (see `/livekit-agent/`).

## Files in this directory

- `webhook/route.ts` — Post-call event handler (activity logging, deal stage updates)
- `tools/calendar/route.ts` — Calendar availability tool used during live calls

## Related files outside this directory

- `scripts/create-retell-agent.ts` — Script to create the Retell agent
- `lib/retell-voice-agent.md` — Retell voice agent documentation

## How to revert to Retell

1. Re-enable the `RETELL_*` environment variables
2. Point Twilio SIP trunk back to Retell instead of LiveKit
3. Restore the Retell agent ID in workspace settings
