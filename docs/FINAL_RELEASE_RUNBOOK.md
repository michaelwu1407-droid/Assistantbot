# Final Release Runbook

Updated: 2026-03-17 AEDT

## Smoke suite

Run these in order after a production release:

1. Web release truth
   - Confirm `/admin/ops-status` shows the expected web SHA.
   - Confirm passive production and launch-readiness are not disagreeing.
2. Worker release truth
   - Confirm `/admin/ops-status` shows the expected worker SHA(s).
   - Confirm `earlymark-sales-agent` and `earlymark-customer-agent` containers are healthy on every configured host.
3. Billing and onboarding
   - Complete signup -> billing -> onboarding without provisioning.
   - Complete signup -> billing -> onboarding with provisioning enabled.
4. Voice
   - Call the Earlymark inbound number and confirm `inbound_demo` answers.
   - Submit the demo form and confirm the outbound demo call fires.
   - Confirm a customer `normal` voice call behaves according to the workspace mode.
5. Messaging and email
   - Send a real inbound SMS to a managed customer number if SMS is in launch scope.
   - Send a real inbound email to a live `@inbound.earlymark.ai` alias and confirm webhook processing.
6. CRM and reporting
   - Create a contact and deal.
   - Issue an invoice, update it, and mark it paid.
   - Confirm analytics totals match the test fixture expectations for the workspace.

## Deploy rollback

Use rollback if any of these are true after release:

- worker container health stays unhealthy
- `/api/internal/launch-readiness` shows `voiceCritical.status != healthy`
- the deploy/recovery spoken probe fails
- passive production immediately detects a real failure introduced by the release

Rollback steps:

1. Re-run the worker deploy verifier and inspect the failure output.
2. If the release is bad, restore `/opt/earlymark-worker.prev` on the affected host via the deploy script rollback path.
3. Confirm container health, launch-readiness, and spoken probe recover.
4. If the web release is also bad, redeploy the previous Vercel release separately.

## Incident slices

### Voice outage

1. Check `/admin/ops-status` for release truth, passive production, and active probe state.
2. Check `sudo docker ps` and both worker container logs.
3. Check `/api/internal/voice-fleet-health` and `/api/internal/launch-readiness`.
4. If routing drift is suspected, inspect the Twilio voice gateway audit.

### Inbound email outage

1. Check inbound email stage in `/admin/ops-status`.
2. Confirm recent `resend email.received` webhook success or failure events.
3. Confirm DNS/provider verification is still live for `inbound.earlymark.ai`.

### Provisioning outage

1. Check provisioning summary in `/admin/ops-status`.
2. Inspect the workspace provisioning stage details.
3. Confirm bundle lookup, bundle clone, subaccount reuse, and number purchase stages separately.

### OCI host replacement

1. Provision the new host and install Docker plus Docker Compose.
2. Configure the real `VOICE_HOST_ID`.
3. Seed the shared worker env file.
4. Add the host secrets/vars to GitHub Actions.
5. Run the worker deploy workflow for the new host and verify launch-readiness convergence.
