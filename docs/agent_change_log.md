## 2026-03-19 19:50 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Further Twilio address validation: abbreviate street suffixes (Road→Rd, Street→St, etc.) before sending; retry with region as abbreviation (NSW) if first attempt with full state name fails; log full Twilio error (code, body) on failure.
- **Why**: Validators often expect abbreviated street types; some expect state abbreviation instead of full name. Two attempts (full region then abbrev) and suffix normalization improve acceptance.

## 2026-03-19 18:05 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Fixed Twilio AU address validation the right way. (1) Use Google Geocoding as primary source for address components when physicalAddress is present; fall back to local parsing only if geocoding fails or is unavailable. (2) Normalize for validators: street number ranges (e.g. "36-42 Henderson Road") → first number only ("36 Henderson Road"); send Region as full state name ("New South Wales") via AU_STATE_FULL_NAMES; truncate CustomerName to 21 chars per Twilio limit. (3) Address creation is required again—removed non-fatal swallow so provisioning fails clearly if address cannot be created.
- **Why**: Twilio's AU address validator was rejecting addresses; using geocoded canonical components plus full state name and range normalization meets their validation. AddressSid is required for AU mobile purchase (error 21631).

## 2026-03-18 14:00 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Made regulatory address creation non-fatal. If Twilio's address validator rejects the address, provisioning now continues with just the bundleSid (the cloned regulatory bundle already contains approved address info). The addressSid is only included in the number purchase if it was successfully created. Added number-purchase param logging.
- **Why**: Twilio's strict address validation was blocking AU provisioning even with valid address components. The regulatory bundle already contains the approved address, so the separate addressSid is supplementary.

## 2026-03-18 13:30 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Added `autoCorrectAddress: true` to Twilio `addresses.create` call so Twilio attempts address correction rather than strict rejection. Added detailed error logging (Twilio error code, status, moreInfo) and payload logging for the create call to diagnose future failures.
- **Why**: Twilio's strict address validation was rejecting the AU address even with correct structured components. The `autoCorrectAddress` flag enables Twilio's built-in address correction.

## 2026-03-18 13:15 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Fixed Twilio "address cannot be validated" error. The `street` field was being sent as the full address string (e.g. "36-42 Henderson Road, Alexandria, New South Wales, Australia") instead of just the street portion ("36-42 Henderson Road"). Now extracts just the first comma-separated segment for the street field. Also fixed the geocoding street override comparison bug (trimmed vs untrimmed mismatch) — when geocoding succeeds, its street always takes priority.
- **Why**: Twilio's `addresses.create` expects `street` to be only the street line. Sending the full address string caused Twilio to reject it as unvalidatable.

## 2026-03-18 13:00 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Fixed `Required parameter "params['isoCountry']" missing` error in Twilio regulatory address creation. The parameter was named `country: "AU"` but Twilio's API requires `isoCountry: "AU"`.
- **Why**: Twilio's `addresses.create` endpoint uses `isoCountry` (ISO 3166-1 alpha-2) as the required parameter name, not `country`.

## 2026-03-18 12:30 (AEDT) – Cursor AI Agent

- **Files changed**: `actions/tracey-onboarding.ts`, `components/onboarding/tracey-onboarding.tsx`, `__tests__/tracey-onboarding-email-preview.test.tsx`, `docs/agent_change_log.md`
- **Summary**: Fixed provisioning reading an empty address from the database. Root cause: provisioning triggered on step 5 entry (via `resolveProvisioning` → `/api/workspace/setup-comms`) but the form data was only written to the DB on final "Activate Tracey" click (later). Added `saveBusinessProfileForProvisioning` server action that persists businessName, physicalAddress, and baseSuburb before the provisioning API fires.
- **Why**: The address was correctly entered in the form UI but never saved to the database before the provisioning code tried to read it, resulting in empty-string address and the "Could not determine the city/locality" error.

## 2026-03-18 12:00 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Fixed server-side geocoding failing due to Google API key having HTTP referrer restrictions. The `geocodeAuAddress` function now sends the app URL (`NEXT_PUBLIC_APP_URL`) as the `Referer` header so the referrer-restricted key works from Vercel serverless functions. Added diagnostic logging throughout `ensureWorkspaceRegulatoryAddress` to trace physicalAddress, baseSuburb, local parse results, geocoding results, and final values. Added a third city-derivation strategy: if regex fails, fall back to the second comma-separated segment of the address. Added error logging for geocoding API failures.
- **Why**: The server-side geocoding was silently failing because the API key has `RefererNotAllowedMapError` restrictions and server-side fetch sends no Referer header by default. Also needed better observability for future debugging.

## 2026-03-18 11:30 (AEDT) – Cursor AI Agent

- **Files changed**: `components/ui/address-autocomplete.tsx`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- **Summary**: Suppressed Google Maps API error watermarks (grey circles with exclamation marks) that were overlaying the address input. Added CSS overrides to hide `gm-err-*` elements, `overflow-hidden` on the wrapper, `z-10` on the input/icons, and a MutationObserver to detect error overlays and fall back to a plain text input. Removed the unnecessary helper text below the address field.
- **Why**: Google Maps API auth/billing issues were injecting error watermarks directly over the address input, making it look broken. The server-side geocoding handles address resolution regardless, so the client-side overlay needed to be suppressed and the component made resilient to Google API failures.

## 2026-03-18 11:00 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `actions/tracey-onboarding.ts`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- **Summary**: Fixed Twilio AU phone provisioning failing for addresses like "36-42 Henderson Road, Alexandria, New South Wales, Australia". Root cause: (1) server-side Zod validation on `physicalAddress` required a regex match for abbreviated state+postcode (e.g. "NSW 2015") which Google's formatted_address often omits; (2) the Google Maps client-side key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) was not set in Vercel, so all client-side Google Places enrichment was silently skipped. Fix: removed the strict regex gate from both client and server validation, added server-side Google Geocoding API fallback in `ensureWorkspaceRegulatoryAddress` to resolve city/state/postcode from free-text addresses, and added full-state-name-to-abbreviation mapping for local parsing.
- **Why**: Users entering or auto-filling addresses via Google autocomplete or website scrape were blocked from completing onboarding because the address string didn't match the narrow regex, even though Google's Geocoding API can resolve the missing components server-side.

## 2026-03-10 (AEST) – Cursor AI Agent

- **Files changed**: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- **Summary**: Voice agent now responds in the caller’s language: user speaks → agent replies in that language. STT uses Deepgram `language: "multi"` and `detectLanguage: true`. Added `MultilingualTTS` wrapper that sets reply language from each user turn’s `ev.language` and uses a Cartesia TTS per language (lazy). Greeting stays in default (en-AU); all subsequent replies use the detected language. LLM instructions updated (normal + Earlymark prompts) to “reply in the same language the caller is speaking.”
- **Why**: To support “user calls → agent says hi → user speaks language → agent responds in said language” without pre-call contact lookup and without adding latency (no extra round-trips; language is taken from the existing STT event).

## 2026-03-17 14:12 (AEDT) - codex

- Files changed:
  - `lib/inbound-lead-email-readiness.ts`
  - `components/settings/email-lead-capture-settings.tsx`
  - `components/onboarding/tracey-onboarding.tsx`
  - `app/admin/ops-status/page.tsx`
  - `__tests__/inbound-lead-email-readiness.test.ts`
  - `__tests__/health-route.test.ts`
  - `__tests__/launch-readiness-route.test.ts`
  - `__tests__/customer-agent-readiness.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Expanded inbound lead-email readiness beyond DNS/provider verification to also report whether real inbound email has actually been received recently, including stage, timestamps, and success/failure counts.
  - Surfaced the new reserved vs verified vs receiving-confirmed states in the ops page, onboarding flow, and workspace email settings so the app stops treating all “configured” email states as equivalent.
  - Extended readiness regression coverage so the new shared email-readiness shape is exercised through the domain checker, launch-readiness mocks, public health mocks, and customer-agent readiness.
- Why:
  - The execution plan requires internal ops to distinguish between “configured on paper” and “proven by live inbound traffic” for email. Without that split, email readiness stayed too binary and operators could not tell whether the route had ever actually worked.

### 2026-03-12 18:54 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/worker-entry.ts`, `livekit-agent/runtime-config.ts`, `livekit-agent/.env.example`, `__tests__/voice-agent-runtime-config.test.ts`, `.github/workflows/deploy-livekit.yml`, `ops/systemd/earlymark-sales-agent.service`, `ops/systemd/earlymark-customer-agent.service`, `ops/systemd/tracey-sales-agent.service`, `ops/systemd/tracey-customer-agent.service`, `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Finalized the OCI worker standardization by moving shared worker host/port and production env rules into a dedicated runtime-config module, making production workers fail fast when required env such as app URL, webhook secret, LiveKit credentials, or `CARTESIA_API_KEY` is missing, removing the production localhost heartbeat fallback, updating the deploy workflow to validate `/opt/earlymark-agent/.env.local`, optionally purge stale PM2 worker processes, install the canonical `earlymark-*` systemd units on every deploy, and remove the legacy `tracey-*` unit files from the repo.
- Why: The remaining risk after the initial systemd cutover was silent drift: a future deploy could still boot with incomplete production env, keep old PM2 processes alive, or leave the repo claiming PM2/tracey were current. This locks the worker path to one deploy model, one supervisor, one env contract, and one log source.

### 2026-03-12 11:48 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/worker-entry.ts`, `lib/voice-agent-runtime.ts`, `.github/workflows/customer-agent-reconcile.yml`, `docs/agent_change_log.md`
- What changed: Moved the worker background bootstrap (grounding refresh, heartbeat loop, runtime-ready flag, and warm cache setup) into a shared path that also runs when the split `sales-agent.ts` and `customer-agent.ts` entrypoints start; aligned the worker-side runtime fingerprint algorithm and tracked env keys with the app-side drift checker; and changed the customer-agent reconcile workflow to print the endpoint response body and HTTP status before failing.
- Why: The split worker entrypoints were no longer posting heartbeats, so the reconcile cron always reported the voice worker as unhealthy, and even restored heartbeats would still have failed the drift check because the worker and app were hashing different runtime fingerprints. The workflow also needed to expose the returned health payload so future failures are diagnosable from the action log.

### 2026-03-12 12:00 (AEDT) - codex
- Files: `app/api/cron/voice-synthetic-probe/route.ts`, `.github/workflows/voice-synthetic-probe.yml`, `docs/agent_change_log.md`
- What changed: Let the synthetic probe route accept optional caller/target number overrides from the authenticated GitHub workflow, removed the slow Twilio-account scan fallback from probe target resolution, and changed the “probe not configured” case to return a fast `degraded`/`skipped` result instead of a hard failure. Updated the workflow to forward any configured probe-number secrets and to treat only that explicit skipped state as non-failing while still failing real unhealthy probe results.
- Why: Production was failing the synthetic-probe action every run because the probe target was not configured in app env, and the route spent over a minute scanning Twilio before returning that misconfiguration as `500`. The monitor should skip cleanly when probe config is absent, while still allowing GitHub to supply the target directly and still failing on genuine routing/probe regressions.

### 2026-03-12 12:19 (AEDT) - codex
- Files: `app/dashboard/layout.tsx`, `app/(dashboard)/layout.tsx`, `components/chatbot/deferred-chat-interface.tsx`, `docs/agent_change_log.md`
- What changed: Moved the `DeferredChatInterface` lazy load into a dedicated client component and updated both dashboard layouts to import that wrapper instead of calling `dynamic(..., { ssr: false })` directly inside the server layouts.
- Why: Next 16/Turbopack rejects `ssr: false` dynamic imports in server components, which was breaking production builds for the dashboard layouts.

### 2026-03-12 16:22 (AEDT) - codex
- Files: `AGENTS.md`, `DEPLOYMENT_CHECKLIST.md`, `.github/workflows/deploy-livekit.yml`, `docs/OCI_SSH_FIREWALL_POSTMORTEM.md`, `docs/agent_change_log.md`
- What changed: Documented the March 12 OCI SSH firewall incident across the canonical infra doc and deployment checklist, added a dedicated postmortem/runbook covering the confirmed public IP, OCI-vs-host-firewall diagnosis, and the exact `iptables` plus `netfilter-persistent` recovery commands, and hardened the LiveKit deploy preflight to log DNS/TCP connectivity checks and explicit OCI/Ubuntu firewall guidance before and after SSH banner retries.
- Why: GitHub Actions deploys were blocked by the Ubuntu host firewall silently dropping SSH even though OCI ingress was open. The repo needed a durable incident record plus clearer workflow diagnostics so future failures point directly at the network layer instead of looking like a packaging or restart problem.

### 2026-03-12 17:05 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `AGENTS.md`, `DEPLOYMENT_CHECKLIST.md`, `docs/OCI_SSH_FIREWALL_POSTMORTEM.md`, `docs/agent_change_log.md`
- What changed: Split the LiveKit deploy preflight into separate transport and runtime phases, changed all remote SSH commands to `bash --noprofile --norc -se`, added an explicit remote runtime bootstrap for `PATH` plus optional `nvm`, and made the workflow print labeled `bash`/`node`/`npm`/`pm2` diagnostics before running deploy logic. Updated the canonical docs and postmortem to reflect the March 12 issue as a two-stage incident: the firewall was the first blocker, but accepted GitHub publickey sessions later proved the remaining failure was in the non-interactive remote shell/runtime path.
- Why: sshd logs showed GitHub Actions could already authenticate and open sessions as `ubuntu`, so the deploy needed to stop blaming transport and become independent of remote dotfiles while surfacing the exact runtime command that fails after login.

### 2026-03-12 18:13 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Recorded the current repo-backed OCI voice topology more precisely: the active GitHub Actions deploy path installs `livekit-agent/**` into `/opt/earlymark-agent`, sources `/opt/earlymark-agent/.env.local`, disables the legacy `tracey-sales-agent` and `tracey-customer-agent` systemd units, and starts PM2 workers named `earlymark-sales-agent` and `earlymark-customer-agent`. Also documented that worker heartbeats target `${NEXT_PUBLIC_APP_URL || APP_URL}/api/internal/voice-agent-status`, with `localhost:3000` only as the non-production fallback when the app URL env is missing.
- Why: OCI troubleshooting had drifted toward a separate `tracey-backend` process and an assumed dedicated monitor daemon on port `3000`. The repo shows the current worker deploy is PM2-based under `/opt/earlymark-agent`, and `ECONNREFUSED 127.0.0.1:3000` points at missing app URL env or an offline main web app, not a distinct voice-only backend service.

