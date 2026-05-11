# Current Agent Handoff

Updated: 2026-05-11 AEST

This is the canonical short resume brief for active work in this repo.
Use this first, then read only the narrower docs that match the task at hand.

## Read Order

1. `AGENTS.md`
2. `docs/current_agent_handoff.md`
3. `docs/voice_operating_brief.md` if the task touches voice, Twilio, monitoring, deploys, onboarding, or provisioning
4. The latest relevant entries at the end of `docs/agent_change_log.md`
5. Then, if you need product/backlog context:
   - `docs/master_outstanding_checklist.md`
   - `docs/missing_features.md`
   - `APP_MANUAL.md`
   - `DEPLOYMENT_CHECKLIST.md`
   - `docs/FINAL_RELEASE_RUNBOOK.md`

## Canonical Documentation Rules

- `docs/master_outstanding_checklist.md` is the canonical flat backlog for still-open work.
- `docs/missing_features.md` is the canonical short list of meaningful product gaps that still appear unbuilt or only partially built.
- `IMPLEMENTATION_ROADMAP.md` is archived. Do not use it for active planning.
- `ISSUE_TRACKER.md` is archived. Do not use it as the source of truth for current work.

## Current Repo State

- Repo branch: `main`
- Latest pushed repo SHA in this workstream: `d308a392`
- Production web alias:
  - `https://www.earlymark.ai`
- Voice/ops work recently completed in repo:
  - synthetic voice probe now skips invalid Twilio-to-our-own-Twilio PSTN self-calls and verifies directly over SIP instead
  - launch-readiness checks no longer self-trigger a live synthetic probe
  - warning-level voice incidents are now batched into a daily digest, with longer repeat cooldowns for critical incidents
- Most recent working assumption:
  - voice monitoring and launch-readiness are materially cleaner than before
  - the remaining high-value work is product trust, real provider/device validation, and a small number of operational/provider gaps

## Exact Outstanding Work

### Highest-priority live product work

1. Continue live authenticated CRM workflow testing and fix any remaining trust/coherence issues.
2. Keep improving Tracey's real CRM usefulness:
   - answer CRM questions correctly
   - perform CRM mutations correctly
   - explain clearly what happened
3. Finish real provider/device verification for:
   - homepage demo callback flow
   - `inbound_demo`
   - real customer `normal` voice path
   - WhatsApp assistant / WhatsApp notifications
4. Keep launch-scope comms verification honest:
   - onboarding with and without provisioning
   - inbound email
   - customer SMS flows

### Current known product/platform gaps worth treating as real until disproven

1. Google Calendar should stay outbound-only for now; do not add background calendar-reading/import behavior unless the product decision changes.
2. Email OAuth callback/token persistence still needs confidence or verification.
3. Xero draft invoice creation exists, but true auto-sync after issue/paid events is still not documented as complete.
4. Email review-request parity still appears weaker than SMS review-request support.
5. Support tickets are still activity-based rather than a fuller owned ticket workflow.
6. WhatsApp remains partly provider-blocked in production until Twilio channel configuration is fully cleared.

## Best Resume Points By Area

### Voice / deploy / monitoring

- `ops/deploy/livekit-worker-install.sh`
- `ops/deploy/livekit-worker-verify.sh`
- `livekit-agent/agent.ts`
- `lib/voice-spoken-canary.ts`
- `lib/launch-readiness.ts`
- `app/api/cron/voice-synthetic-probe/route.ts`
- `app/admin/ops-status/page.tsx`

### CRM / Tracey / workflow trust

- `actions/chat-actions.ts`
- `actions/deal-actions.ts`
- `actions/activity-actions.ts`
- `actions/search-actions.ts`
- `actions/analytics-actions.ts`
- `components/chatbot/*`
- `components/crm/*`

### Provisioning / communications / launch readiness

- `lib/onboarding-provision.ts`
- `lib/comms.ts`
- `lib/provisioning-readiness.ts`
- `lib/launch-readiness.ts`
- `app/api/workspace/setup-comms/route.ts`

## Resume Rules

- Do not restart from old roadmap docs.
- Do not use `IMPLEMENTATION_ROADMAP.md` or `ISSUE_TRACKER.md` for active planning.
- Start from this file, then move into the smallest relevant subset of docs and code.
- If you change voice runtime, monitoring, or deploy behavior:
  - update `docs/voice_operating_brief.md`
- For any meaningful code/config/process change:
  - update `docs/agent_change_log.md`
