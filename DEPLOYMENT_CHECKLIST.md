# Earlymark Deployment Checklist

Current production is split into 2 deploy targets:

- `web app`
  Next.js app on Vercel
- `voice worker`
  LiveKit agent runtime on OCI

This checklist reflects the current stack, not the older Retell/Pj Buddy setup.

Current voice deployment distinction:

- Docker is the standardized deployment architecture for the LiveKit core voice infrastructure
- the Twilio subaccount voice agent worker is not yet standardized on Docker and currently runs as a host process

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
- the active Twilio subaccount voice agent worker should be treated as a host-process deploy, not a Docker deploy
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

## 5. GitHub Actions worker deploy

`livekit-agent/**` changes on `main` should trigger the worker deploy workflow.

Important distinction:

- this workflow currently updates the host-process voice agent worker
- it does not represent a full Dockerized deployment of the Twilio subaccount voice agent runtime

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
- see `docs/OCI_SSH_FIREWALL_POSTMORTEM.md` for the March 12, 2026 incident pattern and triage steps

After a worker deploy:

- check the workflow run went green
- confirm `/tmp/agent.log` on OCI contains the deployed SHA
- make a test call and verify runtime behavior from logs

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
- `/api/cron/voice-synthetic-probe` returns healthy via GitHub Actions
- latency logs are emitted
- call transcripts persist for new calls

## 7. Operational checks

- Sentry configured
- PostHog/analytics configured if required
- cron secrets configured in both Vercel and GitHub Actions
- synthetic probe caller/target envs configured
- storage uploads work
- Google Maps failures degrade gracefully
- welcome SMS path works when provisioning succeeds
- call forwarding setup SMS flow works

## 8. Known split-brain risk to avoid

Do not treat Vercel deploy success as voice-worker deploy success.

- Vercel updates the web app
- LiveKit worker changes require the OCI/GitHub Actions worker path

Both must be checked independently.