### 2026-03-11 20:15 (AEDT) - codex
- Files: `app/api/cron/voice-agent-health/route.ts`, `app/api/cron/voice-monitor-watchdog/route.ts`, `app/api/cron/voice-synthetic-probe/route.ts`, `app/api/delete-user/route.ts`, `app/api/internal/voice-fleet-health/route.ts`, `app/api/webhooks/twilio-voice-gateway/route.ts`, `lib/comms.ts`, `lib/comms-simple.ts`, `lib/ops-monitor-runs.ts`, `lib/production-safety.ts`, `lib/twilio-drift.ts`, `lib/twilio.ts`, `lib/voice-business-invariants.ts`, `lib/voice-incidents.ts`, `lib/voice-monitoring.ts`, `lib/voice-number-metadata.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/20260311_add_ops_monitor_runs/migration.sql`, `.github/workflows/voice-agent-health.yml`, `.github/workflows/voice-monitor-watchdog.yml`, `.github/workflows/voice-synthetic-probe.yml`, `.env.example`, `DEPLOYMENT_CHECKLIST.md`, `docs/agent_change_log.md`
- What changed: Hardened inbound voice against silent failure by making Twilio number drift audits discover and auto-heal managed numbers directly from Twilio, including clearing direct SIP trunk attachment and stale Voice Application routing; added durable managed-number metadata on subaccounts and purchased numbers; added business-invariant checks for orphaned numbers and missing production mappings; persisted scheduled monitor execution state in `OpsMonitorRun`; added a watchdog cron plus a synthetic Earlymark inbound probe; made the voice gateway fail safe to voicemail for unknown/orphaned/disabled/unhealthy routes instead of ever falling through to dead SIP; and blocked the destructive delete-user endpoint plus production Prisma seeding.
- Why: Production inbound voice must never fail silently. This change turns number drift, missing mappings, scheduler stoppage, and broken gateway routing into monitored, self-healing, and alertable failure modes while making voicemail the universal continuity path.

## 2026-03-09 (AEST) – Cursor AI Agent

- **Files changed**: 
  - `components/onboarding/tracey-onboarding.tsx`
  - `components/ui/weekly-hours-editor.tsx`
  - `components/dashboard/dashboard-client.tsx`
  - `components/crm/kanban-board.tsx`
  - `components/dashboard/notifications-btn.tsx`
  - `actions/notification-actions.ts`
  - `lib/digest.ts`
  - `lib/workspace-routing.ts`
  - `actions/chat-actions.ts`
  - `components/chatbot/chat-interface.tsx`
  - `__tests__/chat-interface.test.tsx`
- **Summary**: 
  - Tightened Tracey onboarding copy and wired the physical address field to Google-powered address autocomplete.
  - Refined dashboard kanban layout (white board, column height, padding, and scroll behaviour) to better match the main canvas.
  - Improved in-app notifications: full message text, clickable rows that navigate via `link`, and saner time windows for morning/evening alerts.
  - Introduced shared daily digest helpers for morning/evening briefs and surfaced them as aesthetic modals launched from Tracey chat preview cards.
  - Added mode-aware “Next steps” guidance in the digest modal, and simplified workspace/phone routing helpers to avoid Prisma generic conflicts.
- **Why**: 
  - To make onboarding smoother, kanban usage clearer, and daily summaries (morning brief and evening wrap-up) more actionable and discoverable inside the existing Tracey assistant experience, while keeping TypeScript builds green.

# Agent Change Log

Operational audit log for all AI agent code/config edits.  
Rule: every agent change commit must include an entry in this file.

### 2026-03-17 17:05 (AEDT) - codex
- Files: `lib/voice-spoken-canary.ts`, `lib/voice-monitor-config.ts`, `app/api/cron/voice-synthetic-probe/route.ts`, `app/api/webhooks/twilio-voice-gateway/route.ts`, `lib/launch-readiness.ts`, `app/admin/ops-status/page.tsx`, `.github/workflows/deploy-livekit.yml`, `ops/deploy/livekit-worker-verify.sh`, `.env.example`, `__tests__/voice-spoken-canary.test.ts`, `__tests__/voice-synthetic-probe-route.test.ts`, `__tests__/launch-readiness-route.test.ts`, `docs/voice_operating_brief.md`, `docs/agent_change_log.md`
- What changed: Replaced the old “gateway plus recent sample” synthetic voice probe with a real spoken PSTN canary path. The probe now originates a short Twilio call into the Earlymark inbound number, waits for the call to settle, then verifies that the app persisted a matching `VoiceCall` transcript containing caller and Tracey speech. The Twilio voice gateway now narrowly trusts the configured spoken-probe caller so automated canary calls do not get rate-limited or STIR-rejected, launch-readiness/admin status now expose the canary mode plus the latest probe call SID/status, and the OCI worker deploy verifier actively invokes the spoken canary with ops auth before accepting a release.
- Why: A green gateway check is not enough for mission-critical voice, and a stale probe record is not enough for a post-deploy release gate. We needed the monitor and deploy flow to prove that a real phone call can still reach Tracey through Twilio, LiveKit SIP, the worker, STT, TTS, and transcript persistence, while still reporting clearly when the environment is not yet capable of a true PSTN canary.

### 2026-03-07 00:10 (AEDT) - codex
- Files: `app/page.tsx`, `docs/agent_change_log.md`
- What changed: Restored the intended homepage hero and CRM section wording. The hero now says `Your AI assistant & CRM — here to give you an early mark`, and the CRM section now says `Tracey lives in your CRM. They will contact customers and run your CRM so you don't have to.`
- Why: These were not deployment misses; the older copy was still present in `main`, so production was correctly rendering outdated strings that had drifted back into the repo.

## Entry Template

```md
### YYYY-MM-DD HH:MM (AEST/AEDT) - <agent>
- Files: `path/a`, `path/b`
- What changed: <concise summary>
- Why: <reason / expected outcome>
```

## Entries

### 2026-03-09 22:39 (AEDT) - codex
- Files: `.github/workflows/customer-agent-reconcile.yml`, `docs/agent_change_log.md`, `vercel.json`
- What changed: Removed the Vercel cron definition that was invalid on the Hobby tier and replaced it with a GitHub Actions scheduled workflow that calls the existing protected `customer-agent-reconcile` endpoint every 15 minutes using `CRON_SECRET`.
- Why: The Vercel deploy was being blocked by the paid-tier cron schedule. Moving the same reconciliation job to GitHub Actions keeps the automatic Twilio/worker drift check running on the free Vercel plan without breaking deployments.

### 2026-03-10 15:42 (AEDT) - codex
- Files: `.github/workflows/voice-agent-health.yml`, `docs/agent_change_log.md`, `vercel.json`
- What changed: Removed the remaining Vercel cron entry for `voice-agent-health` and replaced it with a GitHub Actions scheduled workflow that calls the protected `/api/cron/voice-agent-health` endpoint every 5 minutes using `CRON_SECRET`.
- Why: Vercel Hobby/free tier does not support the cron configuration used here. Moving the health monitor to GitHub Actions keeps the voice watchdog running without blocking deployments.

### 2026-03-09 22:25 (AEDT) - codex
- Files: `app/api/check-env/route.ts`, `app/api/cron/customer-agent-reconcile/route.ts`, `app/api/health/route.ts`, `app/api/internal/customer-agent-drift/route.ts`, `app/api/internal/voice-agent-status/route.ts`, `lib/customer-agent-readiness.ts`, `lib/health-check.ts`, `lib/ops-auth.ts`, `lib/twilio-drift.ts`, `lib/voice-agent-runtime.ts`, `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `.github/workflows/deploy-livekit.yml`, `vercel.json`, `docs/agent_change_log.md`
- What changed: Added durable LiveKit worker heartbeats with runtime env fingerprints, surfaced worker drift and Twilio voice-routing drift in health/readiness/check-env, added a protected internal drift-audit/reconcile endpoint, added a Vercel cron self-heal for Twilio inbound voice routing, expanded the worker env example for multi-number inbound config, and made the LiveKit deploy verify that the restarted worker reports the newly deployed SHA back to the app.
- Why: Customer-facing voice and SMS agents were still vulnerable to external config drift in Twilio Console and on the remote LiveKit host. This change moves those failure modes from silent breakage into auditable, self-healing, and deploy-blocking checks so customer calls do not quietly cut over to stale routing or stale worker env.

### 2026-03-09 20:53 (AEDT) - codex
- Files: `actions/agent-tools.ts`, `actions/scraper-actions.ts`, `actions/settings-actions.ts`, `actions/tracey-onboarding.ts`, `actions/workspace-actions.ts`, `components/onboarding/tracey-onboarding.tsx`, `components/settings/call-settings-client.tsx`, `components/ui/weekly-hours-editor.tsx`, `lib/ai/context.ts`, `lib/ai/tools.ts`, `lib/comms-simple.ts`, `lib/working-hours.ts`, `docs/agent_change_log.md`
- What changed: Reworked onboarding and settings hours into a compact weekly-hours editor with a right-aligned uniform-hours toggle, removed the extra onboarding helper/copy-button clutter, added website-plus-Google-Places hours prefilling with structured per-day storage in `workspace.settings`, threaded those weekly hours into availability and AI scheduling context, normalized stale workspace hour defaults, and clarified the Twilio provisioning error so missing credentials are distinguished from later AU compliance failures.
- Why: The old onboarding flow flattened business hours into one range, defaulted toward stale tradie hours, and created UI overload when per-day hours were needed. The updated flow makes scraped business hours more accurate, supports different hours per day cleanly, and makes Twilio onboarding failures easier to diagnose.

### 2026-03-09 19:07 (AEDT) - codex
- Files: `app/api/chat/route.ts`, `livekit-agent/agent.ts`, `livekit-agent/voice-latency.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Fixed web-chat tool result collection to read the current AI SDK `output` field, and added a production-only voice latency path for normal Tracey calls with interim-turn classification, a small parallel guard-model check, a cached opener bank including tightly constrained empathetic openers, and runtime metrics for classifier/guard/opener usage. Updated the agent env example with the new voice-latency and guard-model flags.
- Why: Keep the main app building against the current tool-result API while reducing perceived response-start latency on low-risk production voice turns without enabling unsafe speculative replies for pricing, invoicing, policy, emergency, or firm booking confirmations.

### 2026-03-05 17:25 (AEDT) - cascade
- Files: `app/page.tsx`, `actions/demo-call-action.ts`, `app/api/demo-call/route.ts`, `.env.local`
- What changed: Merged all homepage and onboarding fixes from Cascade project: value pill tick alignment with Check icon, removed Bot icon, wired up real outbound demo calls via LiveKit SIP, added demo call API route, updated environment variables with LiveKit SIP trunk config.
- Why: Sync all changes to main repo and enable outbound demo calls functionality.

### 2026-03-05 16:30 (AEDT) - cascade
- Files: `app/page.tsx`, `actions/demo-call-action.ts`, `app/api/demo-call/route.ts`, `livekit-agent/agent.ts`, `components/onboarding/tracey-onboarding.tsx`, `app/api/auth/email-provider/route.ts`, `app/api/voice-preview/route.ts`
- What changed: Complete homepage and onboarding fixes: value pill tick alignment, removed Bot icon, wired up real outbound demo calls via LiveKit SIP, added 5-min demo cap with sales messaging, restructured Hire Tracey section with zigzag layout and placeholder screenshots, updated features heading to "One platform to run it all", fixed Gmail OAuth env var mismatch, shortened emergency hours text, updated auto-forward instructions, fixed phone provisioning response path, improved voice preview error handling.
- Why: Address all 11 reported UI/UX and functional issues across homepage and onboarding flow.

### 2026-03-05 02:14 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated hero value pills by removing the outer encasing container, restoring dark pill backgrounds with white text, and prepending each phrase with a prominent secondary-color tick icon.
- Why: Match requested hero pill visual style and improve emphasis/readability.

### 2026-03-05 02:13 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated bottom headline copy to `Give yourself an early mark today` with green-highlighted `early mark`; replaced the old `The old way` / `The Tracey way` flow cards with a side-by-side comparison layout matching the reference style, removed emoji labels, renamed RHS heading to `Tracey does it for you`, and inserted the exact requested grouped bullet content for both columns using crosses on the old-way side.
- Why: Match requested copy and transform the comparison section into a cleaner visual format consistent with the provided reference.

### 2026-03-05 02:00 (AEDT) - codex
- Files: `app/page.tsx`, `components/layout/navbar.tsx`
- What changed: Refined hero value pillars to a sleeker integrated strip style and removed numeric markers; set the CRM/interview section to dark grey background for contrast; added bottom CTA headline `Give your self an Earlymark today` with green-highlighted `Earlymark` and applied green ambient glow to that section; normalized top navbar text/button sizing to `text-[15px]` for consistency.
- Why: Improve visual cohesion and contrast across sections while matching requested copy and hierarchy.

### 2026-03-05 01:46 (AEDT) - codex
- Files: `app/page.tsx`, `app/contact/page.tsx`
- What changed: Updated bottom CTA buttons to `Get started` and `Get a demo`; changed `Get a demo` link target to `/contact#contact-form`; added `id="contact-form"` to the contact page form for direct deep-linking.
- Why: Match requested CTA wording and ensure demo CTA opens directly at the contact form.

### 2026-03-05 01:44 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Reworked the "Hire Tracey today" block into a 2-column layout with `Tracey in action` (video/demo) on the left and the 3 feature boxes on the right. Updated the third feature card to title `AI that actually works` and description `AI that handles convos like a human. Tracey learns your preferences and delivers a better and simpler experience.`
- Why: Match requested section structure and exact final card copy.

### 2026-03-05 01:41 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated hero CTA labels to `Get started` and `Interview your assistant` (with interview anchor link), changed CRM section headline copy to remove "for you", added `id=\"interview-assistant\"`, and removed the placeholder platform video block so the section is now LHS text and RHS interview form.
- Why: Match requested CTA wording and restructure the CRM/interview section to text + form only.

### 2026-03-05 01:35 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Replaced center-only hero glow with a reference-style layered background treatment: soft full-section gradient field, lower horizontal green halo, and angled side atmospheric panels to mirror the reference composition in green.
- Why: Match the reference look more closely and avoid the "single center glow" appearance.

### 2026-03-05 01:33 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Reworked hero glow rendering from negative-z blurred circles to an in-section layered radial-gradient glow (`z-0`) and moved hero content to `z-10` with `isolate` to guarantee visibility.
- Why: Fix non-visible ambient glow caused by stacking context; ensure a clearly visible green glow behind hero content.

### 2026-03-05 01:31 (AEDT) - codex
- Files: `components/layout/navbar.tsx`
- What changed: Restored the `Contact us` CTA in the top navbar and linked it to `/contact`.
- Why: Reinstate requested navigation path and ensure the CTA is present and functional.

