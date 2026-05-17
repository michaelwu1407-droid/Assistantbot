# Voice Agent Improvement Backlog

Updated: 2026-05-01

This is a review backlog, not an execution plan.
It captures worthwhile voice-agent improvements after the recent reliability recovery work.

## Current baseline

- Core voice path is healthy.
- Spoken canary is healthy.
- Worker fleet is healthy.
- The biggest recent measured latency drag is still more TTS-first-byte than LLM TTFT.
- `inbound_demo` has real latency proof; `demo` and `normal` still need more fresh live samples.

## My view on the next improvements

### Tier 1 - high value, worth serious consideration

1. Split voice latency metrics by provider
- Why: we currently merge Groq and DeepInfra timing in the live voice telemetry.
- Value: high for tuning; low implementation risk.
- My view: strong yes.

2. Trial semantic EOU / better turn detection on `inbound_demo`
- Current code still uses `turnDetection: "stt"` in `livekit-agent/agent.ts`.
- Value: potentially meaningful perceived-latency win.
- My view: yes, but test on `inbound_demo` first before wider rollout.

3. Add Deepgram keyterms for proper nouns
- We already use Nova-3.
- This is really a quality improvement, not a model upgrade.
- Value: better recognition for business names, suburbs, product names.
- My view: strong yes.

4. Collect real latency proof for `demo` and `normal`
- Value: necessary before major architecture tuning.
- My view: must do before large LLM-path changes.

5. Trim demo prompt weight where safe
- Value: modest TTFT gain and lower prompt overhead.
- My view: yes, but carefully. Do not weaken policy or grounding quality just to save tokens.

### Tier 2 - useful, but only after more measurement

1. First-turn fast path on a smaller model for `demo`
- Example: use an 8B model only for low-risk first-turn acknowledgement / intent capture.
- Value: maybe good for speed on sales/demo surfaces.
- My view: maybe, but not yet proven to be the main bottleneck.

2. More aggressive speculative/filler speech
- We already have opener bank, speculative heads, and cached fixed lines.
- Value: could further improve perceived latency on tool-heavy turns.
- My view: possible win, but this should extend the existing pattern rather than invent a new one.

3. Region audit across STT / LLM / TTS / transport
- Value: could remove avoidable RTT.
- My view: good hygiene, but verify with actual provider-region evidence first.

4. Keep-warm behavior for idle workers
- Value: may reduce cold-start behavior on TTS/STT connections.
- My view: maybe useful, but only if we see real idle cold-start penalties in telemetry.

### Tier 3 - worthwhile, but not near-term priority

1. Lower interruption thresholds on selected surfaces
- Value: more conversational feel.
- Risk: more accidental interruption / twitchiness on PSTN.
- My view: only after controlled testing.

2. Richer prosody / TTS controls
- Value: quality and personality improvements.
- My view: yes for polish later, not urgent for system performance.

3. Bigger prompt / tooling refactor
- `livekit-agent/agent.ts` is still too large.
- Value: lower regression risk, easier iteration.
- My view: important engineering work, but not the next latency lever.

### Tier 4 - interesting, but not ready yet

1. Realtime speech-to-speech model path
- Example: OpenAI Realtime API or Gemini Live on a limited surface.
- Value: potentially large latency gains.
- Risk: weaker tool control / policy control / operational complexity.
- My view: experiment later on low-risk demo surfaces only.

2. Prompt caching on future provider changes
- Value: good if we move more traffic onto providers that materially reward caching.
- My view: reasonable later, not a current blocker.

## Notes on suggestions I do not fully agree with

1. "Move the LLM first because it is the biggest latency win"
- I do not agree that this is proven yet in our current system.
- Recent live measurements pointed more at TTS than LLM as the dominant felt delay.

2. "Upgrade STT to Nova-3"
- We already use Nova-3.
- The useful improvement is keyterms / tuning, not a base-model swap.

3. "Guard timeout is 40ms"
- That is not the current default in our code.
- `livekit-agent/voice-latency.ts` defaults the guard timeout to 100ms, clamped between 40ms and 250ms.

## What I would do first when we resume optimization

1. Gather more fresh live latency samples for `demo` and `normal`.
2. Split provider latency metrics.
3. Add Deepgram keyterms.
4. Trial better EOU / turn detection on `inbound_demo`.
5. Reassess whether the next biggest bottleneck is still TTS before touching model-routing strategy.

---

## 2026-05-17 — Reliability + cost-adjusted backlog (review needed)

Captured from a working session investigating a homepage Tracey demo failure
where no failure email reached the admin. The immediate fix shipped on
`claude/fix-tracey-demo-voice-G2TTm` (a9739e8) — flipped the demo action to
`waitForConnection: true` so terminal SIP failures throw and the failure-alert
email actually fires. The items below are deferred for another AI agent or
human review to prioritise.

### Free / pure-code changes (no runtime cost)
- **Agent-joined verification** — extend the SIP-connected check so the action
  also asserts the LiveKit agent worker joined the room within Xs. Today
  "SIP answered + agent worker never showed up" still reports success and the
  prospect hears silence.
- **Fail-loud env validation at startup** — throw on boot if `RESEND_API_KEY`,
  `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`,
  `LIVEKIT_SIP_TRUNK_ID`, `VOICE_ALERT_EMAIL_TO` are missing. Silent skips in
  `lib/voice-incident-alert.ts` and `lib/demo-lead-email.ts` are how the user
  ended up with zero notifications.
- **Pre-warm the LiveKit room in parallel with `createSipParticipant`** —
  currently sequential in `lib/demo-call.ts:431-449`. ~200–400ms saving.
- **Cache the outbound trunk-health probe for ~60s** — also saves cost by
  short-circuiting dial attempts when the trunk is known dead.
- **STT endpointing tune** — Deepgram `endpointing` + `vad_events` params for
  faster turn-taking. Config only.

### Has ongoing cost — needs a call
- **TTS pre-roll on `ringing` instead of `connected`** — Cartesia is billed
  per character; if X% of dials never answer, that's X% wasted TTS spend.
  Worth it only if unanswered-rate is low and the perceived-latency win
  matters more than the spend.
- **Twilio bridge as automatic secondary on LiveKit failures** — adds a
  Twilio call leg per LiveKit failure. Fine as a circuit-breaker fallback;
  expensive as a default. Code path already exists, just gated behind
  `preferTwilioSipBridge` / `allowTwilioSipBridgeFallback`.
- **Provider swaps for cost** — Nova-3 → Nova-2 (~30% cheaper, marginal phone-
  audio accuracy loss); Cartesia → ElevenLabs Flash (faster + cheaper, voice
  change). Quality risk, not a free win.

### Explicitly deferred this session
- Synthetic canary calls (cost concern).
- SMS alert channel (email channel is meant to cover this).

### Out of code scope (operational, but flagged)
- Single LiveKit Cloud project = single point of failure.
- Single Twilio sub-account = one billing/regulatory event from outage.
- No status page or paging integration today.
