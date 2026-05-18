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
- My view: possible win, but only with live phrase review and narrow intent gates. As of 2026-05-18, long speculative heads are opt-in/default-off because broad demo turns were causing the agent to say `Yep, Earlymark can help with that.` when it did not fit.

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

### Tier 4 - architecture experiments, build only behind a measured trial

1. Realtime speech-to-speech model path
- Example: OpenAI Realtime API or Gemini Live on a separate `demo` / `inbound_demo` surface.
- What it is: a voice model listens to caller audio and replies with audio directly, instead of the current Deepgram STT -> LLM -> Cartesia TTS pipeline.
- Expected upside: fewer model handoffs, lower perceived response latency, more natural interruption handling, and better demo "wow" factor.
- Expected cost/risk: likely similar to 2-3x current AI minute cost depending talk time; weaker step-by-step logs; harder debugging; tool/CRM/lead logging may be less predictable than the current text-centered pipeline.
- Guardrail: do not migrate normal customer calls until a side-by-side trial beats the current stack on reliability, cost, tool accuracy, and call quality.
- Trial design: keep the current pipeline as baseline, build a separate realtime Tracey demo agent, run 20-50 test calls, then compare first-response latency, cost per minute, interruption quality, wrong-answer rate, failed-call rate, discovery-question rate, lead capture/logging rate, and close/follow-up ask rate.
- My view: worth building as a future experiment for demo/inbound demo only; not a blind rewrite.

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

### Cost note added 2026-05-18
- Cartesia subscription is now active at **A$7.27/month**. Treat this as the
  baseline fixed TTS provider cost before per-usage overages/credits when
  calculating future voice-agent economics.
- The 2026-05-18 homepage demo outage was traced to Cartesia billing/credits:
  local Cartesia returned HTTP `402 Insufficient credits`, and production worker
  warmup returned only 94 samples instead of speech-length audio. Future TTS
  failures should identify provider billing/credit/rate-limit/auth reasons in
  worker health before assuming the LiveKit agent identity or prompt is broken.

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

---

## 2026-05-17 — Current diagnosis: homepage Tracey demo failure

Symptom reported by user: homepage Tracey demo form submits cleanly, "Tracey is
calling you now!" appears, no call arrives, no failure email reaches the admin.

### Architecture confirmed
Two Docker containers in `ops/docker/worker-compose.yml`:

| Container                 | Surfaces            | Handles                          |
|---------------------------|---------------------|----------------------------------|
| `earlymark-sales-agent`   | `demo, inbound_demo`| Homepage demo + inbound demo line|
| `earlymark-customer-agent`| `normal`            | Real customer calls              |

Both subscribe to the same LiveKit unnamed worker pool. Routing happens in
`livekit-agent/worker-entry.ts:143-167`. A demo room is named `demo-${ts}-...`
(`lib/demo-call.ts:430`), classified as surface `"demo"` by `inferSurface()`
(`worker-entry.ts:59`), so **only the sales-agent container can take it.**

### Most likely root cause
`earlymark-sales-agent` is **down or unhealthy** in production. Failure mode
matches exactly:
1. `initiateDemoCall` creates room + SIP participant (works — pure LiveKit API)
2. Twilio dials the prospect (works — Twilio is fine)
3. LiveKit offers the agent job to the pool
4. Customer-agent sees surface `"demo"`, silently `job.reject()`s
   (`worker-entry.ts:165` — no log, no metric)
5. No other worker available → job times out → no agent ever joins
6. With OLD `waitForConnection: false`, the action had already returned
   success → no exception → no failure email

This also matches "worked once then stopped" — a single container crash with
`bootReady` never going true would leave Docker's `restart: unless-stopped`
looping forever while staying unhealthy.

### Already shipped on `claude/fix-tracey-demo-voice-G2TTm`
- `a9739e8` — flipped `actions/demo-call-action.ts` to `waitForConnection: true`
  so terminal SIP failures now throw and `dispatchDemoCallFailureAlert` fires.
  Future failed submissions will produce a real diagnostic email.

### Required next step (user-side, cannot do from code sandbox)
On the host running `ops/docker/worker-compose.yml`:
```
docker ps
docker logs earlymark-sales-agent --tail 200
docker inspect --format '{{.State.Health.Status}}' earlymark-sales-agent
```
Most likely findings:
- Container exited / restarting → boot failure in logs, usually a missing env
  var (`DEEPGRAM_API_KEY`, `GROQ_API_KEY`, `CARTESIA_API_KEY`) or LiveKit auth.
- `(unhealthy)` → heartbeat snapshot stale; same root cause class.
- `(healthy)` → bug is elsewhere; most likely trunk resolution picking a dead
  trunk in `lib/demo-call.ts:299-368`, or `LIVEKIT_SIP_TRUNK_ID` mismatch.

### Cheap code-side improvement worth doing next
Add a `console.warn` in `livekit-agent/worker-entry.ts:165` when a job is
rejected because the inferred surface is outside this worker's accepted list.
Today this rejection path is completely silent. One log line per rejected job
makes "sales-agent is down" detectable in LiveKit dashboard / container logs
the moment it happens. No runtime cost, no behaviour change.