### 2026-03-05 01:29 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Refined hero value cards for clearer visual hierarchy: added an "Earlymark helps businesses" label, replaced plain `(1)(2)(3)` text markers with numbered badges, applied consistent dark gradient cards, and tightened typography/spacing for better readability.
- Why: Fix poor formatting and produce a cleaner, higher-contrast hero value section aligned with the requested content.

### 2026-03-05 01:25 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Removed the hero paragraph text, moved the three dark labelled value boxes `(1)(2)(3)` directly beneath the hero heading, and significantly amplified the green ambient radial glow with three stronger layered glows.
- Why: Match requested hero hierarchy and make the green glow unmistakably visible.

### 2026-03-05 01:17 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated hero visuals by increasing a clearly green ambient radial glow and replaced the existing value pillar cards with three dark horizontal boxes labelled `(1)`, `(2)`, `(3)` containing the exact requested lines.
- Why: Match the requested hero design direction and restore the original messaging structure in a stronger, higher-contrast format.

### 2026-03-05 01:16 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`, `.husky/pre-commit`, `scripts/check-agent-change-log.mjs`
- What changed: Added a mandatory agent logging policy and a pre-commit gate that requires `docs/agent_change_log.md` to be staged whenever code/config files are staged.
- Why: Enforce a reliable audit trail so agent-made edits are always documented.

### 2026-03-06 11:35 (AEDT) - codex
- Files: `actions/tracey-onboarding.ts`, `app/api/demo-call/route.ts`, `app/api/workspace/setup-comms/route.ts`, `app/page.tsx`, `components/onboarding/tracey-onboarding.tsx`, `livekit-agent/agent.ts`, `lib/comms-provision.ts`, `public/favicon.ico`, `public/latest-logo.png`, `public/logo-photo.svg`, `public/EA logo 260305.png`, `.windsurfrule`, `dev-server.log`
- What changed: Included all pending local updates in one commit: onboarding flow fixes (including phone provisioning fallback and UI updates), homepage hero selling-point layout refactor, voice-agent runtime tuning and metrics audit logging, plus local asset/config/log file changes.
- Why: User requested pushing every local change exactly as currently present, including changes not made by the agent.

### 2026-03-06 12:05 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `livekit-agent/agent.ts`
- What changed: Finalized onboarding to 6 steps by removing the separate "Try Tracey" step, keeping sneak peek tied directly to selected top mode, restoring Windsurf UI refinements (progress arrows, stronger Tracey bubble contrast, horizontal mode cards), and adding a one-attempt guard to eager phone provisioning to stop repeat API loops after timeout/failure. Added stricter voice-turn filtering to drop low-signal transcripts and increased interruption-word threshold to reduce silence/noise-triggered follow-up speech.
- Why: Align onboarding behavior with approved UX and prevent both phone provisioning loop retries and silence-triggered filler responses in voice calls.

### 2026-03-06 15:06 (AEDT) - codex
- Files: `livekit-agent/agent.ts`
- What changed: Restored Earlymark-specific demo and inbound-sales call handling in the voice agent, added proactive lead-capture guidance and `log_lead` tool usage, introduced stronger truthfulness rules that explicitly forbid claiming existing-CRM integrations, and added goodbye detection with a delayed hangup so Tracey does not resume with a post-call summary after the caller says bye.
- Why: Fix the latest demo-call regressions around sales behaviour, hallucinated CRM claims, and failure to end the call cleanly after the conversation is over.

### 2026-03-06 15:28 (AEDT) - codex
- Files: `prisma/schema.prisma`, `prisma/migrations/20260306_add_voice_call_logs/migration.sql`, `app/api/internal/voice-calls/route.ts`, `actions/voice-call-actions.ts`, `components/settings/recent-voice-calls.tsx`, `app/dashboard/settings/call-settings/page.tsx`, `livekit-agent/agent.ts`
- What changed: Added a persisted `VoiceCall` store with migration and DB sync, created an internal webhook route for the LiveKit worker to save transcripts and latency audits, surfaced recent workspace call logs in call settings, and split the worker more cleanly across the three Tracey identities by distinguishing interview-form demos, inbound Earlymark sales calls, and normal customer-workspace calls.
- Why: Make the latest calls queryable from the app instead of only from worker stdout, and restore the intended three-use-case identity model for Tracey.

### 2026-03-06 15:40 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Added canonical OCI and LiveKit deployment context for future agents, including the Oracle Ubuntu host, Docker-only orchestration model, container names, restart policy, SIP log command, `/etc/livekit.yaml` location, local LiveKit URL, TURN and RTC ports, Twilio trunk ID, SIP dispatch rule, and inbound media/firewall assumptions.
- Why: Stop future agents from making incorrect assumptions about how the LiveKit worker is deployed, how inbound SIP routing works, and where to inspect real runtime logs.

### 2026-03-06 15:47 (AEDT) - codex
- Files: `prisma/migrations/20260306_add_voice_call_logs/migration.sql`
- What changed: Made the `VoiceCall` migration idempotent by switching table and index creation to `IF NOT EXISTS` and guarding foreign-key creation with `pg_constraint` checks.
- Why: Recover from environments where the `VoiceCall` table already exists because schema changes were applied before `prisma migrate deploy` reached this migration.

### 2026-03-06 16:05 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`
- What changed: Added a GitHub Actions workflow that triggers on `main` pushes affecting `livekit-agent/**` and deploys the LiveKit agent over SSH by pulling the repo and rebuilding the Docker Compose stack on the target host.
- Why: Automate LiveKit agent deployment so worker updates do not rely on manual SSH redeploy steps after every push.

### 2026-03-06 16:08 (AEDT) - codex
- Files: `livekit-agent/README.md`
- What changed: Appended a one-line README change to intentionally touch `livekit-agent/**` and trigger the new automated deploy workflow on `main`.
- Why: Validate that the GitHub Actions-based LiveKit deployment path is firing from a real repository push.

### 2026-03-06 16:54 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `AGENTS.md`, `livekit-agent/package.json`, `livekit-agent/package-lock.json`
- What changed: Replaced the broken SSH deploy workflow that assumed `/opt/livekit-agent` was a git checkout with a checkout + SCP + remote restart flow that copies `livekit-agent/**` into `/tmp/livekit-agent`, runs `npm ci`, and restarts the actual `tsx agent.ts start` process with PID-based health verification. Also corrected the canonical infra doc to match the real OCI layout and log locations, and added the missing `dotenv` runtime dependency required by `livekit-agent/agent.ts`.
- Why: The production server does not deploy the worker from `/opt/livekit-agent` or from Docker Compose, and the repo’s agent package manifest was incomplete. Without matching the real `/tmp/livekit-agent` runtime and its actual dependencies, pushes to `livekit-agent/**` would not update the active voice agent reliably.

### 2026-03-06 17:03 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`
- What changed: Removed the fallback `pkill -f /tmp/livekit-agent/agent.ts` from the LiveKit deploy workflow and left restart control to the tracked PID file, with a short post-kill pause before starting the new worker.
- Why: The broad `pkill -f` pattern was matching the SSH action's own remote script command line and terminating the deploy session with exit code `143`, causing false workflow failures during agent restarts.

### 2026-03-06 17:09 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `livekit-agent/agent.ts`, `AGENTS.md`
- What changed: Switched LiveKit deploy packaging from a handpicked file list to a tarball of the full `livekit-agent` directory excluding local env files and `node_modules`, updated the remote deploy to replace the staged directory while preserving `.env.local`, and added an `[agent-version]` startup log that includes the pushed Git SHA so the workflow can verify the exact deployed revision from `/tmp/agent.log`.
- Why: Handpicked file copying was fragile and could miss future runtime files. Adding a startup SHA marker makes it possible to prove the OCI worker is running the same commit that GitHub Actions deployed.

### 2026-03-06 17:20 (AEDT) - codex
- Files: `livekit-agent/agent.ts`
- What changed: Restored the demo call to a two-step opener by making the initial identity check a standalone session.say() line, updated the demo prompt so the LLM waits for the caller before introducing Tracey from Earlymark AI, reintroduced explicit SIP track subscription logging, and removed the participant-identity input filter from the session start path.
- Why: The latest demo call combined the opener into one line and never produced any caller transcript events. Earlier working versions used explicit track subscription plus a wait-for-response greeting flow, which is the correct pattern for these SIP demo calls.

### 2026-03-06 17:31 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Recorded new canonical voice-agent regression guardrails from the latest demo-call review: keep the two-step demo opener, keep Australian delivery for the full call, treat demo `llmTtftMs` above roughly `1200ms` as a regression, keep early demo replies short to avoid talk-over, avoid premature `log_lead` calls after identity confirmation only, and preserve explicit SIP track subscription diagnostics.
- Why: The March 6, 2026 follow-up demo call showed two regressions despite restored caller-audio capture: accent drift as the call continued and enough response latency to cause repeated interruption/talk-over. These need to remain explicit so future agent edits do not regress the same behavior again.


### 2026-03-06 17:43 (AEDT) - codex
- Files: livekit-agent/agent.ts, docs/agent_change_log.md`r
- What changed: Tightened the Earlymark demo and inbound prompts to keep replies under roughly 18 words, enforce simple punchy Australian phrasing, and avoid premature lead logging. Also lowered LLM variability with VOICE_LLM_TEMPERATURE default 0.2, capped completions with VOICE_LLM_MAX_COMPLETION_TOKENS default 80, made optional lead-tool fields tolerant of missing business type / interest level, and reduced the default Cartesia chunk timeout to 1500ms.
- Why: The latest demo call showed accent drift, overlong replies, invalid early log_lead calls, and enough reply duration to create talk-over. These changes aim to reduce TTS workload immediately while keeping the current DeepInfra path stable until Groq is adopted directly.


### 2026-03-06 17:53 (AEDT) - codex
- Files: livekit-agent/agent.ts, docs/agent_change_log.md`r
- What changed: Refined the inbound_demo prompt so Tracey clearly acts as Earlymark AI's lead-qualification assistant rather than a receptionist for the caller's business, emphasised that this flow should mirror the interview-form demo except that inbound calls require more proactive contact-detail capture, and toned down the Australian styling to avoid forced slang. Also simplified the inbound greeting and Earlymark goodbye copy to remove heavier dialect cues.
- Why: The inbound demo requirements are different from normal customer-assistant calls. The current wording was causing Tracey to lean toward the wrong identity and sound overly Australian instead of natural.

### 2026-03-06 17:58 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Adjusted the shared and Earlymark-specific style instructions so `G'day` is allowed again when it sounds natural and is pronounced correctly, while still discouraging forced or exaggerated slang.
- Why: `G'day` itself is acceptable. The actual quality bar is natural delivery, not banning the phrase outright.

### 2026-03-06 18:48 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Replaced raw backticks around "G'day" inside template-string prompts with plain quotes so the TypeScript source remains valid when deployed to the LiveKit worker.
- Why: The prior wording introduced an esbuild parse error during GitHub Actions deploy (`Expected ";" but found "G"`), which prevented the worker from starting on the OCI server.

### 2026-03-06 19:06 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Fixed inbound-call classification so rooms named like `earlymark-inbound-*` or `inbound_*` route to `inbound_demo` even if phone-number env matching is incomplete, replaced the static normal-call prompt with a business-aware prompt that introduces Tracey as "an AI assistant for [business]", and added explicit truthfulness rules across the relevant prompts that she is never a real person.
- Why: The latest inbound call was incorrectly treated as `normal`, which put Tracey in the wrong role. That same call also showed an unacceptable hallucination where she claimed to be a real person. The correct identity needs to hold for inbound Earlymark sales calls and for customer-assistant calls alike.


