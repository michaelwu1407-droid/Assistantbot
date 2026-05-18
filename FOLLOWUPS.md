# Manual follow-ups

Items that need a human (you) because they require running a dev
server, judgement calls on infra config, or domain knowledge I can't
infer from the codebase alone. Claude appends to this file when it
hits something blocked on your action — please clear items as you do
them and Claude will pick the next pass off the same list.

## Open

### Visual regression baselines — generate once
- **Why:** `e2e/visual/stale-job-dialog.spec.ts` references `toHaveScreenshot()` snapshots that don't exist yet. Without baselines, the `visual` Playwright project fails on first run and CI can't enforce drift.
- **What:** With the local dev server + seeded E2E Postgres harness running, run `npm run test:visual:update`, review the PNGs that land under `e2e/visual/__screenshots__/`, then commit and push them.
- **Caveat:** Baselines must be generated on Linux (where CI runs). macOS font rendering produces spurious diffs that won't match in CI.

### `EMAIL_WEBHOOK_SECRET` env var — set in every deployment
- **Why:** The hardening on `/api/webhooks/email` requires the env var to be set. Without it the route returns 503 on every inbound email and lead-provider forwarders (hipages, airtasker, oneflare) will start failing silently.
- **What:** Pick a strong random secret (e.g. `openssl rand -hex 32`), set it as `EMAIL_WEBHOOK_SECRET` in Vercel project settings for all environments, then update each lead-provider's webhook URL config to send the value in the `x-email-webhook-secret` header.

## Done
<!-- Move items here once complete so the trail is preserved. -->
