# STT Fix Postmortem — March 2026

## Symptom
Voice agent could not hear the caller. Agent's speech kept getting "cut up" every 2-3 seconds. No user transcripts were produced despite Deepgram API key being valid.

## Root Cause
Default `turnDetection` mode on `AgentSession` was **VAD** (Voice Activity Detection).

VAD triggers on **any audio** — including SIP echo/noise from the agent's own TTS output bouncing back through the phone line. This caused a cascade:

1. Agent speaks → TTS audio echoes back through SIP → VAD detects "audio activity"
2. VAD interrupts the agent's current speech (cutting it off at 1-2s)
3. A new LLM turn is created with **no transcript** (VAD doesn't produce transcripts)
4. LLM generates a response to empty input → Cartesia TTS gets empty text → error
5. Cycle repeats every 2-3 seconds
6. Deepgram STT **was working** but its transcripts were drowned out by rapid VAD-triggered turn cycling

## The Fix
```typescript
const session = new voice.AgentSession({
  turnDetection: 'stt',          // Only committed Deepgram transcripts trigger turns
  voiceOptions: {
    minInterruptionDuration: 0.8, // Ignore audio bursts < 800ms
    minInterruptionWords: 2,      // Need 2+ transcribed words to interrupt
  },
});
```

### Why this works
- `turnDetection: 'stt'` — only real transcribed words (from Deepgram) can start a new user turn. Echo/noise doesn't produce transcripts, so it's ignored.
- `minInterruptionDuration: 0.8` — short audio bursts (< 800ms) can't interrupt the agent.
- `minInterruptionWords: 2` — a single word/sound can't interrupt; need 2+ words.

## Key Lesson
**For SIP/telephony calls, always use `turnDetection: 'stt'`** — not VAD. Phone lines have echo and noise that VAD will misinterpret as user speech. STT-based turn detection is more robust because it requires actual transcribable words.

## Environment
- LiveKit Agents Node SDK v1.0.48
- Deepgram Nova-3 STT
- Cartesia Sonic-3 TTS
- SIP via Twilio → LiveKit