### 2026-03-06 19:17 (AEDT) - codex
- Files: livekit-agent/agent.ts, docs/agent_change_log.md`r
- What changed: Updated the inbound_demo sales prompt so explicit buying intent now overrides discovery. When a caller says they are ready to sign up or asks how to proceed, Tracey should switch into closing mode: confirm intent, point them to earlymark.ai, collect the missing lead details needed for follow-up/onboarding, and only then offer manager follow-up if useful.
- Why: The latest inbound demo call showed that Tracey still prioritised pain-point discovery over closing the inbound lead, even after the caller clearly said they were ready to sign up. That behavior loses momentum and works against the goal of converting inbound demand.

### 2026-03-06 19:26 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Removed raw backticks around the `earlymark.ai` website reference inside the inbound prompt string so the deployed worker source remains syntactically valid.
- Why: The prior prompt edit introduced another OCI worker parse failure, which stopped Tracey from starting and therefore from answering inbound calls.

### 2026-03-06 19:35 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Added a canonical voice-debug start rule requiring future sessions to read `AGENTS.md` and inspect the latest `/tmp/agent.log` latency and track markers before making further voice-agent changes. Also recorded inbound latency regression thresholds around `llmTtftMs > 1200` and `ttsTtfbMs > 900`.
- Why: Recent inbound-call debugging repeatedly depended on log evidence rather than prompt inspection alone. The operational baseline needs to be explicit so future sessions start from the measured bottleneck instead of re-learning the same process.

### 2026-03-06 20:05 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Switched Earlymark demo and inbound calls to prefer Groq whenever a Groq API key is present, shortened and simplified the inbound sales prompt to reduce prompt-token load, tightened Earlymark completion limits and temperature defaults, and lowered inbound interruption gating so one-word phone interjections can cut in sooner. Documented the new Groq and inbound-tuning env vars in the agent example env file.
- Why: The latest inbound-call logs showed that STT was not the bottleneck; the main delay was LLM start time, with overly long replies then inflating TTS duration. These changes reduce first-turn LLM overhead and reply length without adding canned response shortcuts.

### 2026-03-06 20:14 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Changed the LLM provider selection so all Tracey modes use Groq directly whenever `GROQ_API_KEY` is present, with DeepInfra only as the no-Groq fallback. Updated the env example comment to reflect that Groq is now the preferred path for every voice call, not just Earlymark demos.
- Why: The intended operating rule is now global: if Groq is available, the voice agent should take the faster direct Groq route across all personas instead of only some call types.

### 2026-03-06 20:22 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Added a fallback rule across all three Tracey prompt variants: if Tracey is not confident she can help correctly, she should make up to 2 honest attempts to help first, then say she will pass it to her manager so they can get back to the caller ASAP. The rule still forbids inventing unsupported facts or capabilities.
- Why: This needs to be consistent across Earlymark demo, Earlymark inbound, and customer-assistant calls. The agent should try to help instead of escalating too quickly, but it still needs a clean fallback before uncertainty turns into hallucination.

### 2026-03-06 20:28 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Refined the fallback flow across all three Tracey prompt variants so manager escalation is offered rather than assumed. After up to 2 honest attempts to help, Tracey should offer to pass it to the manager, and only wrap up once the caller agrees.
- Why: The escalation should stay collaborative. The caller needs to consent to the manager handoff instead of having the call prematurely closed for them.

### 2026-03-06 20:36 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Updated the inbound Earlymark greeting to "Hi, this is Tracey from Earlymark AI. How can I help?", made it explicit across all three Tracey prompt variants that if asked whether she is AI she must always say yes, and pinned the Cartesia TTS model directly to `sonic-3` instead of allowing env drift.
- Why: The inbound opening needed to be shorter and match the requested wording exactly. AI identity should never be ambiguous, and the TTS path should stay locked to the required Cartesia Sonic 3 model.

### 2026-03-06 20:49 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Tightened the Earlymark demo and inbound prompts so replies stay one-sentence and shorter, explicitly require answering the caller's question before steering toward the sale, forbid repeating the Tracey/AI intro after it has already been established, forbid spoken tool-call text, and forbid end-of-call summaries across all three Tracey modes. Updated goodbye lines so only the Earlymark demo and inbound modes point callers to `earlymark.ai` to find out more, shortened the wrap-up scripts to avoid recap behavior, and lowered Earlymark completion-token defaults to `40` with inbound set to `32`.
- Why: The latest inbound and demo calls showed the remaining latency is driven by TTS duration and occasional long or redundant phrasing. They also exposed real behavior regressions: repeated self-introductions, premature website-only CTAs, spoken tool syntax, and call-detail summaries that should never happen.

### 2026-03-06 21:18 (AEDT) - codex
- Files: `actions/workspace-actions.ts`, `actions/tracey-onboarding.ts`, `app/api/workspace/setup-comms/route.ts`, `components/onboarding/tracey-onboarding.tsx`, `lib/comms.ts`, `lib/comms-simple.ts`, `lib/welcome-sms.ts`, `.env.example`, `docs/agent_change_log.md`
- What changed: Reworked paid-user onboarding so the signed-in owner is upserted into the app `User` table by email before onboarding writes proceed, which removes the duplicate-email crash on `Activate Tracey`. Split final-step comms setup into a deterministic provisioning state with `already_provisioned`, `provisioned`, `failed`, and `ready` outcomes, blocked activation until a visible phone number exists, and surfaced retry handling instead of the old looping spinner. Reshuffled onboarding fields so step 1 collects owner details plus website URL, step 3 collects business name and physical address, removed visible suburb-only UX, added auth-based email/name prefill, and restored an optional team-invite section on the final step. Added an idempotent welcome-SMS helper that sends from the provisioned number after activation and stores handbook-link metadata, plus the `TRACEY_HANDBOOK_URL` env placeholder.
- Why: The onboarding flow was broken in multiple ways at once: Google sign-in data was not prefilled, the last step could loop forever without resolving a number, completion could happen before provisioning was actually ready, and activation could crash on a duplicate Prisma `User.email` path. The new flow makes activation deterministic and keeps payment-to-live onboarding aligned with the provisioned number requirement.

### 2026-03-06 23:55 (AEDT) - codex
- Files: `actions/billing-actions.ts`, `actions/workspace-actions.ts`, `app/billing/page.tsx`, `components/billing/upgrade-button.tsx`, `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `lib/comms.ts`, `lib/comms-simple.ts`, `lib/onboarding-provision.ts`
- What changed: Added a temporary beta-only billing gate for Twilio provisioning by requiring users to enable a `Provision mobile business number` toggle on the billing page before checkout. Persisted that intent in workspace settings before redirecting to Stripe, then centralized provisioning enforcement so only paid workspaces with a pre-authorized request can provision. The shared provisioning helper now tracks explicit provisioning states, blocks duplicate provisioning across beta workspaces that share the same owner phone, and records duplicate diagnostics for support. Twilio number purchase is now mobile-only in both the full and simple provisioning paths, removing the old local-number fallback. Also upgraded Kanban to support true checkbox-style multi-select so selected card sets can drive bulk CRM chat actions instead of only the single currently opened deal.
- Why: Beta needs a hard cost-control gate before Stripe checkout, stronger protection against accidental duplicate number purchases during onboarding/redeploys, and a consistent mobile-number-only tenancy model. The CRM chatbot also needed a real selected-card set in Kanban so bulk actions can operate on explicit user-selected jobs.

### 2026-03-06 23:20 (AEDT) - codex
- Files: `actions/chat-actions.ts`, `app/api/chat/route.ts`, `app/dashboard/schedule/schedule-calendar.tsx`, `components/chatbot/chat-interface.tsx`, `components/crm/activity-feed.tsx`, `components/crm/kanban-board.tsx`, `components/onboarding/tracey-onboarding.tsx`, `actions/scraper-actions.ts`, `lib/ai/tools.ts`, `lib/crm-selection.ts`, `docs/agent_change_log.md`
- What changed: Added invoice editing and voiding tools so the CRM chatbot can update invoice numbers, line items, totals, and issued dates, then void eligible draft/issued invoices without relying on a second invoice system. Wired current CRM deal selection into chat via a small browser event contract so selected deals from Kanban, schedule, and activity views can flow into the chat API and be referenced when the user says "these" or "selected" during bulk CRM actions. Improved onboarding address smart-fill by falling back from scraped full address to suburb/location signals and summary text, and tightened the scraper prompt so it returns a best available base location when a street address is missing.
- Why: The remaining deployment/product gaps were invoice edit coverage, natural bulk-action scope from the current UI selection, and a brittle onboarding autofill path that only worked when the scraper found one exact address field.

### 2026-03-06 22:05 (AEDT) - codex
- Files: `app/api/webhooks/stripe/route.ts`, `app/billing/success/page.tsx`, `app/api/workspace/setup-comms/route.ts`, `actions/settings-actions.ts`, `components/settings/call-forwarding-card.tsx`, `lib/onboarding-provision.ts`, `lib/call-forwarding.ts`, `docs/agent_change_log.md`
- What changed: Added shared onboarding-provision orchestration so Tracey's number provisioning is triggered and timed as soon as Stripe payment succeeds, then reused the same helper on the last onboarding step as a visibility check. Logged elapsed provisioning times and outcomes for webhook, billing-success, and onboarding resolution paths. Built the customer-facing call-forwarding setup flow into account settings: the existing call-forwarding toggle now stores carrier/mode/delay settings, defaults backup forwarding to 15 seconds for an "after about 3 rings" setup, sends a setup SMS from the provisioned Tracey number to the owner's personal phone when forwarding is enabled, and exposes one-tap dialer links plus resend/setup guidance in the settings card.
- Why: Provisioning should start from the moment the customer pays, not only when they reach the last onboarding page. The app also needed a real call-forwarding activation path because the core promise is that callers get picked up by Tracey on the provisioned number once the user enables forwarding from their mobile.

### 2026-03-06 22:12 (AEDT) - codex
- Files: `actions/settings-actions.ts`, `components/settings/call-forwarding-card.tsx`, `lib/call-forwarding.ts`, `docs/agent_change_log.md`
- What changed: Lowered the default backup call-forwarding timeout from 15 seconds to 12 seconds across stored settings defaults, generated forwarding codes, and account-settings setup copy.
- Why: The requested default is a faster backup pickup so Tracey answers sooner when the user misses the call.

### 2026-03-06 22:27 (AEDT) - codex
- Files: `AGENTS.md`, `actions/chat-actions.ts`, `app/api/internal/voice-context/route.ts`, `docs/agent_change_log.md`, `lib/agent-mode.ts`, `lib/ai/context.ts`, `lib/ai/tools.ts`, `livekit-agent/agent.ts`
- What changed: Added a canonical customer-contact mode helper that normalizes legacy stored values into the exact business terms `execute`, `review & approve`, and `info only`. Updated the shared assistant context so those modes now apply only to `Tracey for users` customer-facing calls, texts, emails, and follow-up, while internal CRM chatbot operations stay unrestricted. Enforced that policy in the CRM chatbot's customer-contact tools by allowing `sendSms`, `sendEmail`, and `makeCall` only in execute mode, drafting instead in review & approve mode, and blocking them in info only mode. Added a secured internal voice-context route plus shared workspace voice grounding, then updated the LiveKit worker so `Tracey for users` fetches compact business grounding, uses lookup tools for services, pricing, business details, and no-go rules, and follows the same customer-contact mode policy on calls that already governs texts.
- Why: The repository needed a clear separation between the 4 assistant surfaces (`Tracey interview form`, `Tracey inbound call`, `Tracey for users`, `CRM chatbot`) and a single canonical mode policy for customer-facing automation. Without that split, the CRM chatbot prompt was over-applying mode restrictions to internal CRM work, and voice `Tracey for users` was still operating from a thin generic prompt instead of the same business truth model used elsewhere.

### 2026-03-06 22:55 (AEDT) - codex
- Files: `app/dashboard/settings/agent/page.tsx`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Cleaned up the remaining UI terminology and onboarding copy to match the canonical assistant model. The settings screen now shows the exact mode names `Execute`, `Review & approve`, and `Info only` while keeping the legacy stored enum values underneath. Onboarding copy now avoids scrape-first wording, uses the exact inbox mode label `Review & approve`, and softens the final-step number setup copy so it reflects a deterministic setup state instead of an endless provisioning loop.
- Why: The backend smart-agent work established the correct policy and taxonomy, but the UI still exposed legacy mode names and scrape/provisioning language that no longer matched the actual flow.

### 2026-03-06 22:02 (AEDT) - codex
- Files: `actions/chat-actions.ts`, `docs/agent_change_log.md`, `lib/ai/tools.ts`
- What changed: Expanded the CRM chatbot's explicit tool surface with safe CRM operations that already have backing server logic: updating deal fields, updating contact fields, completing tasks by title, deleting tasks by title, and listing recent CRM changes/activity. These were added as dedicated chatbot tools instead of relying on the model to improvise broad CRM mutations.
- Why: The next platform gap after onboarding was deeper, explicit CRM control for the chatbot. This tranche improves real operational coverage without making the assistant unrestricted or bypassing the existing customer-contact mode enforcement.

### 2026-03-06 22:12 (AEDT) - codex
- Files: `actions/chat-actions.ts`, `docs/agent_change_log.md`, `lib/ai/tools.ts`
- What changed: Added the next CRM-chatbot operations tranche. Bulk tools now support explicit-ID deal selection for bulk stage moves, bulk assignment, bulk disposition changes, and bulk reminder creation with per-item success/skip/block summaries. Added targeted reverse tools for reverting a recorded deal stage move, unassigning a deal, restoring a lost/deleted/archived deal, and reversing invoice status transitions to valid prior states. Added invoice tools for creating a draft invoice from a deal, issuing an invoice, marking an invoice paid, sending invoice reminders through the existing customer-contact mode guard, and showing invoice plus accounting-sync status.
- Why: The chatbot needed practical high-leverage CRM control beyond single-record edits while staying explicit and reversible. This tranche follows the agreed design: deals-first bulk actions, targeted reversals instead of magical rollback, and invoice operations centered on draft/issue/paid/remind/status rather than full invoice editing.

