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
