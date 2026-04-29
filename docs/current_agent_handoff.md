# Current Agent Handoff

Updated: 2026-04-29 AEST

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

## Current Live State

- Repo branch: `main`
- Latest pushed repo SHA: `97ec7706`
- Production web alias:
  - `https://www.earlymark.ai`
- Live web SHA:
  - `97ec7706`
- Primary OCI worker host:
  - `140.238.198.39`
  - host id `2b98e2ef-6fcf-4fb1-9053-96acae34bdd8`
- Current active worker containers:
  - `earlymark-sales-agent`
  - `earlymark-customer-agent`
- Worker env path:
  - `/opt/earlymark-worker-shared/.env.local`
- Current core LiveKit runtime:
  - Docker containers: `livekit-livekit-1`, `livekit-sip`
  - Host services: `caddy`, `redis-server`
  - Core bind-mount root: `/home/ubuntu/livekit/live.earlymark.ai`
- Current voice state:
  - `voice-fleet-health` healthy
  - `livekitSip` healthy
  - spoken PSTN canary healthy
  - fresh `VoiceCall` and latency samples are flowing again
- Current remaining app degradation:
  - communications/email verification noise (`Resend` `429` / recent inbound-email confirmation), not the voice path

## What Was Completed Most Recently

- Recovered the broken production LiveKit control plane on OCI.
  - Root cause: Snap Docker could not bind-mount `/opt/livekit`, which left the core `livekit-livekit-1` and `livekit-sip` stack dead while emitting misleading `read-only file system` mount errors.
  - Live fix: restarted LiveKit server and SIP with `--restart always` using bind mounts rooted at `/home/ubuntu/livekit/live.earlymark.ai`, then restarted the worker compose stack.
- Verified the full voice path after recovery:
  - `https://live.earlymark.ai` responds again
  - local control API on `127.0.0.1:7880` responds again
  - SIP signaling on `5060` is listening again
  - the spoken canary completed with a persisted `VoiceCall`
- Worker heartbeats are healthy again, but note:
  - the manually restarted worker compose run did not inject `EARLYMARK_DEPLOY_GIT_SHA`, so the heartbeat `deployGitSha` currently reports `unknown` until the next normal worker deploy

## Exact Outstanding Work

### Immediate unfinished items

1. Run the next normal GitHub Actions worker deploy so worker heartbeats return to a real `deployGitSha` instead of `unknown`.
2. Keep the core runtime truth aligned with production:
   - use `/home/ubuntu/livekit/live.earlymark.ai` for core LiveKit bind mounts
   - do not recreate `livekit-caddy-1` or `livekit-redis-1` unless the host topology is intentionally redesigned
3. Resolve the remaining communications/email degradation so `/api/health` and launch readiness move from degraded to healthy.
4. Clean up remaining ESLint warnings to reach `0 warnings` standard:
   - `@typescript-eslint/no-unused-vars`
   - `@next/next/no-img-element`
   - `react-hooks/exhaustive-deps`

### Still-open operational/platform items

1. Add the second OCI voice host.
2. Make sure the legacy `liveearlymarkai-redis-1` sidecar stays removed and is not recreated by any old compose/service owner.
3. Resolve the remaining failed Twilio provisioning record:
   - workspace: `My Workspace`
   - failed stage: `bundle-clone`
4. Run the remaining non-voice production smoke checks:
   - onboarding with and without provisioning
   - inbound email
   - any launch-scope SMS flow for customer workspaces

## Best Resume Points By Area

### Voice deploy / monitoring

- `ops/deploy/livekit-worker-install.sh`
- `ops/deploy/livekit-worker-verify.sh`
- `ops/docker/worker-compose.yml`
- `livekit-agent/agent.ts`
- `livekit-agent/livekit-sip-runtime.ts`
- `lib/livekit-sip-health.ts`
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

- Do not start from the full changelog or old handover docs.
- Start from this doc, then read only the files relevant to the task you are resuming.
- If you change voice runtime, deploy, monitoring, or topology:
  - update `docs/voice_operating_brief.md`
- For any code/config/process change:
  - update `docs/agent_change_log.md`