### 2026-03-07 00:18 (AEDT) - codex
- Files: `app/page.tsx`, `actions/tracey-onboarding.ts`, `components/onboarding/tracey-onboarding.tsx`, `lib/onboarding-provision.ts`, `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Restored the homepage from the last accepted `Hire Tracey today` layout by bringing back the centered chat demo plus zigzag feature-card section, kept the approved hero heading copy, kept the CRM pronoun fix (`They`), and removed the interview-form header icon again. Removed the direct Twilio provisioning path from onboarding activation so onboarding now resolves numbers only through the centralized billing-gated provisioning helper, added a dedicated `onboarding-activation` trigger source, and expanded onboarding UI state handling to surface `requested`, `not_requested`, and `blocked_duplicate` instead of flattening those outcomes into generic failure. Added a critical-surface regression rule to `AGENTS.md` covering homepage restores and centralized provisioning.
- Why: The repo had regressed into a mixed homepage state after a later whole-file overwrite, and onboarding could still bypass the beta provisioning gate and duplicate-number protection by provisioning directly during activation. This change restores the accepted homepage baseline and closes the duplicate provisioning path so billing, onboarding, and provisioning all obey the same source of truth.

### 2026-03-07 00:34 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Added a hard next-step guard to the onboarding wizard so the step-advance click path re-checks validation before moving forward, instead of relying only on the button's disabled state.
- Why: Step 1 should never advance without the required website URL, even if the UI button state is bypassed by a browser quirk or unexpected interaction path.

### 2026-03-07 00:41 (AEDT) - codex
- Files: `actions/tracey-onboarding.ts`, `components/onboarding/setup-chat.tsx`, `docs/agent_change_log.md`
- What changed: Removed the unused legacy chat-style onboarding component from the repo and updated the active onboarding completion path so it writes `provisioned` instead of the shadow `ready` provisioning state after successful activation.
- Why: The legacy setup-chat path was stale onboarding surface area that could be reintroduced accidentally later, and the extra `ready` state created unnecessary drift from the centralized provisioning state model.

### 2026-03-07 00:44 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Relaxed step 1 onboarding validation so users can continue without a website URL while still requiring owner name, phone, and email.
- Why: The onboarding copy already presents the website as optional, so blocking the step on a blank website field was inconsistent with the intended flow.

### 2026-03-07 00:49 (AEDT) - codex
- Files: `actions/tracey-onboarding.ts`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Allowed the active onboarding flow to complete when provisioning status is `not_requested`, while keeping duplicate blocks, queued payment states, and real provisioning failures gated. The final step now permits activation without a number only in that one billing-toggle-missed case and updates the post-activation messaging accordingly.
- Why: A paid workspace that missed the temporary billing toggle should still be able to finish onboarding instead of being trapped at the last step. The dedicated number can be provisioned later from billing or settings without blocking initial setup.

### 2026-03-07 00:56 (AEDT) - codex
- Files: `app/api/auth/google-signin/callback/route.ts`, `app/onboarding/page.tsx`, `docs/agent_change_log.md`
- What changed: Fixed auth routing so Google sign-in now defaults back to `/auth/next` instead of bypassing the billing gate and dropping users straight into setup. Also changed the stale `/onboarding` page to redirect into `/auth/next` so there is no direct onboarding entrypoint that can skip the Stripe-before-onboarding flow.
- Why: The intended flow is auth -> billing -> setup -> dashboard. These two routes were still capable of sending users to onboarding before payment, which is why signup could appear to skip Stripe.

### 2026-03-07 01:02 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Adjusted the onboarding progress stepper so the connector arrows align to the centerline of the step circles rather than the combined circle-plus-label block, and made completed/current steps clickable so users can jump back directly from the progress bar.
- Why: The previous stepper alignment was visually off, and users needed a faster way to return to earlier onboarding steps without repeatedly using the back button.

### 2026-03-07 01:16 (AEDT) - codex
- Files: `components/billing/upgrade-button.tsx`, `actions/billing-actions.ts`, `docs/agent_change_log.md`
- What changed: Removed the temporary beta hard-stop that blocked Stripe checkout when mobile-number provisioning was turned off. Billing now always allows checkout, records the actual provisioning choice on the workspace, and writes `requested` or `not_requested` into the shared provisioning state model before redirecting to Stripe.
- Why: During beta, users who do not opt into phone provisioning still need to be able to pay and complete onboarding. The toggle should only control later Twilio provisioning eligibility, not access to payment itself.

### 2026-03-07 11:06 (AEDT) - codex
- Files: `components/ui/address-autocomplete.tsx`, `components/map/google-map-view.tsx`, `docs/agent_change_log.md`
- What changed: Added graceful fallback handling for Google Maps auth/key failures. Address autocomplete now drops back to a plain text input if the Maps script fails or triggers `gm_authFailure`, and the dashboard Google map now switches itself to the existing Leaflet fallback for the same failure class.
- Why: Misconfigured Google Maps keys or billing should not block job creation or leave the dashboard map stuck on Google's branded error overlay. The app needs to continue functioning even when Maps is unavailable.

### 2026-03-07 11:13 (AEDT) - codex
- Files: `lib/ai/context.ts`, `lib/ai/sms-agent.ts`, `lib/ai/email-agent.ts`, `docs/agent_change_log.md`
- What changed: Updated the shared pricing guidance so call-out fees are treated as customer-facing context only, not reminders for the business owner. Added the universal rule that the call-out fee does not apply when the technician attends and successfully fixes the issue, and aligned chat/SMS/email phrasing to explain that clearly when relevant.
- Why: The assistant was using awkward internal-facing call-out-fee language and was missing the universal waiver rule for successful on-site fixes.

### 2026-03-07 11:17 (AEDT) - codex
- Files: `app/api/chat/route.ts`, `docs/agent_change_log.md`
- What changed: Tightened the CRM chatbot prompt so when `showJobDraftForConfirmation` renders a job draft card, the assistant must not repeat the draft details, call-out fee, or a second confirmation line underneath it.
- Why: The card already contains the draft summary, so repeating the same details in plain text made the response noisy and redundant.

### 2026-03-07 11:24 (AEDT) - codex
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: Changed Kanban multi-select into an explicit selection mode triggered by long-pressing a card. Selection checkboxes now appear only in that mode, sit in the top-right corner, and only displace the top-right date/badge stack instead of shifting the rest of the card layout.
- Why: The always-visible checkbox was cluttering every card and disrupting the layout. Selection mode should be intentional and preserve the default card formatting.

### 2026-03-07 11:31 (AEDT) - codex
- Files: `components/dashboard/header.tsx`, `components/dashboard/dashboard-client.tsx`, `docs/agent_change_log.md`
- What changed: Replaced the separate dashboard activity card with a compact activity icon button in the header, positioned beside the notifications bell. Clicking it opens the existing recent-activity modal.
- Why: The activity affordance should behave like a lightweight header action, not occupy a full homepage card and compete with the KPI row layout.

- Follow-up: Wired the new shared `onOpenActivity` header prop through the other dashboard variants with no-op handlers so the shared header stays type-safe without altering non-homepage behavior.

### 2026-03-07 11:38 (AEDT) - codex
- Files: `components/crm/inbox-view.tsx`, `docs/agent_change_log.md`
- What changed: Fixed Inbox `Ask Tracey` so it now sends the selected contact context plus the user's actual instruction to the chat API, instead of force-wrapping every request as an outbound SMS command.
- Why: CRM-edit requests like “add his email to the file” were being misrouted into the `sendSms` path, so Tracey said it was handling a message but never updated the contact record.

### 2026-03-07 11:46 (AEDT) - codex
- Files: `components/crm/inbox-view.tsx`, `docs/agent_change_log.md`
- What changed: Replaced the inbox left-panel lead/existing/all segmented control with two dropdown filters: customer type and date. Added latest/oldest sorting plus a custom time-period dialog with start/end dates and an explicit Apply action.
- Why: The inbox needed more flexible filtering and sorting than the old 3-button customer-type toggle could provide.

### 2026-03-07 11:52 (AEDT) - codex
- Files: `app/page.tsx`, `docs/agent_change_log.md`
- What changed: Added centered icons above each of the three homepage hero value messages while keeping the approved copy and overall hero layout intact.
- Why: The hero benefits needed a stronger visual anchor so each message reads as a distinct value pillar instead of plain text alone.

### 2026-03-07 12:02 (AEDT) - codex
- Files: `README.md`, `DEPLOYMENT_CHECKLIST.md`, `APP_MANUAL.md`, `docs/agent_change_log.md`
- What changed: Rewrote the top-level product and deployment docs to reflect the current Earlymark app instead of older Pj Buddy / Retell-era behavior. Updated the docs to cover the current assistant taxonomy, billing-before-onboarding flow, beta phone-provisioning rule, Twilio workspace-number model, LiveKit voice stack, and the current split between web-app deploys and voice-worker deploys.
- Why: The repo’s primary docs had drifted badly from the live product and were misleading about the current product name, onboarding flow, voice stack, and deployment model.

### 2026-03-07 12:08 (AEDT) - codex
- Files: `actions/storage-actions.ts`, `docs/agent_change_log.md`
- What changed: Switched the server-side Supabase Storage helper from the public anon client to the admin service-role client when generating signed upload URLs and public URLs.
- Why: Settings document uploads were still failing with `new row violates row-level security policy` because the upload-token server action was creating signed upload URLs under anonymous Storage permissions instead of server-side admin context.

### 2026-03-07 12:13 (AEDT) - codex
- Files: `actions/storage-actions.ts`, `docs/agent_change_log.md`
- What changed: Added automatic storage-bucket existence checks and admin-side bucket creation before generating signed upload URLs or public URLs.
- Why: Document uploads were still failing with `The related resource does not exist`, which indicates the target Supabase Storage bucket was missing. The server helper now self-heals that setup gap instead of failing at runtime.

### 2026-03-07 12:19 (AEDT) - codex
- Files: `actions/onboarding-actions.ts`, `components/dashboard/setup-widget.tsx`, `docs/agent_change_log.md`
- What changed: Added a close button to the dashboard setup banner and made its dismissal behavior signup-age aware. During the first week after signup, dismissing the banner only hides it temporarily and it can reappear later; after that, dismissal stays hidden on the current browser.
- Why: Users need to be able to close the setup banner, but it should keep resurfacing during the first week so new signups do not lose the onboarding prompt too easily.

### 2026-03-07 12:31 (AEDT) - codex
- Files: `app/dashboard/schedule/schedule-calendar.tsx`, `docs/agent_change_log.md`
- What changed: Reworked the schedule day view into an actual hourly grid with time columns across the top and each team member rendered as a row beneath those hour headers. Drag-and-drop in day view now targets a specific hour cell so moving a job there updates its scheduled hour instead of only changing the assignee.
- Why: The day view previously showed one wide blank lane per team member, which made the schedule unreadable by time of day and did not match the expected calendar-style layout.

### 2026-03-07 12:39 (AEDT) - codex
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: Restored normal desktop drag behavior in the Kanban board by switching mass-select mode off the all-pointer delayed drag sensor and back onto standard mouse drag plus touch-only delay. Added subtle wiggle animation during mass-select mode, and clicking anywhere outside a card now exits that mode. Also fixed the Kanban card scheduled timestamp to render in `Australia/Sydney` instead of the browser's raw local timezone.
- Why: The long-press selection change had made desktop drag feel broken, and the scheduled-date regression had reappeared by formatting `scheduledAt` in browser-local time, which can shift jobs onto the wrong displayed day. Scheduled-job UI must always display the actual scheduled date in the app's intended timezone, not `createdAt` or browser-local drift.

### 2026-03-07 12:53 (AEDT) - codex
- Files: `livekit-agent/package.json`, `livekit-agent/package-lock.json`, `docs/agent_change_log.md`
- What changed: Corrected the LiveKit noise-cancellation dependency pin from the non-existent `@livekit/noise-cancellation-node@^0.3.0` to the published `^0.1.9` release and refreshed the agent lockfile to match.
- Why: GitHub Actions OCI deploys were failing during `npm ci` because the repo referenced a package version that does not exist on npm. The agent dependency must be pinned to a real published version for deploys to be reproducible.

### 2026-03-08 23:00 (AEDT) - antigravity
- Files: `components/dashboard/dashboard-skeleton.tsx`, `app/dashboard/settings/my-business/page.tsx`, `app/dashboard/settings/layout.tsx`, `actions/invite-actions.ts`, `__tests__/chat-interface.test.tsx`, `docs/agent_change_log.md`
- What changed: Comprehensive audit and fix of AI agent fix plan items. Replaced lazy DashboardSkeleton (raw divs) with proper Skeleton components. Fixed duplicate "Business details" heading to "Contact information". Added settings sidebar search/filter input. Created missing `updateMemberRole` server action with RBAC guards. Added ts-nocheck to pre-existing test type mismatch.
- Why: Prior AI agent left lazy patterns and missing implementations. This commit audits every fix plan item, fixes quality issues, fills gaps, and unblocks the commit pipeline.

### 2026-03-08 23:15 (AEDT) - antigravity
- Files: `ai-agent-fix-plan.md`, `docs/agent_change_log.md`
- What changed: Updated project fix plan with [DONE] status markers for all verified/implemented items.
- Why: Handing off remaining items (DM1, I2, G-series, DM5) to the next agent or developer.

### 2026-03-09 01:04 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `docs/agent_change_log.md`
- What changed: Updated the LiveKit deploy workflow to restore `livekit-agent/.env.local` from a persistent remote path (`$HOME/.config/earlymark/livekit-agent.env`), a legacy `/opt/livekit-agent/.env.local` file, or an optional `LIVEKIT_AGENT_ENV_B64` GitHub secret before restarting the worker.
- Why: Voice-worker deploys were failing whenever `/tmp/livekit-agent/.env.local` disappeared, because the workflow treated a temporary staging path as the only source of truth for required runtime secrets.

### 2026-03-09 01:12 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `docs/agent_change_log.md`
- What changed: Added a second LiveKit deploy fallback that builds `livekit-agent/.env.local` from individual GitHub secrets when the base64 env bundle and remote persistent env files are both unavailable.
- Why: The deploy still failed when `LIVEKIT_AGENT_ENV_B64` was unset and the server had no saved env file. The workflow now supports standard per-secret configuration instead of requiring a single bundled secret.
### 2026-03-10 15:28 (AEDT) - codex
- Files: `prisma/schema.prisma`, `prisma/migrations/20260310_add_voice_resilience/migration.sql`, `app/api/cron/voice-agent-health/route.ts`, `app/api/health/route.ts`, `app/api/internal/customer-agent-drift/route.ts`, `app/api/internal/voice-agent-status/route.ts`, `app/api/internal/voice-fleet-health/route.ts`, `app/api/internal/voice-grounding-index/route.ts`, `app/api/webhooks/twilio-voice-gateway/route.ts`, `app/api/webhooks/twilio-voice-fallback/route.ts`, `lib/voice-fleet.ts`, `lib/twilio-voice-call-health.ts`, `lib/voice-call-latency-health.ts`, `lib/voice-monitoring.ts`, `lib/voice-incidents.ts`, `lib/voice-incident-alert.ts`, `lib/voice-agent-runtime.ts`, `lib/workspace-routing.ts`, `lib/comms.ts`, `lib/comms-simple.ts`, `livekit-agent/agent.ts`, `livekit-agent/worker-entry.ts`, `livekit-agent/sales-agent.ts`, `livekit-agent/customer-agent.ts`, `livekit-agent/package.json`, `livekit-agent/.env.example`, `.github/workflows/deploy-livekit.yml`, `ops/systemd/tracey-sales-agent.service`, `ops/systemd/tracey-customer-agent.service`, `.env.example`, `docs/agent_change_log.md`
- What changed: Added dedicated `VoiceWorkerHeartbeat` and `VoiceIncident` persistence plus normalized workspace voice-number indexing; replaced the old inbound-only cron with fleet-wide monitoring for worker health, Twilio routing drift, recent call failures, and latency regressions; made the Twilio voice gateway surface-aware so unhealthy Tracey surfaces fall back to voicemail instead of dead SIP; added a fallback-recording webhook; switched workspace voice lookups and provisioning writes to normalized numbers; split the LiveKit runtime into sales and customer worker entrypoints with 60-second heartbeats, host/role/surface metadata, cache-first grounding lookup, and explicit Groq-primary/DeepInfra-fallback provider selection; and replaced the old `nohup` deploy path with systemd service units plus a dual-host GitHub Actions deploy that verifies both worker roles report the new SHA back through fleet health.
- Why: The previous voice stack had one large failure domain, weak telemetry, and no safe routing behavior when workers or Twilio drifted. This change hardens Tracey voice across all entities so outages become visible, deduped, and recoverable, and inbound callers are sent to voicemail instead of silently ringing through a dead agent path.

### 2026-03-10 16:11 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/worker-entry.ts`, `livekit-agent/runtime-state.ts`, `lib/ai/context.ts`, `lib/voice-fleet.ts`, `lib/voice-call-latency-health.ts`, `livekit-agent/.env.example`, `.env.example`, `docs/agent_change_log.md`
- What changed: Reworked the voice runtime for lower latency and cleaner overload behavior by adding shared worker capacity state plus admission control, replacing the old setup-time-only LLM wrapper with provider failover that can recover if the primary model dies before first token, reusing one prewarmed opener-audio cache per worker process, adding per-surface speech-turn tuning defaults, returning stale grounding cache entries while refreshing in the background, caching workspace voice grounding on the app side, and persisting richer call telemetry including total first-turn latency and actual provider/fallback usage.
- Why: The hardened voice fleet still had avoidable latency and complexity in its hot path. These changes reduce first-response delay, keep new calls away from saturated workers, and make provider degradation visible in telemetry instead of silently dragging call quality down.

