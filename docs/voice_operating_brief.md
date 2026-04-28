# Voice Operating Brief

Updated: 2026-04-28 AEST

## Production topology

- Live voice stack: Twilio PSTN/SIP -> `app/api/webhooks/twilio-voice-gateway` -> LiveKit SIP -> OCI voice workers.
- Public website demo callbacks now have an emergency recovery path: if the web app cannot reach the LiveKit control API, it may originate the callback with Twilio and bridge the caller into the existing Earlymark SIP ingress instead of failing the lead immediately.
- Core LiveKit infrastructure is Dockerized on OCI under `/opt/livekit`.
- Voice workers are Dockerized on OCI under `/opt/earlymark-worker` and orchestrated by `ops/docker/worker-compose.yml`.
- Shared worker env is persisted at `/opt/earlymark-worker-shared/.env.local`.
- `/opt/earlymark-agent` is no longer a supported worker runtime or env fallback. Treat it only as a legacy artifact until it is explicitly removed from the host.
- Canonical worker containers:
  - `earlymark-sales-agent`
  - `earlymark-customer-agent`
- Canonical deploy workflow: `.github/workflows/deploy-livekit.yml`

## Twilio provisioning topology

- AU mobile numbers are purchased in the **main Twilio account** (with `bundleSid` + `addressSid` from the main account's regulatory bundle), then **transferred** to the customer's subaccount via `incomingPhoneNumbers(sid).update({ accountSid })`.
- After transfer, a compliant address is created in the subaccount, and the SIP trunk + voice/SMS webhooks are configured using the subaccount client.
- The main account's regulatory bundle address is resolved automatically via `findSourceBundleAddressSid()` — no manual Twilio Console steps per customer.

## Required runtime contract

- Provider stack:
  - STT: Deepgram Nova-3
  - LLM: Groq primary, DeepInfra fallback
  - TTS: Cartesia Sonic 3
- Production worker env must include:
  - `LIVEKIT_URL`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
  - `APP_URL` or `NEXT_PUBLIC_APP_URL`
  - `VOICE_AGENT_WEBHOOK_SECRET`
  - `DEEPGRAM_API_KEY`
  - `GROQ_API_KEY` or `DEEPINFRA_API_KEY`
  - `CARTESIA_API_KEY`
  - `VOICE_TTS_VOICE_ID`
  - `VOICE_TTS_LANGUAGE`
- Current English Tracey default:
  - `VOICE_TTS_VOICE_ID=a4a16c5e-5902-4732-b9b6-2a48efd2e11b`
  - `VOICE_TTS_LANGUAGE=en-AU`

## Accepted surface behavior

### `demo`

- Outbound Earlymark product demo to a lead who already filled in the website form.
- Use known form details as baseline context.
- Do not aggressively re-capture already-known details.
- Main job: pain-point discovery, live capability demo, homepage-aligned selling, and contextual close toward sign-up or manager consult.

### `inbound_demo`

- Inbound Earlymark sales assistant.
- Answer Earlymark questions first, then sell from the homepage sales brief.
- Offer a spoken product demo when the caller wants one.
- Capture caller details early because this path starts without trusted lead context.
- Canonical inbound room naming accepted by the worker/runtime health path is either `earlymark-inbound-*` or `inbound_*`.

### `normal`

- Customer-facing assistant for Earlymark customers.
- Must not contain Earlymark sales copy.
- Must align strictly with the workspace customer-contact mode across voice, SMS, email, and outbound follow-up.
- If the generated response violates mode, it must be rewritten before it is spoken or sent.

### Voice continuity guarantee

- `app/api/webhooks/twilio-voice-gateway` must fail safe:
  - On any routing/runtime failure (STIR/SHAKEN failure, rate-limit, missing sipTarget, handler exceptions), it must return `voicemailFallbackTwiml` so the caller can always leave a voicemail recording.
  - It must also open a `VoiceIncident` so failures are visible in internal incident tracking.
  - Even if caller/called metadata is missing from the webhook payload, the handler exception path must still record the incident and return `voicemailFallbackTwiml`.
  - Spoken fallback prompts use AWS Polly `Polly.Olivia` (Australian English) for the initial spoken line before `<Record>`.
  - The canonical voicemail greeting is: "Sorry, we can't reach you right now. Please leave a message for the team and we'll get back to you."
  - Incident creation (`openGatewayIncident`) is non-blocking (`void`) to avoid webhook timeouts that trigger Twilio's generic "application error" message.
  - Voicemail recordings are stored as `WebhookEvent` records (`provider: "twilio_voice_fallback"`, `eventType: "voicemail_recorded"`) and are surfaced in the operator activity feed alongside normal voice calls.

## Customer-contact mode policy

- `execute`
  - May answer supported questions and make routine commitments only when backed by approved rules, tools, and current workspace data.
- `review_approve`
  - May answer, screen, and gather details, but must not make firm bookings, quotes, or outbound commitments.
- `info_only`
  - May answer FAQs and capture details only; must not quote, schedule, confirm, promise follow-up timing, or initiate outbound customer contact.

## Current latency bottleneck and thresholds

- Current dominant bottleneck on Earlymark sales surfaces is usually TTS first-byte, not STT or LLM.
- Thresholds:
  - `demo` / `inbound_demo`
    - `llmTtftAvgMs <= 1200`
    - `ttsTtfbAvgMs <= 900`
    - `totalTurnStartMs <= 1800`
  - `normal`
    - `llmTtftAvgMs <= 1500`
    - `ttsTtfbAvgMs <= 1100`
    - `totalTurnStartMs <= 2200`
- Low-risk latency acceleration is enabled through:
  - cached opener bank
  - speculative response heads on `demo` and `inbound_demo`

## Monitoring expectations

- `voice-fleet-health` must include:
  - fleet
  - Twilio routing
  - LiveKit SIP health
  - recent-call health
  - latency health
  - passive production health
  - monitor freshness
  - active probe state
- By default, single-host voice operation is treated as degraded.
- If you are intentionally running single-host for a period, set `VOICE_SINGLE_HOST_ACCEPTED=true` so readiness reflects real failures instead of permanently warning about the missing second host.
- Routine launch and ops status now use passive real-traffic monitoring:
  - voice from persisted `VoiceCall` activity plus recent Twilio failures
  - inbound email from real `WebhookEvent(provider="resend", eventType="email.received")` success/failure data
- Low/no traffic customer workspaces are surfaced as per-workspace `unknown`, but they do not drag top-level launch status down unless there is a real failure signal.
- The synthetic probe is no longer the routine production health source. It is reserved for deploy verification and manual incident recovery.
- The spoken PSTN canary is only considered healthy when Twilio completes the probe call and the app persists a matching `VoiceCall` with both caller and Tracey speech.
- Worker shutdown must wait for `VoiceCall` persistence to finish after disconnect. Do not fire-and-forget the `/api/internal/voice-calls` write or the deploy-only spoken canary will produce false negatives even when Tracey answered correctly.
- Launch-critical release truth now has a dedicated internal route at `/api/internal/launch-readiness`, which aggregates:
  - live web release SHA
  - live worker release SHA(s)
  - critical voice gate status
  - passive production state
  - active probe state
  - monitoring freshness
  - SMS/email readiness
  - provisioning drift
- Worker deploy verification now checks this launch-readiness route after heartbeat/drift convergence and then actively invokes `/api/cron/voice-synthetic-probe`; it rolls back if either the critical voice gate or the spoken PSTN canary is unhealthy.
- Worker deploy verification is host-scoped for the actual rollout gate: heartbeat convergence, drift checks, and launch-readiness checks must all key off the targeted host plus healthy Twilio routing and LiveKit SIP, and must not reject the deploy solely because the global fleet remains single-host degraded while the second host has not been provisioned yet.
- Worker deploy verification must preserve the rollout SHA and host ID passed in by the deploy command even after sourcing the live worker env from disk. Do not let `/opt/earlymark-worker/.env.local` silently override the SHA being verified.
- Docker worker install/rollback must explicitly remove the fixed-name worker containers plus any stale compose-generated duplicates before `docker compose up`, otherwise a new release can fail with container-name conflicts even though the running workers are healthy.
- App-side heartbeat freshness must use the server receipt timestamp, not the worker-reported wall clock. OCI/Docker host clock skew should never be able to make a healthy worker look stale in fleet truth, launch-readiness, or deploy verification.
- LiveKit SIP health and outbound demo-trunk resolution must compare phone numbers in normalized E.164 form. Formatting differences like `0485...`, `61...`, spaces, or punctuation must not create false-unhealthy voice gates.
- Public `/api/health` must mirror launch-readiness truth plus database reachability. Do not reintroduce a separate fragmented public health aggregation for voice, Twilio, readiness, and release state.
- Public `/api/health` is a real production signal, not an internal debug route. Do not hide it behind production middleware rewrites.

## Active known risks

- LiveKit worker containers require the RTC native Linux shared libraries baked into the Docker image. If a fresh worker image crash-loops with `libgio-2.0.so.0` or another `@livekit/rtc-node` dependency error, treat that as a broken image/runtime regression and rebuild from the canonical Dockerfile immediately.
- Voice workers are now containerized. If `VOICE_SINGLE_HOST_ACCEPTED` is not set, readiness will continue to treat single-host operation as degraded until a second OCI host is healthy and participating in fleet truth.
- The primary OCI worker host is now manually running `68a4ce4c`, but the deploy-only spoken PSTN canary has not yet been rerun to a confirmed healthy result after the final worker-container stop/removal hardening. Treat the Dockerized worker rollout as improved but not fully signed off until that post-patch canary passes.
- The spoken PSTN canary still depends on a distinct Twilio-owned or verified outgoing caller ID; if `VOICE_MONITOR_PROBE_CALLER_NUMBER` is not safe for outbound use, deploy verification and recovery probing are constrained.
- `liveearlymarkai-redis-1` is still crash-looping on the OCI host because the legacy LiveKit Redis sidecar is fighting the existing host Redis port binding. It is not the active Tracey worker runtime, but it remains host hygiene drift that should be cleaned up.
- Homepage copy and voice prompts now share a canonical sales brief, but homepage sections outside the main pillars can still drift if edited independently.
- Inbound lead-email DNS drift is surfaced as degraded readiness, not a hard reconcile failure; customer-agent reconcile should only fail on runtime blockers, not missing inbound MX.
- The Docker worker deploy persists env outside the release directory, but the first host migration still needs a valid existing worker env to seed `/opt/earlymark-worker-shared/.env.local`.

## Recent confirmed learnings

- Prompt-only mode alignment is not enough; `normal` needs deterministic pre-speech and pre-send policy enforcement.
- The Australian Cartesia voice must be explicit in production env and visible in runtime telemetry, otherwise accent drift is too easy to miss.
- Sales surfaces drift quickly when homepage value props and voice prompts are maintained separately.
- Prompt regression tests must import shared prompt builders, not the full worker runtime, or the web deploy path gets coupled to worker-only native dependencies.
- If `/api/health`, `/api/internal/launch-readiness`, and `/admin/ops-status` disagree, treat that as a regression in release-truth wiring rather than a harmless presentation difference.
- Deploy workflow should only run for voice-affecting changes; broad `main` deploy triggers create unnecessary worker churn.
- Audit history is useful, but agents need a short curated voice handoff doc to avoid re-learning the same lessons from a bloated changelog.
- Container health plus launch-readiness plus spoken-canary truth is a better worker release gate than heartbeat-only verification.
- The spoken canary should correlate on persisted call start time plus caller/called numbers, not row creation time alone, because call rows can be written after the live call has already finished.

- Knowledge no-go matching is now deduped using word-overlap and strict `[HARD_CONSTRAINT]` dominance (with `[FLAG_ONLY]` treated as advisory flags) so both chat and voice grounding avoid near-duplicate exclusions and apply consistent precedence.
