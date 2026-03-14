# Voice Operating Brief

Updated: 2026-03-14 AEDT

## Production topology

- Live voice stack: Twilio PSTN/SIP -> `app/api/webhooks/twilio-voice-gateway` -> LiveKit SIP -> OCI voice workers.
- Core LiveKit infrastructure is Dockerized on OCI.
- Voice workers currently run as `systemd` services on OCI from `/opt/earlymark-agent`.
- Canonical worker services:
  - `earlymark-sales-agent`
  - `earlymark-customer-agent`
- Canonical deploy workflow: `.github/workflows/deploy-livekit.yml`

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

### `normal`

- Customer-facing assistant for Earlymark customers.
- Must not contain Earlymark sales copy.
- Must align strictly with the workspace customer-contact mode across voice, SMS, email, and outbound follow-up.
- If the generated response violates mode, it must be rewritten before it is spoken or sent.

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
  - monitor freshness
  - synthetic probe state
- Single-host voice operation is treated as degraded until a second healthy host is real.
- Synthetic probe is no longer just a gateway green check; it also reports whether a recent spoken canary sample exists for the probe path.

## Active known risks

- Worker runtime is still host-process `systemd`, not yet immutable container images.
- The synthetic probe still depends on recent spoken call evidence instead of originating a fully automated PSTN call on every run.
- Homepage copy and voice prompts now share a canonical sales brief, but homepage sections outside the main pillars can still drift if edited independently.
- Inbound lead-email DNS drift is surfaced as degraded readiness, not a hard reconcile failure; customer-agent reconcile should only fail on runtime blockers, not missing inbound MX.

## Recent confirmed learnings

- Prompt-only mode alignment is not enough; `normal` needs deterministic pre-speech and pre-send policy enforcement.
- The Australian Cartesia voice must be explicit in production env and visible in runtime telemetry, otherwise accent drift is too easy to miss.
- Sales surfaces drift quickly when homepage value props and voice prompts are maintained separately.
- Deploy workflow should only run for voice-affecting changes; broad `main` deploy triggers create unnecessary worker churn.
- Audit history is useful, but agents need a short curated voice handoff doc to avoid re-learning the same lessons from a bloated changelog.