### 2026-03-10 17:05 (AEDT) - codex
- Files: `livekit-agent/runtime-state.ts`, `lib/voice-fleet.ts`, `lib/voice-monitoring.ts`, `app/api/cron/voice-agent-health/route.ts`, `app/api/internal/voice-fleet-health/route.ts`, `livekit-agent/.env.example`, `.env.example`, `docs/agent_change_log.md`
- What changed: Raised the default customer-worker concurrency cap to `6` while keeping sales at `4`, documented the role-specific capacity override behavior, changed fleet health so workers at configured call capacity report as `degraded` instead of `unhealthy`, made surface routing treat all-workers-at-capacity as non-routable without classifying it as an outage, and added sustained customer-surface saturation monitoring so alerts only fire after both customer hosts stay full for multiple heartbeats.
- Why: Customer receptionist traffic needs materially more simultaneous capacity than the sales/demo surfaces. This change biases the system toward customer calls while keeping overload visible, routable, and distinguishable from genuine worker failure.

### 2026-03-10 17:08 (AEDT) - codex
- Files: `livekit-agent/runtime-state.ts`, `livekit-agent/.env.example`, `.env.example`, `docs/agent_change_log.md`
- What changed: Increased the default customer-worker capacity again from `6` to `8` concurrent calls per host and reduced the default sales/demo cap from `4` to `2`, with the documented env defaults updated to match.
- Why: The production priority is now more heavily biased toward real customer receptionist traffic, with demo and inbound sales taking a smaller reserved slice of worker capacity.

### 2026-03-10 17:51 (AEDT) - codex
- Files: `livekit-agent/runtime-state.ts`, `livekit-agent/.env.example`, `.env.example`, `docs/agent_change_log.md`
- What changed: Rebalanced the default voice-capacity recommendation back to `customer=6` concurrent calls per host and `sales=1` concurrent call per host, and updated the documented env defaults to match that safer split.
- Why: This keeps both servers available for customer failover while biasing capacity toward `normal` calls without pushing customer concurrency to the more aggressive `8-per-host` setting that carries higher latency and quality risk.

### 2026-03-10 18:02 (AEDT) - codex
- Files: `livekit-agent/runtime-state.ts`, `livekit-agent/.env.example`, `.env.example`, `docs/agent_change_log.md`
- What changed: Increased the default customer-worker capacity from `6` back to `8` concurrent calls per host while keeping the sales/demo cap at `1`, and updated the documented env defaults accordingly.
- Why: The requested operating point is now higher customer concurrency per server while still preserving a minimal reserved sales footprint and two-server failover.

### 2026-03-10 18:18 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Rewrote the customer and sales voice prompts into shorter structured sections with stronger answer-first and language-lock rules, and updated the `normal` 8-minute wrap-up instruction so the agent naturally says it will pass the issue straight to the manager and asks if there is anything else it should know before handing it over.
- Why: The previous prompts were serviceable but too broad and repetitive. This change improves prompt clarity, multilingual consistency, and end-of-call behavior without changing the underlying provider stack or call-duration limits.

### 2026-03-10 18:49 (AEDT) - codex
- Files: `lib/ai/prompt-contract.ts`, `lib/services/ai-agent.ts`, `app/api/chat/route.ts`, `lib/ai/sms-agent.ts`, `lib/ai/email-agent.ts`, `lib/ai/context.ts`, `app/api/webhooks/inbound-email/route.ts`, `livekit-agent/agent.ts`, `__tests__/tracey-prompt-contract.test.ts`, `docs/agent_change_log.md`
- What changed: Added a shared Tracey prompt-contract module for the duplicated CRM chat, customer SMS, and customer email surfaces; switched both CRM chat entrypoints to the same prompt builder; updated SMS to introduce Tracey as AI on the first reply in a thread instead of hiding that she is AI; rewrote the email agent to use the same truthfulness, language-lock, and mode-aware rules while preserving genuine-vs-tire-kicker triage; changed shared outbound intro/sign-off context so AI identity applies to the first customer thread reply instead of every message; threaded an explicit first-email-reply flag from the inbound email route; and tightened the Earlymark sales voice prompts so they also keep names/facts exact and explicitly hand unconfirmed pricing or onboarding detail back to a manager.
- Why: The previous prompt setup had drifted across Tracey's four real surfaces, with contradictory AI-identity behavior and duplicated CRM chat prompts. This change carries the voice prompt learnings across the other Tracey entities where they apply while keeping channel-specific behavior intact.

### 2026-03-12 01:46 (AEDT) - codex
- Files: `AGENTS.md`, `README.md`, `DEPLOYMENT_CHECKLIST.md`, `APP_MANUAL.md`, `docs/agent_change_log.md`
- What changed: Clarified across the canonical infra doc and operator-facing deployment docs that Docker is the standardized deployment architecture for the LiveKit core voice infrastructure, while the Twilio subaccount voice agent worker is still deployed as a host process and is not yet standardized on Docker.
- Why: A recent port-collision incident made it important to separate the supported Dockerized core stack from the still non-containerized worker so deployment, rollback, and incident-response decisions match the real runtime model.
### 2026-03-13 15:07 (AEDT) - codex
- Files: `lib/livekit-sip-health.ts`, `lib/voice-monitoring.ts`, `lib/voice-agent-health-monitor.ts`, `app/api/internal/voice-fleet-health/route.ts`, `__tests__/livekit-sip-health.test.ts`, `docs/agent_change_log.md`
- What changed: Added a dedicated LiveKit SIP health check that verifies the configured Earlymark inbound number is covered by a LiveKit SIP inbound trunk and that at least one LiveKit SIP dispatch rule exists for the inbound path, then wired that status into the internal voice fleet health route and the voice-agent watchdog incident pipeline.
- Why: Production voice was able to look healthy while the LiveKit SIP service had no inbound trunks or dispatch rules, which let inbound calls fail silently. This makes that control-plane outage visible to monitoring instead of reporting a false green.
### 2026-03-13 15:25 (AEDT) - codex
- Files: `livekit-agent/worker-entry.ts`, `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Removed the default explicit `agentName` from the LiveKit room workers so they register in the unnamed worker pool again, with an optional `LIVEKIT_AGENT_NAME` override only when explicitly needed.
- Why: Earlymark inbound calls were reaching LiveKit SIP and creating rooms, but LiveKit was dispatching those rooms with `agentName: ""`. Because the workers were registered as `tracey-sales-agent` and `tracey-customer-agent`, no worker ever accepted the room and callers heard ringing until Twilio cancelled the call.
### 2026-03-13 15:45 (AEDT) - codex
- Files: `livekit-agent/runtime-config.ts`, `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `.github/workflows/deploy-livekit.yml`, `__tests__/voice-agent-runtime-config.test.ts`, `docs/agent_change_log.md`
- What changed: Tightened production worker env validation so the voice agent now requires Deepgram plus at least one LLM API key before boot, disabled LiveKit noise cancellation by default on self-hosted servers unless explicitly forced, and updated the LiveKit deploy workflow to sync Deepgram, Groq, DeepInfra, and Supabase lead-capture env onto the OCI worker before restart.
- Why: The OCI worker had drifted into a half-configured state where the SIP path looked alive but the actual voice runtime was missing STT/LLM credentials, and it was still requesting a self-hosted LiveKit noise-cancellation path that produced runtime server-settings errors during live calls.
### 2026-03-13 16:06 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Moved Cartesia warm-up out of the worker background bootstrap and into the LiveKit job-process `prewarm` hook, then reused a shared TTS constructor for the live greeting path.
- Why: The old warm-up path ran before the LiveKit logger was initialized, so it failed every boot and left the first inbound greeting on a cold TTS path with an avoidable silent delay before Tracey spoke.
### 2026-03-13 16:38 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/voice-latency.ts`, `livekit-agent/runtime-fingerprint.ts`, `livekit-agent/.env.example`, `__tests__/voice-agent-runtime-fingerprint.test.ts`, `__tests__/voice-latency-config.test.ts`, `docs/agent_change_log.md`
- What changed: Forwarded `metrics_collected` and `error` events from the multilingual Cartesia wrapper back into the top-level TTS adapter, prewarmed the shared opener-audio cache during worker prewarm, and expanded the default latency target set from `normal` to `demo,inbound_demo,normal` across the worker, runtime fingerprint, and env example with focused regression tests.
- Why: Recent Earlymark inbound calls were being transcribed and replied to, but the custom multilingual TTS wrapper was swallowing `tts_metrics`, which left reply-audio timing blind; the default latency target also excluded `inbound_demo`, so production inbound calls were not opting into the richer latency audit path unless an env override was set, and the first post-restart caller was still paying the opener-cache warm cost.
### 2026-03-13 17:41 (AEDT) - codex
- Files: `.env.example`, `.github/workflows/deploy-livekit.yml`, `.github/workflows/voice-monitor-watchdog.yml`, `.github/workflows/voice-synthetic-probe.yml`, `AGENTS.md`, `app/api/cron/voice-monitor-watchdog/route.ts`, `app/api/internal/voice-fleet-health/route.ts`, `lib/ops-monitor-runs.ts`, `lib/voice-monitor-config.ts`, `ops/deploy/livekit-worker-install.sh`, `ops/deploy/livekit-worker-verify.sh`, `__tests__/ops-monitor-runs.test.ts`, `__tests__/voice-fleet-health-route.test.ts`, `__tests__/voice-monitor-watchdog-route.test.ts`, `docs/agent_change_log.md`
- What changed: Reworked the OCI voice-worker deploy into a staged install plus swap flow with rollback-capable remote scripts so a bad release no longer wipes the live runtime before `npm ci` and heartbeat verification succeed; tightened monitor freshness defaults from 15 to 7 minutes; made the watchdog rerun voice-health when the last fresh run still reported degraded or unhealthy; and exposed voice-agent-health, watchdog, and synthetic-probe freshness together in the internal voice fleet status. Also increased the watchdog and synthetic-probe GitHub schedules from every 10 minutes to every 5 minutes and added regression tests for the new monitor-state handling.
- Why: Production voice had become too easy to brick during deploy, and the freshness layer could still say “healthy enough” while the last real monitor run had already reported a broken voice stack. This hardens the worker release path and shortens the time-to-detection when a mission-critical voice surface regresses.
### 2026-03-13 19:18 (AEDT) - codex
- Files: `ops/deploy/livekit-worker-verify.sh`, `docs/agent_change_log.md`
- What changed: Relaxed the worker post-deploy verification script so it parses the protected health-route JSON body even when `/api/internal/voice-fleet-health` or `/api/internal/customer-agent-drift` return a non-200 aggregate status, instead of treating that HTTP status as an automatic deploy failure.
- Why: The tightened monitor freshness checks made `/api/internal/voice-fleet-health` return `500` whenever the scheduled monitor jobs were stale, which caused healthy freshly deployed workers to roll back during verification even though the worker payload itself had already converged on the new SHA.
### 2026-03-13 19:25 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `docs/agent_change_log.md`
- What changed: Changed the GitHub Actions LiveKit worker deploy to SCP the install/verify shell scripts onto the OCI host and execute those remote files in place, rather than piping the scripts over SSH stdin.
- Why: The manual host recovery path proved that running the staged deploy scripts as real files on the OCI box is stable. Keeping the workflow on that same execution path removes one more fragile transport layer from a mission-critical deploy.
### 2026-03-13 23:27 (AEDT) - codex
- Files: `lib/demo-call.ts`, `actions/demo-call-action.ts`, `app/api/demo-call/route.ts`, `lib/livekit-sip-health.ts`, `lib/customer-agent-readiness.ts`, `app/api/check-env/route.ts`, `__tests__/demo-call.test.ts`, `__tests__/livekit-sip-health.test.ts`, `__tests__/customer-agent-readiness.test.ts`, `docs/agent_change_log.md`
- What changed: Moved homepage demo-call initiation into shared server-side logic instead of a server action calling back into `/api/demo-call` over HTTP, added automatic LiveKit outbound trunk resolution with caller-ID selection, surfaced demo outbound trunk readiness in LiveKit SIP health and customer readiness, and added regression tests for stale-trunk fallback plus the tightened readiness wiring.
- Why: The configured `LIVEKIT_SIP_TRUNK_ID` had drifted away from the real LiveKit outbound trunk, which broke the homepage “Interview Tracey” form. The old server-action self-fetch also added an unnecessary internal network dependency. This change makes outbound demo calling resilient to stale trunk config and makes that state visible in health/readiness before users hit the form.
### 2026-03-14 00:01 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `ops/deploy/livekit-worker-install.sh`, `docs/agent_change_log.md`
- What changed: Reworked the GitHub OCI worker install step to SCP a temporary sync-env file onto the host and source it there before running the staged install script, instead of serializing all synced secrets into one long inline SSH command. The install script now also cleans up that temp sync-env file on exit.
- Why: The worker install script itself succeeds when executed directly on the host, which narrowed the remaining deploy failure to the GitHub SSH wrapper layer. Shipping the synced env as a real file removes fragile shell quoting around secrets and should stop the install step from failing before the staged archive unpacks.
### 2026-03-14 00:18 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `ops/deploy/livekit-worker-install.sh`, `docs/agent_change_log.md`
- What changed: Made worker install retries re-copy the release archive and install script on every attempt, added remote archive checksum plus `tar -tzf` validation before the install script runs, and moved the earlier pre-copy step to only stage the verify script. The install script now also disables and removes the legacy `livekit-agent.service` unit so the host stops crash-looping an obsolete worker service.
- Why: Host-side evidence showed the first failed install attempt deleted the copied archive, which made attempts 2 and 3 guaranteed failures because the retry loop only re-copied the sync env file. The same host also still had a legacy `livekit-agent.service` crash-looping in the background, which adds noise and operational fragility around voice deploys.
### 2026-03-14 00:28 (AEDT) - codex
- Files: `ops/deploy/livekit-worker-install.sh`, `docs/agent_change_log.md`
- What changed: Hardened the worker install script's env sync path by normalizing carriage returns and trailing newlines out of all synced secret values before writing them into the staged `.env.local`, and replaced the previous `sed`-based upsert helper with an `awk` rewrite that is safer for URLs and secret material.
- Why: The staged release was now extracting correctly, but the install still failed before `npm ci`. Host evidence showed the script was dying during env-file mutation, and the synced secrets path can carry newline baggage from GitHub Actions. Normalizing those values and avoiding raw `sed` replacement makes the env upserts deterministic.
### 2026-03-14 15:33 (AEDT) - codex
- Files: `AGENTS.md`, `docs/voice_operating_brief.md`, `scripts/check-agent-change-log.mjs`, `livekit-agent/customer-contact-policy.ts`, `lib/agent-mode.ts`, `lib/ai/prompt-contract.ts`, `lib/ai/sms-agent.ts`, `lib/ai/email-agent.ts`, `app/api/twilio/webhook/route.ts`, `app/api/webhooks/inbound-email/route.ts`, `livekit-agent/earlymark-sales-brief.ts`, `app/page.tsx`, `livekit-agent/agent.ts`, `livekit-agent/runtime-config.ts`, `livekit-agent/runtime-fingerprint.ts`, `livekit-agent/voice-latency.ts`, `lib/voice-call-latency-health.ts`, `lib/voice-fleet.ts`, `app/api/cron/voice-synthetic-probe/route.ts`, `lib/demo-call.ts`, `actions/demo-call-action.ts`, `app/api/demo-call/route.ts`, `.github/workflows/deploy-livekit.yml`, `ops/deploy/livekit-worker-install.sh`, `.env.example`, `livekit-agent/.env.example`, `__tests__/customer-contact-policy.test.ts`, `__tests__/voice-prompts.test.ts`, `__tests__/voice-agent-runtime-config.test.ts`, `__tests__/voice-fleet.test.ts`, `__tests__/tracey-onboarding-email-preview.test.tsx`, `docs/agent_change_log.md`
- What changed: Added a curated `voice_operating_brief` and enforced it in the repo guardrail script for voice-affecting changes; introduced a canonical customer-contact policy module and reused it across prompts, CRM mode summaries, inbound SMS, inbound email, and normal-mode voice response guarding; created a shared Earlymark sales brief consumed by homepage and the rebuilt `demo` / `inbound_demo` prompts; changed demo calls to carry known lead context instead of forcing redundant recapture; hardened production TTS config to require explicit Aussie voice/language env and exposed TTS identity plus speculative-head config in runtime fingerprints and persisted call metadata; added speculative response-head caching for Earlymark sales surfaces, richer latency attribution, and degraded single-host fleet semantics; upgraded the synthetic probe to report whether a recent spoken canary sample exists; and narrowed the worker deploy workflow to voice-affecting paths while syncing the new voice env vars onto OCI. Added focused regression tests for the new customer-contact policy, voice prompts, runtime config, fleet expectations, and onboarding email preview.
- Why: Voice behavior had drifted across prompts, homepage copy, runtime config, and customer-contact modes, which made Tracey easy to regress and hard to tune. This pass makes `Tracey customer` mode alignment a hard policy, pins the Australian voice identity, adds better latency observability and safer low-risk response acceleration, and strengthens the repo/process guardrails so future voice changes preserve lessons instead of repeating them.
### 2026-03-14 15:58 (AEDT) - codex
- Files: `lib/customer-agent-readiness.ts`, `__tests__/customer-agent-readiness.test.ts`, `docs/voice_operating_brief.md`, `docs/agent_change_log.md`
- What changed: Downgraded inbound lead-email readiness failures from `unhealthy` to `degraded` in customer-agent readiness and added a regression test covering missing MX / unverified Resend receiving for `inbound.earlymark.ai`.
- Why: `customer-agent-reconcile` was returning HTTP 500 solely because inbound lead email DNS was not ready, even when Twilio routing, voice workers, and customer-facing runtime were healthy. The reconcile monitor should warn on lead-email readiness drift, not fail the entire ops workflow unless a real runtime blocker exists.
### 2026-03-17 11:18 (AEDT) - codex
- Files: `lib/release-truth.ts`, `lib/provisioning-readiness.ts`, `lib/launch-readiness.ts`, `lib/ops-monitor-runs.ts`, `app/api/internal/launch-readiness/route.ts`, `app/api/health/route.ts`, `app/admin/ops-status/page.tsx`, `app/admin/customer-usage/page.tsx`, `ops/deploy/livekit-worker-verify.sh`, `__tests__/launch-readiness-route.test.ts`, `__tests__/health-route.test.ts`, `__tests__/tracey-onboarding-email-preview.test.tsx`, `docs/voice_operating_brief.md`, `docs/agent_change_log.md`
- What changed: Added a shared launch-readiness aggregator that exposes live web release SHA, worker release truth, critical voice gate state, canary status, monitoring freshness, SMS/email readiness, and workspace provisioning drift; added a protected `/api/internal/launch-readiness` route plus an internal `/admin/ops-status` page; exposed release truth from `/api/health`; tightened worker post-deploy verification so it queries launch-readiness and rolls back if the critical voice gate is still unhealthy after heartbeat/drift convergence; and raised the existing onboarding lead-email preview test timeout so the full suite stays stable under the larger verification set.
- Why: The repo already had several health primitives, but not one decision-ready source of production truth for launch-critical state. This closes the visibility gap between “worker heartbeat exists” and “production is actually release-safe,” while also surfacing provisioning and comms drift in a single operator-facing view.
### 2026-03-17 13:11 (AEDT) - codex
- Files: `.github/workflows/passive-communications-health.yml`, `.github/workflows/voice-synthetic-probe.yml`, `app/admin/ops-status/page.tsx`, `app/api/cron/passive-communications-health/route.ts`, `app/api/internal/voice-fleet-health/route.ts`, `lib/launch-readiness.ts`, `lib/passive-production-health.ts`, `__tests__/launch-readiness-route.test.ts`, `__tests__/passive-communications-health-route.test.ts`, `__tests__/passive-production-health.test.ts`, `__tests__/voice-fleet-health-route.test.ts`, `docs/voice_operating_brief.md`, `docs/agent_change_log.md`
- What changed: Replaced routine dependence on the synthetic probe with a passive real-traffic health layer built from persisted `VoiceCall` activity, inbound Resend `email.received` webhook events, and recent Twilio voice failure scopes. Added a scheduled `passive-communications-health` monitor route/workflow, wired passive production status into launch-readiness and internal voice-fleet health, repointed the internal ops page to show passive production separately from the deploy/recovery active probe, and added regression tests covering low-traffic unknown handling, active workspace voice failures, inbound email failure detection, and the updated route semantics.
- Why: Routine synthetic probes were too heavy-handed for day-to-day health and did not reflect whether real users were successfully using the system. This change makes passive real traffic the primary production signal while keeping the spoken PSTN canary for deploy verification and incident recovery only.
### 2026-03-17 13:42 (AEDT) - codex
- Files: `livekit-agent/voice-prompts.ts`, `livekit-agent/agent.ts`, `__tests__/voice-prompts.test.ts`, `docs/voice_operating_brief.md`, `docs/agent_change_log.md`
- What changed: Extracted the reusable Tracey prompt builders into a dedicated shared module and switched the voice prompt regression test off the full `livekit-agent/agent.ts` runtime file. The worker now imports the shared prompt builders, while the test imports the prompt module directly instead of pulling in the full worker runtime and its native noise-cancellation dependency.
- Why: Production Vercel builds were failing during `next build` because the test path dragged `livekit-agent/agent.ts` into the web TypeScript build, which in turn required the worker-only `@livekit/noise-cancellation-node` package that is not installed in the web app environment. This decouples the web deploy path from worker-native dependencies without changing live voice behavior.
## 2026-03-17 13:54 (AEDT) - codex

