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

### Audit the rest of the app (continued)
- **Why:** Settings page audit found dark-mode `dark:bg-slate-*` / `dark:border-slate-*` overrides and amber/emerald alert banners across many settings pages. These fall under the CLAUDE.md exception clause ("intentional dark-surface components may keep explicit dark values"), so were not touched in the current pass.
- **What:** Decide whether to migrate them to semantic tokens or formalise the dark-surface exception. Public marketing pages (`app/(public)/*.tsx`) and the kanban surface itself remain unaudited at the same depth.

## Done
- **Fan jest-axe out across every Dialog/Sheet/Drawer** — 6 new axe tests covering new-deal, deal-edit, stale-deal-follow-up, kanban-automation, personal-phone, job-completion. Found and fixed 4 real a11y bugs (heading-order, unlabeled inputs, disconnected SelectTrigger). ResizeObserver polyfill added to setup.ts.
- **Verify kanban deal-card touch targets on mobile** — audited deal-card and kanban-board. Fixed 6 sub-40px buttons (trash, approve/reject, column header +, bulk delete, cancel, empty-column Add Card).
- **Audit settings pages** — fixed billing-page typography (raw combos → `app-section-title` / `app-body-secondary` / `app-field-label` / `app-kpi-value`) and integrations-page email overflow (`truncate min-w-0` + `shrink-0` on status dot).
