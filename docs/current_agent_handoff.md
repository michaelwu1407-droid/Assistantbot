# Current Agent Handoff

Updated: 2026-03-25 AEDT

This is the shortest required-read handoff for any AI agent resuming active work in this repo.
Start here before reading the longer audit/backlog docs.

## Read Order

1. `AGENTS.md`
2. `docs/current_agent_handoff.md`
3. `docs/voice_operating_brief.md` if the task touches voice, Twilio, monitoring, deploys, or onboarding/provisioning
4. The latest relevant entries at the end of `docs/agent_change_log.md`
5. One or more of:
   - `APP_MANUAL.md`
   - `ISSUE_TRACKER.md`
   - `DEPLOYMENT_CHECKLIST.md`
   - `docs/FINAL_RELEASE_RUNBOOK.md`

## What Each File Is For

- `AGENTS.md`
  - Canonical repo-wide rules, architecture decisions, deployment truths, and mandatory process rules.
- `docs/current_agent_handoff.md`
  - Current live state, exact unfinished work, and where to resume.
- `docs/voice_operating_brief.md`
  - Curated voice-specific runtime, topology, deploy, monitoring, and known-risk brief.
- `docs/agent_change_log.md`
  - Append-only operational audit log of what changed and why.
- `APP_MANUAL.md`
  - Product and operator expectations for the app behavior.
- `ISSUE_TRACKER.md`
  - Broad active backlog and feature-matrix status.
- `DEPLOYMENT_CHECKLIST.md`
  - Deployment and launch checklist.
- `docs/FINAL_RELEASE_RUNBOOK.md`
  - Smoke checks, rollback flow, and incident slices.

## Current Live State

- Repo branch: `main`
- Latest pushed repo SHA: `c126a152`
- Production web alias:
  - `https://www.earlymark.ai`
- Current live Vercel deployment:
  - `assistantbot-drzx9hh2x-michael-s-projects-031f547b.vercel.app`
- Live web SHA:
  - `68a4ce4c3f115ad6c0b4476705ace40e6a371502`
- Primary OCI worker host:
  - `140.238.198.39`
  - host id `2b98e2ef-6fcf-4fb1-9053-96acae34bdd8`
- Primary OCI worker release currently running:
  - `68a4ce4c3f115ad6c0b4476705ace40e6a371502`
- Current active worker containers:
  - `earlymark-sales-agent`
  - `earlymark-customer-agent`
- Worker env path:
  - `/opt/earlymark-worker-shared/.env.local`

## What Was Completed Most Recently

- Dockerized worker deploy path was hardened across:
  - image runtime dependencies
  - host-scoped verify gating
  - spoken-canary correlation
  - container cleanup during install/rollback
  - direct PID-kill fallback when Docker cannot stop old worker containers cleanly
- Production web is already live on the post-canary-fix app build.
- Primary OCI worker host is manually aligned to the same voice-worker SHA and both worker containers are healthy.
- No managed Earlymark production SMS number is required; launch readiness now treats that as healthy.
- Reporting/KPI/PDF correctness and CRM audit/correspondence/search parity were materially improved.
- Repo-wide TypeScript + ESLint hardening work:
  - `npx tsc --noEmit` passes (no TypeScript errors).
  - `npm run lint` passes with **0 lint errors** (but there are still lint warnings to clean up).

## Exact Outstanding Work

### Immediate unfinished items

1. Rerun the deploy-only spoken PSTN canary now that:
   - web is live on `68a4ce4c`
   - primary worker host is live on `68a4ce4c`
   - worker shutdown waits for `VoiceCall` persistence
   - Docker install can remove stuck old containers
2. Confirm the spoken canary reaches `healthy`.
3. Refresh launch/ops monitors after that canary run so stale monitor warnings stop dominating readiness output.
4. Clean up remaining ESLint warnings to reach “0 warnings” standard:
   - `@typescript-eslint/no-unused-vars` (lots of dead imports/vars across `actions/*`, tests, pages, components)
   - `@next/next/no-img-element` (replace `<img>` with `next/image` where appropriate; update test mocks)
   - `react-hooks/exhaustive-deps` warnings (fix dependencies properly; don’t silence)

### Still-open operational/platform items

1. Add the second OCI voice host.
2. Clean up the crash-looping `liveearlymarkai-redis-1` legacy sidecar on OCI.
3. Resolve the remaining failed Twilio provisioning record:
   - workspace: `My Workspace`
   - failed stage: `bundle-clone`
4. Run the remaining live smoke/runbook execution on production:
   - onboarding with and without provisioning
   - inbound voice
   - demo outbound voice
   - inbound email
   - any SMS flow still considered launch scope for customer workspaces

### Broader active backlog still not finished

1. ~~Invoice-adjustment UX polish~~ — DONE (email, line-item edit, reverse status, sync badge, void)
2. ~~Operator-visible smart-routing surfaces~~ — DONE (incident details in admin, voicemail in activity feed)
3. ~~Deeper recent-activity/history parity~~ — DONE (MEETING + TASK in inbox, voicemail in feed)
4. Remaining release smoke/runbook execution
5. Second-host voice rollout and multi-host sign-off

## Best Resume Points By Area

### Voice deploy / monitoring

- `ops/deploy/livekit-worker-install.sh`
- `ops/deploy/livekit-worker-verify.sh`
- `ops/docker/worker-compose.yml`
- `livekit-agent/Dockerfile`
- `livekit-agent/agent.ts`
- `lib/voice-spoken-canary.ts`
- `lib/launch-readiness.ts`
- `app/api/cron/voice-synthetic-probe/route.ts`
- `app/admin/ops-status/page.tsx`

### Provisioning / launch readiness

- `lib/onboarding-provision.ts`
- `lib/comms.ts`
- `lib/twilio-regulatory.ts`
- `lib/provisioning-readiness.ts`
- `lib/launch-readiness.ts`
- `app/api/workspace/setup-comms/route.ts`

### Reports / CRM parity

- `actions/analytics-actions.ts`
- `app/crm/analytics/page.tsx`
- `actions/tradie-actions.ts`
- `actions/deal-actions.ts`
- `actions/chat-actions.ts`
- `actions/activity-actions.ts`
- `actions/search-actions.ts`
- `lib/workspace-audit.ts`
- `components/layout/global-search.tsx`
- `components/core/command-palette.tsx`

## Resume Rules

- Do not start from the full changelog or old `HANDOVER.md`.
- Start from this doc, then read only the files relevant to the task you are resuming.
- If you change voice runtime, deploy, monitoring, or topology:
  - update `docs/voice_operating_brief.md`
- For any code/config/process change:
  - update `docs/agent_change_log.md`