- Files changed:
  - `app/api/health/route.ts`
  - `__tests__/health-route.test.ts`
  - `docs/voice_operating_brief.md`
  - `docs/agent_change_log.md`
- Summary:
  - Rebuilt the public health route as a thin wrapper over `getLaunchReadiness()` plus database reachability instead of recomputing a separate fragmented voice/Twilio/release view.
  - Preserved the existing public payload shape for key consumers while adding launch-readiness, passive-production, communications, monitoring, and canary truth directly to `/api/health`.
  - Added regression coverage for both the healthy launch-readiness-backed path and the fallback path where launch readiness fails to compute.
- Why:
  - The public health surface was still drifting from `/api/internal/launch-readiness` and `/admin/ops-status`, which undermined the phase-1 production-truth work and made deploy verification harder to trust.
## 2026-03-17 14:39 (AEDT) - codex

- Files changed:
  - `app/api/twilio/webhook/route.ts`
  - `lib/passive-production-health.ts`
  - `app/api/cron/passive-communications-health/route.ts`
  - `app/admin/ops-status/page.tsx`
  - `__tests__/passive-production-health.test.ts`
  - `__tests__/passive-communications-health-route.test.ts`
  - `__tests__/voice-fleet-health-route.test.ts`
  - `__tests__/launch-readiness-route.test.ts`
  - `__tests__/health-route.test.ts`
  - `__tests__/twilio-sms-webhook.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Added sanitized Twilio `WebhookEvent` writes for inbound SMS receipt and SMS reply success/failure inside the canonical Twilio SMS webhook route, and tagged inbound customer chat messages with explicit SMS channel metadata.
  - Extended passive production health to include a real-traffic SMS channel sourced from recent Twilio `sms.received` / `sms.reply` webhook events, while keeping SMS unknown/no-traffic states out of the top-level global degradation path unless there is a real failure.
  - Updated the passive communications monitor and internal ops page to surface SMS passive health alongside voice and inbound email, including workspace-level SMS classifications and recent SMS activity visibility.
  - Added regression coverage for SMS failure rollup behavior and the Twilio SMS webhook persistence path, while updating existing launch-readiness and health mocks to the expanded passive-health shape.
- Why:
  - Routine ops could already prove real voice calls and inbound email, but SMS still only had configuration drift checks. This change makes recent real inbound SMS and SMS-processing failures visible in the same passive production model, so operator status better reflects whether customer messaging is actually working.
## 2026-03-17 14:48 (AEDT) - codex

- Files changed:
  - `lib/passive-production-health.ts`
  - `__tests__/passive-production-health.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Counted workspace-scoped inbound email webhook failures in passive production health and upgraded configured workspaces with recent scoped failures from `unknown` to real email `failure`.
  - Added regression coverage proving a workspace with recent scoped inbound email errors now contributes a real passive failure instead of being silently treated as an unknown/no-traffic case.
- Why:
  - Passive monitoring for email was still weaker than voice and SMS because only unscoped inbound email failures affected the global signal. Workspace-specific inbound email breakage now surfaces correctly in the same per-workspace failure model.
## 2026-03-17 17:06 (AEDT) - codex

