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

## Open — for Claude to pick up later (not blocked on you)

### Fan jest-axe out across every Dialog/Sheet/Drawer
- **Why:** The pattern is established in `__tests__/a11y-stale-job-modal.test.tsx` but only the stale-job dialog is covered. Every other dialog still mocks the Dialog primitives in its test file, so axe can't evaluate the real ARIA contract.
- **What:** For each dialog (new-deal, deal-detail, deal-edit, stale-deal-follow-up, kanban-automation, personal-phone, job-completion, loss-reason, etc.), add an axe test that renders with the REAL Dialog primitives and stubs only the action-layer dependencies.

### Verify kanban deal-card touch targets on mobile
- **Why:** Audit flagged various `size="icon" className="h-8 w-8"` buttons in `components/crm/deal-card.tsx`. I didn't audit each one individually — needs a sweep with the rule: every interactive icon inside a card must be ≥40×40px on phone.

### Audit the rest of the app
- **Why:** The UI audit only covered `components/` and top-level `app/**/*.tsx` modal/dialog/sheet components. Other surfaces (forms outside dialogs, kanban itself, settings pages, public marketing pages) haven't been audited the same way.

## Done
<!-- Move items here once complete so the trail is preserved. -->
