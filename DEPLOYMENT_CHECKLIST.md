# Earlymark Deployment Checklist

Current production is split into 2 deploy targets:

- `web app`
  Next.js app on Vercel
- `voice worker`
  LiveKit agent runtime on OCI

This checklist reflects the current stack, not the older Retell/Pj Buddy setup.

Current voice deployment distinction:

- Docker is the standardized deployment architecture for the LiveKit core voice infrastructure
- Docker is also the standardized deployment architecture for the Earlymark voice workers on OCI

## 1. Web app prerequisites

- verify `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- verify Stripe live keys
- verify Twilio live keys
- verify Google Maps key if maps/autocomplete are needed
- verify `NEXT_PUBLIC_APP_URL`
- run:

```bash
npx prisma generate
npx prisma migrate deploy
npx tsc --noEmit
next build
```

## 2. Billing + onboarding rules

Current beta behavior:

- billing comes before onboarding
- billing page has optional toggle:
  - `Provision mobile business number`
- toggle `on` before Stripe payment:
  - workspace becomes eligible for Twilio mobile-number provisioning
- toggle `off` before Stripe payment:
  - user can still pay
  - user can still complete onboarding
  - no Twilio number is provisioned later from that paid flow

Verify these paths before release.

## 3. Twilio provisioning prerequisites

- Twilio parent account must be configured
- AU regulatory bundle must be approved before AU number purchase
- provisioning is currently mobile-only for new AU numbers
- one workspace gets one subaccount + one business number
- successful workspaces should not auto-reprovision

Verify:

- already-provisioned workspaces do not buy another number
- duplicate beta workspaces are blocked correctly where applicable
- onboarding shows existing number immediately when present

## 4. Voice worker prerequisites

The LiveKit worker is deployed separately from Vercel.

Infrastructure model to verify before deployment:

- LiveKit core infrastructure should be running via Docker on the OCI host
- the active Twilio subaccount voice agent workers should be running as Docker containers from `/opt/earlymark-worker`
- do not treat legacy native LiveKit, Redis, or Tailscale services as part of the supported runtime

Required envs typically include:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `DEEPGRAM_API_KEY`
- `CARTESIA_API_KEY`
- `GROQ_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `VOICE_AGENT_WEBHOOK_SECRET`
- `EARLYMARK_INBOUND_PHONE_NUMBER`

Current voice assumptions:

- Groq is primary with explicit fallback handling
- Cartesia `sonic-3` is pinned for TTS
- LiveKit worker logs deployed git SHA on startup
- Twilio numbers must point to `/api/webhooks/twilio-voice-gateway`, not directly to SIP
- inbound failures must fall back to voicemail, never dead SIP
- container health must stay green for `earlymark-sales-agent` and `earlymark-customer-agent`

## 5. GitHub Actions worker deploy

`livekit-agent/**` changes on `main` should trigger the worker deploy workflow.

Important distinction:

- this workflow updates the Dockerized voice worker runtime on OCI
- it is separate from the Vercel web deploy and must still be checked independently

Before relying on it, verify repo secrets exist:

- `SSH_HOST`
- `SSH_USERNAME`
- `SSH_PRIVATE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `VOICE_MONITOR_DEADMAN_URL` if using an external dead-man service

SSH reachability prerequisites:

- `SSH_HOST_PRIMARY` / `SSH_HOST` should resolve to the OCI public IP `140.238.198.39`
- inbound TCP `22` must be allowed in both OCI security rules and Ubuntu `iptables`
- if GitHub Actions fails with `Connection timed out during banner exchange`, treat it as a network/firewall incident before debugging package copy or restart logic
- if the Ubuntu firewall has reblocked SSH, recover with:

```bash
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
sudo netfilter-persistent save
```

- after restoring access, confirm `sshd` is running and listening on `22`
- if `journalctl -u ssh` shows accepted GitHub publickey sessions for `ubuntu`, SSH transport is working and the next check is the non-interactive runtime bootstrap path (`PATH`, `node`, `docker`, `docker compose`)
- see `docs/OCI_SSH_FIREWALL_POSTMORTEM.md` for the March 12, 2026 two-stage incident pattern and triage steps

After a worker deploy:

- check the workflow run went green
- confirm `/api/internal/launch-readiness` and `/admin/ops-status` show the expected live worker SHA
- confirm `sudo docker ps` shows healthy `earlymark-sales-agent` and `earlymark-customer-agent` containers
- confirm `sudo docker logs --tail 120 earlymark-sales-agent` and `sudo docker logs --tail 120 earlymark-customer-agent` show the deployed SHA
- verify the deploy/recovery spoken probe passes

## 6. Production verification

### Web

- homepage copy/layout is correct
- signup -> billing -> onboarding flow is correct
- payment succeeds
- onboarding can complete in both:
  - provisioning requested
  - provisioning not requested
- dashboard loads
- inbox/chat/kanban/map all load

### CRM

- create job
- create contact
- move cards
- invoice draft/issue/paid actions
- inbox `Ask Tracey` can:
  - update CRM fields
  - send customer comms when asked

### Voice

- `Tracey interview form` behaves correctly
- `Tracey inbound call` behaves correctly
- `Tracey for users` behaves correctly
- Twilio Earlymark inbound number points to the app gateway and is not attached directly to a SIP trunk
- `/api/cron/voice-agent-health` returns healthy via GitHub Actions
- `/api/cron/voice-monitor-watchdog` returns healthy via GitHub Actions
- `/api/cron/passive-communications-health` returns healthy via GitHub Actions
- `/api/cron/voice-synthetic-probe` is healthy when run manually for deploy/recovery verification
- latency logs are emitted
- call transcripts persist for new calls
- `/admin/ops-status` shows passive production healthy and active probe separated correctly

## 7. Operational checks

- Sentry configured
- PostHog/analytics configured if required
- cron secrets configured in both Vercel and GitHub Actions
- synthetic probe caller/target envs configured
- storage uploads work
- Google Maps failures degrade gracefully
- welcome SMS path works when provisioning succeeds
- call forwarding setup SMS flow works
- `VOICE_MONITOR_PROBE_CALLER_NUMBER` is distinct from the Earlymark inbound number
- launch-readiness, passive-production, and public health all agree on release truth

## 8. Final release hardening

- run the full smoke suite for:
  - auth
  - billing
  - onboarding with and without number provisioning
  - dashboard load
  - inbound Earlymark voice
  - outbound demo voice
  - customer voice
  - inbound SMS if SMS is in launch scope
  - inbound email
  - CRM invoice actions
  - reports
  - integrations in launch scope
- confirm incident runbooks exist and are current for:
  - voice outage
  - inbound email outage
  - provisioning outage
  - deploy rollback
  - OCI host replacement
- treat single-host voice as degraded until a second OCI worker host is real and healthy

## 9. Known split-brain risk to avoid

Do not treat Vercel deploy success as voice-worker deploy success.

- Vercel updates the web app
- LiveKit worker changes require the OCI/GitHub Actions worker path

Both must be checked independently.