- Files changed:
  - `AGENTS.md`
  - `DEPLOYMENT_CHECKLIST.md`
  - `docs/voice_operating_brief.md`
  - `docs/FINAL_RELEASE_RUNBOOK.md`
  - `.github/workflows/deploy-livekit.yml`
  - `ops/deploy/livekit-worker-install.sh`
  - `ops/deploy/livekit-worker-verify.sh`
  - `ops/docker/worker-compose.yml`
  - `livekit-agent/Dockerfile`
  - `livekit-agent/.dockerignore`
  - `livekit-agent/healthcheck.js`
  - `livekit-agent/agent.ts`
  - `livekit-agent/runtime-config.ts`
  - `__tests__/voice-agent-runtime-config.test.ts`
  - `lib/launch-readiness.ts`
  - `__tests__/launch-readiness.test.ts`
  - `actions/analytics-actions.ts`
  - `app/dashboard/analytics/page.tsx`
  - `__tests__/analytics-actions.test.ts`
  - `actions/tradie-actions.ts`
  - `__tests__/tradie-actions-pdf.test.ts`
  - `lib/workspace-audit.ts`
  - `actions/deal-actions.ts`
  - `actions/chat-actions.ts`
  - `actions/activity-actions.ts`
  - `__tests__/activity-actions.test.ts`
  - `actions/search-actions.ts`
  - `components/layout/global-search.tsx`
  - `components/core/command-palette.tsx`
  - `app/admin/ops-status/page.tsx`
  - `vitest.config.ts`
  - `__tests__/stubs/server-only.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Completed the no-managed-SMS launch-readiness fix so Earlymark can legitimately run without a managed production SMS number and the ops page now labels that state as optional instead of implicitly required.
  - Migrated the OCI voice-worker deploy path from host-process assumptions to Dockerized workers with container health snapshots, Docker Compose release directories under `/opt/earlymark-worker`, previous-release rollback, shared persisted worker env, and deploy verification that stays Docker-native instead of falling back to legacy `systemd` runtime behavior.
  - Updated the canonical voice and deployment docs to match the new containerized worker topology and added a final release runbook covering smoke checks, rollback, and incident slices.
  - Audited the analytics/reporting pipeline to use exact date-range windows and equal-length comparison periods, fixed printable quote/invoice PDF generation to enforce workspace access and escape HTML output, and added regression coverage for both.
  - Added a shared workspace audit helper and wired invoice/deal mutation audit events through tradie, deal, and chat action paths so invoice creation, issue, reversal, update, void, paid state changes, and invoiced-amount adjustments now leave a durable `ActivityLog` trail.
  - Expanded CRM correspondence/search parity by merging persisted `VoiceCall` records into `getActivities()` output, exposing the richer search corpus in the search UIs, and adding regression coverage for merged voice-call history.
- Why:
  - The remaining gaps were clustered around production-grade deploy safety, reporting correctness, CRM traceability, and correspondence visibility. This pass closes the most brittle runtime dependency on `/opt/earlymark-agent`, fixes concrete report/PDF correctness issues, and makes customer-facing history and operator audit trails materially more trustworthy before the next live verification and launch-hardening steps.
- Outstanding after this change:
  - A second OCI voice host is still required before voice stops being single-host degraded.
  - The broader CRM/admin backlog still includes invoice-adjustment UX polish, operator-visible smart-routing surfaces, deeper recent-activity/history parity, and the remaining release smoke/runbook execution on live production.
## 2026-03-17 18:28 (AEDT) - codex

- Files changed:
  - `livekit-agent/Dockerfile`
  - `ops/deploy/livekit-worker-install.sh`
  - `AGENTS.md`
  - `DEPLOYMENT_CHECKLIST.md`
  - `docs/voice_operating_brief.md`
  - `docs/agent_change_log.md`
- Summary:
  - Added the native Linux runtime libraries required by `@livekit/rtc-node` to the Dockerized worker image so the OCI worker containers can load the LiveKit RTC binding instead of crash-looping on missing `libgio-2.0.so.0`.
  - Removed the last install-script fallback to `/opt/earlymark-agent/.env.local`, making `/opt/earlymark-worker-shared/.env.local` the only supported persisted worker env source for Dockerized deploys.
  - Updated the canonical agent, deployment, and voice-operating docs to reflect the Docker-native env contract and the new container-image dependency on RTC shared libraries.
- Why:
  - The first live Docker cutover proved the topology change was right, but the image was incomplete for the LiveKit RTC native module and the install path still retained a legacy env dependency. This closes the actual crash-loop blocker and finishes the move away from the host-process `/opt/earlymark-agent` runtime model.
- Outstanding after this change:
  - The live OCI worker host still needs a successful Docker-image redeploy and verification against production launch-readiness.
  - A second OCI voice host is still required before voice stops being single-host degraded.
  - The broader CRM/admin backlog still includes invoice-adjustment UX polish, operator-visible smart-routing surfaces, deeper recent-activity/history parity, and the remaining release smoke/runbook execution on live production.
## 2026-03-17 19:04 (AEDT) - codex

- Files changed:
  - `ops/deploy/livekit-worker-verify.sh`
  - `docs/voice_operating_brief.md`
  - `docs/agent_change_log.md`
- Summary:
  - Relaxed the host rollout gate in the Docker worker verify script so deploy verification now requires the targeted host to converge on the expected worker SHA, healthy worker roles, healthy Twilio routing, and healthy LiveKit SIP, instead of failing solely because the overall fleet is still single-host degraded pending a second OCI host.
  - Preserved the explicit deploy SHA and host ID passed into the verify script after sourcing the live worker env from disk, preventing `/opt/earlymark-worker/.env.local` from silently overriding the release SHA being checked during rollout.
  - Hardened rollback by force-removing the worker containers before bringing the previous Docker release back up, avoiding partial rollback failures when Docker Compose cannot stop the just-recreated containers cleanly.
- Why:
  - The first successful Docker cutover was immediately rolled back even though the host itself was healthy, because the verify script was still using the fleet-wide two-host target as a hard host-deploy gate. Deploy verification needs to distinguish between a bad rollout on the host being updated and the known, separate launch risk that the secondary host has not been provisioned yet.
- Outstanding after this change:
  - The live OCI worker host still needs a successful post-patch verification run, including the deploy-only spoken voice probe.
  - A second OCI voice host is still required before voice stops being single-host degraded in global launch readiness.
  - The broader CRM/admin backlog still includes invoice-adjustment UX polish, operator-visible smart-routing surfaces, deeper recent-activity/history parity, and the remaining release smoke/runbook execution on live production.
## 2026-03-17 19:58 (AEDT) - codex

- Files changed:
  - `livekit-agent/agent.ts`
  - `lib/voice-spoken-canary.ts`
  - `__tests__/voice-spoken-canary.test.ts`
  - `ops/deploy/livekit-worker-verify.sh`
  - `docs/voice_operating_brief.md`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed the deploy-only spoken canary persistence race by holding worker shutdown open until `/api/internal/voice-calls` finishes, instead of fire-and-forgetting the `VoiceCall` write after disconnect.
  - Made the spoken canary correlate on persisted call start time plus caller/called numbers, so delayed row creation does not cause a false negative after a real successful probe call.
  - Kept the earlier host-scoped Docker verify-script hardening together with this fix so rollout verification now checks the right host, preserves the requested SHA/host ID, and only fails when the actual rollout or spoken canary is broken.
- Why:
  - Live OCI traces proved the canary calls were reaching Tracey, being transcribed, and generating replies, but deploy verification still failed because the worker job could exit before the `VoiceCall` persistence fetch completed. That made the deploy gate look broken even though the real audio path was working.
- Outstanding after this change:
  - The live OCI worker host still needs one successful post-patch verification run end to end so the Dockerized voice-worker path is fully proven in production.
  - A second OCI voice host is still required before voice stops being single-host degraded in global launch readiness.
  - The broader CRM/admin backlog still includes invoice-adjustment UX polish, operator-visible smart-routing surfaces, deeper recent-activity/history parity, and the remaining release smoke/runbook execution on live production.
## 2026-03-17 20:12 (AEDT) - codex

- Files changed:
  - `ops/deploy/livekit-worker-install.sh`
  - `docs/voice_operating_brief.md`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed the Docker worker install path so it now force-removes both the fixed-name worker containers and any stale compose-generated duplicates before `docker compose up`, instead of colliding with its own previous container names during rollout.
- Why:
  - The first manual production rollout of `68a4ce4c` proved the image built correctly, but the install step still failed because Compose tried to recreate `earlymark-sales-agent` and `earlymark-customer-agent` while old containers with those names still existed. That is a deploy-path bug, not a worker-runtime bug.
- Outstanding after this change:
  - The live OCI worker host still needs one successful post-patch verification run end to end so the Dockerized voice-worker path is fully proven in production.
  - A second OCI voice host is still required before voice stops being single-host degraded in global launch readiness.
  - The broader CRM/admin backlog still includes invoice-adjustment UX polish, operator-visible smart-routing surfaces, deeper recent-activity/history parity, and the remaining release smoke/runbook execution on live production.
## 2026-03-17 20:33 (AEDT) - codex

- Files changed:
  - `ops/deploy/livekit-worker-install.sh`
  - `docs/voice_operating_brief.md`
  - `docs/agent_change_log.md`
- Summary:
  - Added a last-resort worker-container cleanup fallback to the Docker install path: if `docker rm -f` cannot stop the existing fixed-name worker containers, the script now kills the container init PID directly and retries removal before recreating the containers.
  - Manually redeployed the primary OCI worker host to `68a4ce4c3f115ad6c0b4476705ace40e6a371502`; `/opt/earlymark-worker/.env.local` and both `earlymark-sales-agent` / `earlymark-customer-agent` containers now report that SHA, while `www.earlymark.ai` is already live on the matching Vercel deployment `assistantbot-drzx9hh2x-michael-s-projects-031f547b.vercel.app`.
- Why:
  - The initial Docker install hardening still failed on the real host because Docker could not stop the running worker containers cleanly and returned `permission denied`. The deploy path needed a direct PID-kill fallback or the rollout would keep failing despite healthy new images and correct release metadata.
- Outstanding after this change:
  - The deploy-only spoken PSTN canary was not rerun to completion after the final worker-stop fallback patch because the verification call was interrupted mid-session. The primary host is on the right SHA, but that canary still needs one clean healthy run before the Dockerized worker rollout is fully signed off.
  - Global launch readiness is still degraded because only 1/2 expected OCI voice hosts exist. A second voice host is still required before voice stops being single-host degraded.
  - The OCI LiveKit Redis sidecar container `liveearlymarkai-redis-1` is still crash-looping due to legacy host/sidecar port contention. It is not the active Tracey worker runtime, but it remains infrastructure drift that should be cleaned up.
  - Production launch readiness still reports one failed Twilio provisioning record for workspace `My Workspace` at stage `bundle-clone`; that operator-visible provisioning issue remains unresolved.
  - The broader CRM/admin backlog still includes invoice-adjustment UX polish, operator-visible smart-routing surfaces, deeper recent-activity/history parity, and the remaining release smoke/runbook execution on live production.
## 2026-03-17 20:42 (AEDT) - codex

- Files changed:
  - `AGENTS.md`
  - `HANDOVER.md`
  - `docs/current_agent_handoff.md`
  - `docs/agent_change_log.md`
- Summary:
  - Added a single canonical short resume brief at `docs/current_agent_handoff.md` that tells future agents exactly what to read, what is live now, what was just completed, and what remains unfinished.
  - Updated `AGENTS.md` so interrupted or still-open work must read `docs/current_agent_handoff.md` immediately after the main repo rules.
  - Replaced the stale root `HANDOVER.md` session dump with a redirect that points agents to the new canonical handoff path instead of outdated notes.
- Why:
  - The repo already had enough audit history, but not a short current-state handoff that another agent could trust. `HANDOVER.md` was stale and actively risky. This change creates one obvious re-entry point so future agents do not need to infer the current state from scattered logs.
- Outstanding after this change:
  - The deploy-only spoken PSTN canary still needs one clean healthy rerun after the final worker-stop fallback patch.
  - Global launch readiness is still degraded because only 1/2 expected OCI voice hosts exist.
  - The OCI legacy Redis sidecar is still crash-looping.
  - The failed Twilio provisioning record for workspace `My Workspace` is still unresolved.
  - The broader CRM/admin backlog still includes invoice-adjustment UX polish, operator-visible smart-routing surfaces, deeper recent-activity/history parity, and remaining live smoke/runbook execution.

## 2026-03-17 22:10 (AEDT) - codex

- Files changed:
  - `lib/voice-fleet.ts`
  - `app/admin/ops-status/page.tsx`
  - `__tests__/voice-fleet.test.ts`
  - `app/api/webhooks/twilio-voice-gateway/route.ts`
  - `app/api/internal/provisioning-retry/route.ts`
  - `docs/voice_operating_brief.md`
  - `docs/SINGLE_HOST_DISASTER_RECOVERY.md`
  - `docs/OCI_LEGACY_REDIS_SIDECAR_CLEANUP.md`
  - `scripts/backup-worker-env.sh`
  - `docs/agent_change_log.md`
- Summary:
  - Added `VOICE_SINGLE_HOST_ACCEPTED=true` to treat single-host voice as an explicitly accepted mode (default remains 2-host expectation), and surfaced that state in `/admin/ops-status`.
  - Hardened the Twilio voice gateway error path to prefer voicemail recording fallback when request handling fails after the call metadata is known.
  - Added an internal ops route to retry workspace Twilio provisioning (`POST /api/internal/provisioning-retry`) so the `bundle-clone` failure state can be re-attempted safely via the canonical provisioning path.
  - Added single-host disaster-recovery docs plus a small host-side env backup script, and documented cleanup steps for the crash-looping legacy Redis sidecar.
- Why:
  - The medium-term topology decision is to run a single OCI host, so launch readiness should focus on real failures rather than a permanent “missing second host” warning, while compensating with improved fallbacks and faster recovery paths.

## 2026-03-17 23:18 (AEDT) - codex

- Files changed:
  - `lib/twilio-regulatory.ts`
  - `lib/comms.ts`
  - `__tests__/twilio-regulatory-bundle-clone.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed AU regulatory bundle cloning to correctly capture the cloned bundle SID when Twilio returns it as `sid` (not `bundleSid`), and added regression coverage.
  - Kept the earlier subaccount-auth polling behavior so bundle readiness checks run in the correct account context.
- Why:
  - Provisioning could still fail with “bundle required” if we accidentally passed the parent bundle SID into the subaccount purchase request due to reading the wrong clone response field.

## 2026-03-18 00:35 (AEDT) - codex

- Files changed:
  - `prisma/schema.prisma`
  - `lib/comms.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Added a per-workspace `twilioRegulatoryAddressSid` field and an `ensureWorkspaceRegulatoryAddress` helper so AU Mobile Business provisioning can automatically create and reuse a Regulatory Address inside each Twilio subaccount.
  - Updated the comms provisioning flow to require a regulatory-address stage before number search, and to attach the resolved regulatory address SID to mobile number purchases.
- Why:
  - Twilio AU Mobile Business numbers require an AddressSid per subaccount; wiring this into the provisioning pipeline lets users complete onboarding and receive a provisioned AU mobile number without extra manual configuration in Twilio.

## 2026-03-18 00:56 (AEDT) - codex

- Files changed:
  - `lib/comms.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Ensured Twilio Regulatory Address creation always provides required AU fields by deriving `city` from `BusinessProfile.baseSuburb` and parsing `region/postalCode` from the saved physical address (with a clear error if state/postcode are missing).
- Why:
  - Twilio rejects Address creation when required fields like `city` are missing; using the onboarding-saved suburb/address keeps provisioning fully automatic for correctly-formatted AU addresses.

## 2026-03-18 01:18 (AEDT) - codex

- Files changed:
  - `actions/tracey-onboarding.ts`
  - `components/onboarding/tracey-onboarding.tsx`
  - `lib/comms.ts`
  - `__tests__/comms.test.ts`
  - `__tests__/tracey-onboarding-email-preview.test.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the temporary City field from the onboarding UI and switched Twilio regulatory address creation back to deriving the locality from the existing Physical Address, keeping the interface unchanged while still satisfying Twilio’s `city` requirement.
- Why:
  - The onboarding flow should not gain new mandatory fields without explicit approval; we can safely infer the locality for regulatory purposes from the structured AU address the user already enters.

## 2026-03-18 01:39 (AEDT) - codex

- Files changed:
  - `components/onboarding/tracey-onboarding.tsx`
  - `actions/tracey-onboarding.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Blocked onboarding progression unless the Physical Address includes locality + AU state + postcode (provision-ready format), and mirrored the same validation server-side.
- Why:
  - Number provisioning should never reach Twilio regulatory address creation without the minimum address fields required to satisfy Twilio’s mandatory `city/region/postalCode` constraints.

## 2026-03-18 01:52 (AEDT) - codex

- Files changed:
  - `components/ui/address-autocomplete.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Updated the AU address autocomplete to request `address_components` from Google Places and, when available, emit a provision-ready address string including locality + state + postcode (instead of relying on `formatted_address` which may omit postcode).
- Why:
  - Users should not be blocked by the onboarding address gate when they select a valid address from the Google picker; we need the postcode/state data that Places provides to satisfy Twilio’s regulatory Address requirements.

## 2026-03-18 02:08 (AEDT) - codex

- Files changed:
  - `components/ui/address-autocomplete.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added a Places Details fallback: if the initial autocomplete selection is missing postcode/state/locality, we fetch full `address_components` using `place_id` and re-emit a provision-ready AU address string.
- Why:
  - Some Places autocomplete responses omit `postal_code` even when it exists; doing a Details lookup makes postcode/state capture reliable so onboarding isn’t blocked for valid addresses.

## 2026-03-18 02:29 (AEDT) - codex

- Files changed:
  - `components/ui/address-autocomplete.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added “auto-select best match” on blur: if the user typed an address but didn’t click a dropdown item, we resolve the top Google prediction and rewrite the field into a provision-ready AU format (locality + state + postcode) when possible.
- Why:
  - The address field should behave like an enforced selection flow, not a free-text field. This prevents provisioning failures caused by manually typed addresses that omit required regulatory details.

## 2026-03-18 02:46 (AEDT) - codex

- Files changed:
  - `components/onboarding/tracey-onboarding.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Made the onboarding “Next” gate accept a Google-selected address based on structured Places components (locality/state/postcode), even if the displayed address string is missing the postcode.
- Why:
  - Google `formatted_address` can omit postcode; gating should use the structured data we already have from Places so users aren’t blocked after selecting a valid address.

## 2026-03-18 02:55 (AEDT) - codex

- Files changed:
  - `components/onboarding/tracey-onboarding.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - When the website scrape pre-fills a Physical Address, we now immediately resolve that text via Google Places (Autocomplete + Details) and store structured locality/state/postcode components so scraped addresses behave like typed-and-selected ones for provisioning.
- Why:
  - Scraped addresses such as “36-42 Henderson Road, Alexandria, New South Wales, Australia” should be enough for provisioning; we now use Google’s structured data behind the scenes instead of treating the scraped string as unstructured text.

## 2026-03-18 03:14 (AEDT) - codex

- Files changed:
  - `components/ui/address-autocomplete.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added background auto-resolution for programmatically filled addresses (e.g. scraped-from-website). When the address value changes and the user isn’t actively typing, we automatically resolve the best Google match and fetch full details so postcode/state/locality are available without requiring a dropdown click or blur.
- Why:
  - The onboarding address gate and Twilio provisioning should not depend on the user manually interacting with the address field after a scrape; the system must infer missing postcode/state from Google in the background.
