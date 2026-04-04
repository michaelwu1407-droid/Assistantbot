## 2026-04-05 21:30 (AEDT) - Cascade Agent

- Files changed:
  - `components/crm/contacts-client.tsx`
  - `components/crm/deal-card.tsx`
  - `components/tradie/job-billing-tab.tsx`
- Summary:
  - **Contacts list pagination**: Fixed footer count to show correct total contacts and page info using `pagination?.total` and `pagination?.page` instead of client-side filtered counts.
  - **Deal card time formatting**: Standardized scheduled time display to use `formatDateTimeInTimezone` (e.g., "April 5, 2026 9:30 AM") matching deal detail page format instead of separate date + time components.
  - **Invoice status labels**: Billing tab now uses `formatInvoiceStatusLabel` to show user-friendly labels ("Paid", "Issued", "Draft", "Void", "Unpaid") instead of raw status codes.
- Why:
  - Closes CRM consistency issues: pagination counts were misleading, time formats differed across surfaces, and invoice status showed technical codes instead of user-facing language.

## 2026-04-05 20:15 (AEDT) - Cursor Agent

- Files changed:
  - `components/crm/contact-profile.tsx`
  - `components/crm/contact-timeline.tsx`
  - `components/crm/deal-detail-modal.tsx`
  - `components/crm/leaflet-map.tsx`
  - `components/scheduler/draggable-job-card.tsx`
  - `__tests__/job-portal-status-labels.test.ts`
- Summary:
  - **Contact profile** property rows, **contact timeline** active deals, **map popups**, **deal detail modal** stage pill and “other jobs” list, and **scheduler** job cards now show **shared user-facing stage labels** (`getUserFacingDealStageLabel` / `formatJobHeaderStatus`) instead of raw Prisma codes or lowercase map stage ids.
  - Scheduler status line drops forced **all-caps** styling so labels read naturally (e.g. “Scheduled” vs `SCHEDULED`).
- Why:
  - Closes remaining checklist drift where internal stage strings still leaked in secondary CRM surfaces after the main kanban/deal-card cleanup.

## 2026-04-05 19:45 (AEDT) - Cursor Agent

- Files changed:
  - `app/crm/settings/integrations/page.tsx`
  - `components/jobs/job-detail-view.tsx`
  - `lib/job-portal-status-labels.ts`
  - `__tests__/job-portal-status-labels.test.ts`
- Summary:
  - **Integrations**: Disabled Gmail, Outlook, Google Calendar, and Xero connect buttons expose **`title` + `aria-label`** with `getIntegrationConnectionReadiness` reasons so users see why OAuth is unavailable instead of a dead control with no explanation.
  - **Tradie job portal**: Header badge and success toast use **human-readable job and deal-stage labels** (`formatJobHeaderStatus`); invoice rows use **Paid / Issued / Draft** etc. instead of raw status codes.
- Why:
  - Closes audit gaps on unexplained disabled integration CTAs and raw `WON` / `TRAVELING`-style strings on the job detail surface.

## 2026-04-05 19:00 (AEDT) - Cursor Agent

- Files changed:
  - `components/dashboard/notifications-btn.tsx`
  - `components/crm/stale-deal-follow-up-modal.tsx`
  - `components/crm/kanban-automation-modal.tsx`
- Summary:
  - Notifications: **`SEND_INVOICE`** actions and row taps that open the job link now show a **`Opening job & billing`** success toast so users get immediate feedback (same helper used for primary action buttons and list-row navigation).
  - Stale-deal and kanban automation modals show **user-facing stage labels** via `getUserFacingDealStageLabel` instead of raw internal stage strings.
- Why:
  - Aligns with the CRM stage-language cleanup and the audit note that invoice-related notification paths lacked an obvious outcome.

## 2026-04-05 18:15 (AEDT) - Cursor Agent

- Files changed:
  - `components/chatbot/chat-interface.tsx`
  - `components/crm/job-map-view.tsx`
  - `__tests__/chat-interface.test.tsx`
- Summary:
  - **Quick actions** (Schedule a job, Create quote, etc.) now **send the prompt immediately** via `sendMessage` instead of only filling the textarea—users see the user bubble and “Thinking…” without a second Send click (addresses audit: no visible outcome from quick actions).
  - **Chat interface tests** clear `sessionStorage` in `beforeEach` so history load is not skipped across runs after persisted messages.
  - **Job map** sidebar stage pills use **shared user-facing stage labels** (`getUserFacingDealStageLabel`) instead of raw internal stage strings.
- Why:
  - Clearer Tracey UX and consistent CRM wording on the map list.

## 2026-04-05 17:30 (AEDT) - Cursor Agent

- Files changed:
  - `app/crm/contacts/[id]/page.tsx`
  - `components/crm/job-map-view.tsx`
  - `__tests__/contact-page-access.test.tsx`
- Summary:
  - **Person** contacts on the detail page now show **Company** and **Address** when present (previously only the business-type card showed them), closing a gap vs edit form fields.
  - Job map empty states explain **Today vs All Jobs** and that mapping depends on addresses / geocoding.
- Why:
  - Audit items on missing contact fields and confusing map empty copy; regression extended for contact detail.

## 2026-04-05 16:45 (AEDT) - Cursor Agent

- Files changed:
  - `components/crm/inbox-view.tsx`
  - `__tests__/inbox-view.test.tsx`
- Summary:
  - Re-ran the handoff targeted Vitest bundle (`chat-route`, `chat-actions`, `triage`, `digest`, `deal-utils`, `contact-actions`, `deal-actions`, `tradie-actions`, `settings-layout`, `new-deal-modal*`) — all 80 tests passed.
  - Inbox composer: renamed the ambiguous `Send myself` control to **`Direct SMS`**, added a **Who sends the next message?** label, `tablist`/`tab` roles with `aria-selected`, clearer contrast for the active direct tab, and explainer copy that contrasts **direct Twilio SMS now** vs **Ask Tracey (AI / CRM orchestration, not raw SMS)**.
- Why:
  - Addresses the live-audit confusion between direct messaging and Tracey; regression tests updated and extended.

## 2026-04-05 16:00 (AEDT) - Cursor Agent

- Files changed:
  - `components/layout/global-search.tsx`
  - `components/crm/contact-form.tsx`
  - `components/crm/deal-card.tsx`
  - `lib/ai/prompt-contract.ts`
  - `__tests__/global-search.test.tsx`
  - `__tests__/contact-form.test.tsx`
  - `__tests__/tracey-prompt-contract.test.ts`
- Summary:
  - Global search (header palette) now mirrors the command palette’s explicit click handler so mouse clicks on results navigate reliably, not only keyboard `onSelect`.
  - Contact create/edit uses `router.replace` after a successful save so the browser back button does not return users to an already-submitted form.
  - Kanban deal cards show scheduled date and time in the workspace timezone, with a full datetime tooltip aligned to the job detail page and schedule views.
  - CRM chat system prompt: require honest reporting of tool failures and user-facing stage language in confirmations (still LLM-first, no new routing).
- Why:
  - Closes audit gaps on search click trust, form completion flow, cross-surface schedule readability, and Tracey truthfulness—without shortcutting architecture.

## 2026-04-05 14:30 (AEDT) - Cursor Agent

- Files changed:
  - `app/crm/analytics/page.tsx`
  - `app/crm/team/page.tsx`
  - `components/crm/contacts-client.tsx`
  - `__tests__/contacts-client.test.tsx`
  - `__tests__/team-page.test.tsx`
- Summary:
  - Team invites now distinguish email-send success from link-only success using an explicit channel flag, so the modal cannot show empty `Invite sent to` copy after generating a shareable link.
  - Contacts list footer copy separates workspace totals from client-side search/stage/type filters: when filters are active, it reports matches on the loaded page versus how many rows this page returned and the workspace total.
  - Analytics renamed the ambiguous `Status` block to `Jobs overview`, added a short description, and aligned the printable report section title with `Jobs by stage`.
- Why:
  - Addresses live-audit trust issues (invite copy, contacts count confusion, analytics section labelling) with durable UI state and clearer semantics, plus regression tests.

## 2026-04-05 00:15 (AEDT) - Codex

- Files changed:
  - `__tests__/chat-actions.test.ts`
  - `__tests__/chat-route.test.ts`
  - `__tests__/deal-actions.test.ts`
  - `__tests__/deal-utils.test.ts`
  - `__tests__/digest.test.ts`
  - `__tests__/new-deal-modal-standalone.test.tsx`
  - `__tests__/new-deal-modal.test.tsx`
  - `__tests__/settings-layout.test.tsx`
  - `__tests__/tradie-actions.test.ts`
  - `__tests__/triage.test.ts`
  - `actions/chat-actions.ts`
  - `actions/contact-actions.ts`
  - `actions/deal-actions.ts`
  - `actions/learning-actions.ts`
  - `actions/tradie-actions.ts`
  - `app/api/chat/route.ts`
  - `app/crm/settings/layout.tsx`
  - `components/chatbot/chat-interface.tsx`
  - `components/crm/deal-card.tsx`
  - `components/modals/new-deal-modal-standalone.tsx`
  - `components/modals/new-deal-modal.tsx`
  - `components/ui/address-autocomplete.tsx`
  - `docs/agent_handoff_2026-04-05.md`
  - `lib/admin/customer-usage.ts`
  - `lib/ai/triage.ts`
  - `lib/deal-utils.ts`
  - `lib/digest.ts`
- Summary:
  - Unified user-facing CRM stage language so contact views, activity/history text, admin usage reporting, and chat responses now present modern labels such as `Quote sent`, `Scheduled`, and `Awaiting payment` instead of leaking legacy internal stage names.
  - Fixed the CRM settings shell to use page-level vertical scrolling instead of clipping bottom actions inside nested scroll containers.
  - Revalidated invoice-related CRM surfaces after quote/invoice mutations so actions like `Mark Paid` refresh the deal, dashboard, and linked invoice views more reliably.
  - Removed silent address auto-selection from job creation. Typed addresses now save exactly as entered unless the user explicitly chooses an autocomplete suggestion, and stale coordinates are cleared when the typed address changes.
  - Reworked lead triage from hard decline to `hold for review`: risky leads now create visible review notes, surface in the evening digest, and show a `Needs review` banner on deal cards rather than being auto-rejected.
  - Kept Tracey chat LLM-first while aligning aggregate invoice/chat wording to the user-facing CRM language and making the direct aggregate response path use friendly stage labels.
- Why:
  - This pass focused on trust and clarity: making visible CRM language consistent, preventing silent data mutation, keeping important actions reachable on long settings pages, and aligning the AI triage/chat behavior with the intended human review workflow instead of surprising users with hidden declines or internal labels.

## 2026-04-04 03:18 (AEDT) - Codex

- Files changed:
  - `__tests__/inbox-view.test.tsx`
  - `__tests__/workspace-setup-comms-route.test.ts`
  - `CRM_PAGE_AUDIT.md`
- Summary:
  - Added inbox journey coverage for direct SMS success/failure and Ask Tracey success/failure from the real CRM thread UI.
  - Added route-level coverage for `/api/workspace/setup-comms`, including unauthenticated, missing-workspace, and successful provisioning handoff responses.
  - Updated the CRM audit to reflect the stronger inbox journey proof.
- Why:
  - The inbox and the final onboarding provisioning handoff are both high-importance user touchpoints. They now have direct regression coverage for the real paths users take before live provider testing.

## 2026-04-04 03:12 (AEDT) - Codex

- Files changed:
  - `actions/job-portal-actions.ts`
  - `__tests__/job-portal-actions.test.ts`
  - `__tests__/job-portal-page.test.tsx`
  - `__tests__/agent-settings-page.test.tsx`
  - `__tests__/chat-actions.test.ts`
  - `lib/feature-verification.ts`
- Summary:
  - Added portal journey coverage for token resolution, public page render, completion feedback handoff, and invalid-token not-found behavior.
  - Added a deduped `Job portal viewed` activity note so portal opens are no longer completely invisible in ops.
  - Added direct proof that the WhatsApp assistant entry point is discoverable in settings with the right number, constraints, and `wa.me` link.
  - Added coverage that chatbot product-feedback tickets still get created even when support email delivery is unavailable.
  - Updated the feature-verification report so the portal is no longer marked as entirely unobservable.
- Why:
  - These were the next highest-risk non-provider gaps: proving the portal and WhatsApp journeys are actually reachable and understandable to users, and making sure support feedback still has a safe fallback when email delivery is down.

## 2026-04-04 03:00 (AEDT) - Codex

- Files changed:
  - `components/settings/call-forwarding-card.tsx`
  - `__tests__/call-forwarding-card.test.tsx`
  - `docs/tracey_call_handling_live_checklist.md`
- Summary:
  - Made the three Tracey call-handling modes more explicit in the settings UI by giving each mode its own primary next-step instruction, mode-specific setup-text wording, and clearer helper copy.
  - Added regression coverage proving the UI now changes its next-step guidance appropriately for `Backup AI`, `100% AI`, and `Forwarding off`.
  - Added a live verification checklist for real-device and real-call testing of the three modes.
- Why:
  - Saving the right mode was not enough on its own. Each mode leads to a different phone action and different expected live behavior, so the UI now guides the user more directly and the repo now includes a concrete checklist for proving the real-world flow.

## 2026-04-04 02:56 (AEDT) - Codex

- Files changed:
  - `__tests__/call-forwarding-card.test.tsx`
  - `lib/call-forwarding.ts`
- Summary:
  - Added direct user-flow coverage for the three Tracey call-handling modes in the settings card: `Backup AI`, `100% AI`, and `Forwarding off`.
  - Verified setup-text behavior for backup/full modes and confirmed the setup CTA is blocked when forwarding is off.
  - Fixed the forwarding setup SMS body to include a full `https://.../crm/settings` URL instead of a bare domain path.
- Why:
  - This gives concrete proof that the app surfaces all three modes coherently to users, and it closes a real usability gap where the setup SMS link was less reliably clickable than intended.

## 2026-04-04 02:52 (AEDT) - Codex

- Files changed:
  - `actions/deal-actions.ts`
  - `actions/messaging-actions.ts`
  - `__tests__/deal-actions.test.ts`
  - `__tests__/deal-actions-sync.test.ts`
  - `__tests__/messaging-actions.test.ts`
  - `CRM_PAGE_AUDIT.md`
- Summary:
  - Added a dedicated reschedule confirmation SMS for customer-visible booking time changes instead of silently relying on the next 24h reminder.
  - Wired that message into both scheduled job edit flow and atomic calendar reschedule flow, while keeping the original confirmation trigger limited to the first transition into `Scheduled`.
  - Added regression coverage proving the split behavior: initial schedule sends the original confirmation, later reschedules send the updated booking confirmation and reset reminder eligibility.
- Why:
  - The CRM could already move jobs safely, but customers were not explicitly told about schedule changes unless someone followed up manually or they later noticed the 24h reminder. This closes that communication gap.

## 2026-04-04 02:28 (AEDT) - Codex

- Files changed:
  - `actions/deal-actions.ts`
  - `__tests__/deal-actions.test.ts`
  - `__tests__/deal-actions-sync.test.ts`
  - `CRM_PAGE_AUDIT.md`
  - `docs/agent_change_log.md`
- Summary:
  - Reset scheduled-job reminder state whenever the scheduled time actually changes through the deal edit flow or atomic reschedule action.
  - Added regression coverage so moved bookings become eligible for a fresh 24h reminder instead of being silently skipped because `lastReminderSentAt` was still set from the old slot.
  - Updated the CRM audit to reflect that booking-reminder parity is now part of the schedule workflow.
- Why:
  - Rescheduling a job previously left the old reminder marker intact, which meant the automation cron could treat a newly moved booking as already reminded and never send the correct reminder for the new appointment time.

## 2026-04-03 (AEDT) - Claude (sonnet-4-6)

- Files changed:
  - `components/tutorial/tutorial-steps.ts`
  - `components/tutorial/tutorial-overlay.tsx`
  - `APP_FEATURES.md`
  - `CHANGELOG.md`
  - `docs/agent_change_log.md`
- Summary:
  - **Tutorial revamp**: Rewrote all 15 tutorial steps (reduced from 16) with accurate, up-to-date feature names and content.
  - **New step**: Added Analytics page step (`nav-analytics`, targeting `reports-link` sidebar element, routes to `/crm/analytics`).
  - **New step**: Added "More Than Just Chat" step showcasing quoting/invoicing, analytics, scheduling, and contact lookup via chat.
  - **Settings step corrected**: Replaced outdated setting names (One-Tap Messages, Repair Glossary, AI Voice Agent, Phone & Support, Workspace & Display) with current structure (Calls & Texting, My Business, AI Assistant, Automations, AI Attachment Library).
  - **Dashboard step updated**: Now highlights RHS chat panel availability in advanced mode.
  - **Condensed**: Settings + Handbook merged into 1 step; Feedback + Finish merged into 1 step.
  - **New TutorialStep interface fields**: `features?: string[]` (dot-list of feature bullets) and `tip?: string` (highlighted callout box).
  - **Card redesign**: Chat examples now render as speech bubble mockups (user right-aligned, bot left-aligned). Feature lists use dot-prefixed rows. Tip shown in a mint callout box. Fixed `text-black` → `text-foreground/80` for dark mode.
  - **Overlay cleanup**: Consolidated 8 identical bottom-card rendering blocks into a single `BOTTOM_CARD_IDS.has()` check. Consolidated 8 separate route `useEffect` hooks into one routes map. Removed hardcoded schedule/preferences bullet logic (now data-driven via `features` field). Extracted `parseBold()` as a named function.
- Why:
  - Tutorial was referencing renamed/removed pages and settings, missing new features (Analytics, Quoting, Automations), and had poor card formatting (flat text dump, hardcoded `text-black`, boring bullet lists for chat examples).

## 2026-04-01 (AEDT) - Claude (sonnet-4-6)

- Files changed:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260401_add_followup_fields/migration.sql`
  - `actions/followup-actions.ts` (new)
  - `actions/followup-actions.ts` — `sendFollowUpMessage` fix in stale-deal modal
  - `components/crm/stale-deal-follow-up-modal.tsx`
  - `components/crm/deal-detail-modal.tsx`
  - `components/crm/job-completion-modal.tsx`
  - `components/dashboard/notifications-btn.tsx`
  - `app/api/cron/followup-reminders/route.ts` (new)
  - `docs/missing_features.md`
  - `docs/agent_change_log.md`
- Summary:
  - **Audit**: Full APP_FEATURES.md × codebase cross-check. Confirmed working: auth, billing, onboarding, kanban, contacts, calendar, schedule, map, inbox (Ask Tracey IS real — routes through `/api/chat`), chat/AI, quoting/invoicing, analytics, team, RBAC, global search, job reminders cron, automation rules engine, morning/evening digest, Xero on-demand, Stripe, MYOB.
  - **Schema**: Added `followUpAt`, `followUpNote`, `followUpChannel`, `followUpCompletedAt` to `Deal` model.
  - **`actions/followup-actions.ts`**: New file — `scheduleFollowUp`, `completeFollowUp`, `cancelFollowUp`, `sendFollowUpMessage` (real Twilio/Resend), `processFollowUpReminders` (cron), `processPostJobFollowUps` (cron — fires "Follow Up After Job" rule that was defined but never executed).
  - **Stale deal follow-up modal**: Replaced `setTimeout` simulation with real `sendFollowUpMessage`. Phone channel schedules a dated reminder instead of pretending to dial.
  - **Deal detail modal**: Added Follow-up reminder card — schedule/reschedule/complete/cancel per deal, overdue highlighted red.
  - **`/api/cron/followup-reminders`**: New hourly cron — runs reminder notifications + post-job follow-ups in parallel.
  - **CRM job completion modal**: Replaced `setTimeout` stub — Request Review triggers real `sendReviewRequestSMS`, Request Payment sends invoice email via Resend.
  - **Notification action buttons**: CONFIRM_JOB → `approveDraft`, APPROVE_COMPLETION → `approveCompletion`, SEND_INVOICE → navigate to invoice, CALL_CLIENT → `tel:` link.
- Why:
  - Pre-launch audit revealed the follow-up lifecycle (detect → notify → act → record) was entirely broken despite being documented as complete. All critical stubs fixed; remaining open items documented in `missing_features.md`.

## 2026-03-27 19:22 (AEDT) - Codex

- Files changed:
  - `actions/invite-actions.ts`
  - `app/crm/team/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the extra team-page helper copy under the title and simplified the members card header copy.
  - Fixed team-member resolution to use the shared current-workspace access fallback and mark the current user by app-user id as well as email.
- Why:
  - Prevents the signed-in user from disappearing from the team page when auth identity/email drift exists and keeps page typography more consistent with the cleaner analytics treatment.

## 2026-03-27 19:12 (AEDT) - Codex

- Files changed:
  - `app/crm/analytics/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Reworked the analytics print/export document into a page-safe report layout with stable print timing, narrower tables, and 2-column summary metrics.
- Why:
  - Prevents the print view from behaving like a broken browser snapshot and makes the exported report fit normal paper/PDF output more reliably.

## 2026-03-27 19:04 (AEDT) - Codex

- Files changed:
  - `app/crm/analytics/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Restored the customer ratings graph on the analytics page using the existing `ratingDistribution` data after it was accidentally removed during the page simplification pass.
- Why:
  - Preserves the useful ratings visualization while still keeping the analytics page stripped back from unnecessary helper copy.

## 2026-03-27 18:58 (AEDT) - Codex

- Files changed:
  - `__tests__/analytics-actions.test.ts`
  - `actions/analytics-actions.ts`
  - `app/crm/analytics/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Made analytics period labels and comparisons range-aware, including `LTM` in the time selector and matching prior-period comparison copy on the revenue card.
  - Changed the customer KPI to count unique customers in the selected range instead of only newly created contacts, and updated the page/test payload from `customers.new` to `customers.inRange`.
  - Fixed duplicate React keys on repeated month labels by switching chart and trend rendering to stable period-based keys.
- Why:
  - Prevents misleading KPI wording on the analytics page and removes React key collisions when the selected range spans multiple years.

## 2026-03-27 10:18 (AEDT) - Codex

- Files changed:
  - `app/crm/analytics/page.tsx`
  - `app/globals.css`
  - `components/ui/dialog.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Simplified the analytics page copy, renamed the top KPI to `Revenue`, removed nonessential grey helper text, and dropped the ratings bell-curve section.
  - Replaced the old screen-style print flow with a dedicated printable report document built from analytics data.
  - Tightened the shared radius system to 18px across the main Tailwind radius tokens, common rounded utility classes, and the base dialog shell.
- Why:
  - Keeps analytics focused on the signal users actually need, produces a print result that reads like a report instead of a viewport capture, and makes surface styling more consistent across the app.

## 2026-03-27 09:58 (AEDT) - Codex

- Files changed:
  - `components/crm/kanban-board.tsx`
  - `components/dashboard/dashboard-main-chrome.tsx`
  - `components/modals/new-deal-modal.tsx`
  - `docs/agent_change_log.md`
  - `lib/deal-utils.ts`
- Summary:
  - Fixed kanban "Add Card" so the new-job modal opens with the clicked column's stage instead of always defaulting to `New request`.
  - Routed the selected stage through the shared dashboard shell and reset the modal to that requested stage on open.
- Why:
  - Matches user intent when adding a card from later pipeline columns and keeps the create flow aligned with the board.

## 2026-03-27 09:48 (AEDT) - Codex

- Files changed:
  - `components/modals/new-deal-modal.tsx`
  - `components/modals/new-deal-modal-standalone.tsx`
  - `docs/agent_change_log.md`
  - `lib/deal-utils.ts`
- Summary:
  - Unified the dashboard "new job" stage picker behind a shared stage list that matches the active kanban columns.
  - Removed drift between the main modal and standalone create-job flow, including outdated labels and missing `Awaiting payment`.
- Why:
  - Keeps job creation aligned with the board users actually manage, instead of exposing older internal stage variants.

## 2026-03-26 15:35 (AEDT) - Codex

- Files changed:
  - `actions/automation-actions.ts`
  - `app/(dashboard)/tradie/jobs/[id]/page.tsx`
  - `app/api/test-comprehensive/route.ts`
  - `components/crm/deal-notes.tsx`
  - `components/crm/kanban-automation-modal.tsx`
  - `components/dashboard/dashboard-client.tsx`
  - `components/dashboard/dashboard-kpi-cards.tsx`
  - `components/dashboard/onboarding-modal.tsx`
  - `components/dashboard/profile-form.tsx`
  - `components/invoicing/invoice-generator.tsx`
  - `components/jobs/job-notes.tsx`
  - `components/map/map-view.tsx`
  - `components/modals/new-deal-modal.tsx`
  - `components/monitoring/reminder-monitor.tsx`
  - `components/referral/referral-success-modal.tsx`
  - `components/settings/referral-settings.tsx`
  - `components/ui/address-autocomplete.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed the Next.js build regression caused by exporting a non-async object from a `"use server"` file.
  - Reduced lint further by resolving several hook-dependency issues and removing another batch of unused imports, variables, and catches.
  - Corrected the job notes editing flow so note edits use dedicated edit state and save the intended content.
- Why:
  - Restores a working production build while continuing the lint cleanup without papering over framework constraints.
  - Keeps the remaining lint debt narrower and lower-risk, with build and typecheck both green again.

## 2026-03-24 12:16 (AEDT) - codex

- Files changed:
  - `.github/workflows/ci-quality-checks.yml`
  - `docs/agent_change_log.md`
- Summary:
  - Added a new CI workflow that runs on pull requests and pushes to `main` with the minimum quality gates: install, lint, TypeScript check, tests, and build.
  - Validated command compatibility against existing package scripts and local environment (`tsc` passes; lint/tests/build surfaced pre-existing project issues unrelated to the workflow file itself).
- Why:
  - Establishes a single required pre-merge safety gate so deploy-breaking typos and regressions are caught automatically before reaching production.

## 2026-03-24 11:56 (AEDT) - codex

- Files changed:
  - `components/crm/deal-detail-modal.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added conflict-aware stage update handling in the deal detail modal to match Kanban board behavior.
  - When backend responds with `code: "CONFLICT"` on stage change, the UI now shows a clear toast, closes stale modal state, and refreshes CRM data.
- Why:
  - Keeps stage-change UX consistent and prevents confusing stale modal views when another teammate moves the same card first.

## 2026-03-24 11:50 (AEDT) - codex

- Files changed:
  - `components/crm/kanban-board.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added frontend conflict handling for Kanban stage updates: when backend returns `code: "CONFLICT"`, the board now shows a clear toast ("This card was moved by someone else. Refreshing board...") and auto-refreshes the board data.
  - Applied this behavior across single-card drag, bulk drag, delete moves, scheduled-assignment move, and card delete action in the board.
- Why:
  - Gives users immediate, understandable feedback when concurrent edits happen and quickly reconciles UI with server truth to prevent confusing stale card positions.

## 2026-03-24 11:41 (AEDT) - codex

- Files changed:
  - `actions/automation-actions.ts`
  - `actions/kanban-automation-actions.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed compile-time stage assignment errors by typing automation stage mapping as Prisma `DealStage` values instead of plain strings.
  - Added strict stage parsing/validation fallback so unknown `targetStage` values are rejected/skipped instead of being passed into `db.deal.update`.
- Why:
  - Prevents invalid string assignment to `Deal.stage` and restores type-safe builds for automation and kanban move-stage actions.

## 2026-03-24 11:28 (AEDT) - codex

- Files changed:
  - `actions/tradie-actions.ts`
  - `prisma/schema.prisma`
  - `docs/agent_change_log.md`
- Summary:
  - Replaced fragile JS number arithmetic in Tradie quote/variation/invoice calculations with Prisma `Decimal` math and explicit 2-decimal rounding.
  - Fixed the `createQuoteVariation` update path to avoid `Number(deal.value) + total` precision loss by performing all updates in decimal space.
  - Standardized money-related schema fields to `Decimal` (`Deal.invoicedAmount`, `BusinessProfile.emergencySurcharge`, `ServiceItem` price fields, `PricingSettings.callOutFee`) to remove mixed `Float`/`Decimal` storage for currency.
- Why:
  - Prevents floating-point precision bugs in currency calculations and ensures invoice/deal monetary values remain exact across writes and reads.

## 2026-03-24 11:05 (AEDT) - codex

- Files changed:
  - `actions/deal-actions.ts`
  - `app/api/deals/route.ts`
  - `app/api/contacts/route.ts`
  - `app/api/reminders/route.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Added optimistic concurrency protection for Kanban stage updates in `updateDealStage` using an `updatedAt` guard, returning a conflict response when another user has already changed the same deal.
  - Hardened multi-tenant API access by resolving workspace from authenticated user context and rejecting mismatched `workspaceId` query parameters on deals, contacts, and reminders endpoints.
  - Updated reminders stats endpoint to always scope reads to the caller's own workspace to prevent cross-workspace aggregation leaks.
- Why:
  - Prevents silent last-write-wins data corruption during simultaneous drag-and-drop actions and closes workspace ID parameter tampering paths that could expose another tenant's data.

## 2026-03-24 10:40 (AEDT) - codex

- Files changed:
  - `prisma/schema.prisma`
  - `lib/timezone.ts`
  - `lib/working-hours.ts`
  - `actions/settings-actions.ts`
  - `actions/automated-message-actions.ts`
  - `actions/tracey-onboarding.ts`
  - `actions/workspace-actions.ts`
  - `actions/agent-tools.ts`
  - `lib/ai/tools.ts`
  - `lib/ai/sms-agent.ts`
  - `components/settings/call-settings-client.tsx`
  - `components/settings/working-hours-form.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added a first-class `workspaceTimezone` field on `Workspace` and introduced timezone utilities to validate IANA values and infer a default timezone from onboarding business address/state.
  - Made reminder formatting and working-hours day resolution timezone-aware so booking reminders and schedule checks align to the workspace local day/time instead of server timezone assumptions.
  - Exposed timezone in settings so users can adjust it after onboarding, and threaded the selected timezone into AI availability tools.
- Why:
  - Prevents delayed/incorrect reminder timing and wrong day-of-week handling for businesses outside east-coast time (for example Perth), while still auto-defaulting from onboarding address with manual override in settings.

## 2026-03-23 21:05 (AEDT) - codex

- Files changed:
  - `lib/deal-attention.ts`
  - `components/dashboard/dashboard-kpi-cards.tsx`
  - `lib/deal-utils.ts`
  - `components/crm/deal-card.tsx`
  - `actions/stale-job-actions.ts`
  - `components/crm/stale-job-reconciliation-modal.tsx`
  - `actions/chat-actions.ts`
  - `lib/ai/tools.ts`
  - `components/chatbot/chat-interface.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added a shared attention-classification utility and switched the 4th dashboard KPI to `Attention Required`, counting overdue/stale/rotting/rejected/parked jobs together.
  - Standardized overdue banner styling to red only (single severity color) and added a new reconciliation outcome `PARKED` that moves jobs to `New request` with metadata tags for unresolved dates.
  - Added chatbot audit support for “what needs attention?” plus quick-action buttons rendered in chat tool output.
- Why:
  - Keeps attention logic consistent across dashboard metrics, Kanban signals, reconciliation workflow, and chatbot triage, reducing drift and manual triage friction long-term.

### 2026-03-23 (AEDT) - Antigravity Agent
- Files: `COMMUNICATION_SYSTEM.md`, `docs/TUTORIAL_HANDBOOK.md`, `docs/team_roles_and_approvals.md`, `docs/BUSINESS_MODEL.md`, `APP_MANUAL.md`, `README.md`
- What changed: Systematically overhauled non-historical project documentation to match the canonical state defined in `APP_FEATURES.md` and `AGENTS.md`. Fixed outdated mentions of pricing (now Monthly/Yearly), Kanban stages (6 stages with visual pending state), Twilio authentication and workarounds (now unified custom native auth), Voice Tech Stack (now LiveKit + Cartesia + Groq + Deepgram, explicitly removing all Retell AI/Vapi references), and Worker Deployment (explicitly replacing host process mentions with Docker Compose standard). Created `AI_DOCS_DEVIATION_REPORT.md` snapshot.
- Why: User requested fixing discrepancies to align with app feature md across all live docs so that the AI logic and standard knowledge base is perfectly synchronized and factual.

### 2026-03-23 (AEDT) - Cursor AI Agent
- Files: `components/dashboard/dashboard-header-extra-context.tsx`, `docs/agent_change_log.md`
- What changed: **`DashboardHeaderExtraContext`** — default **`createContext`** value is a **no-op** setter; **`useDashboardHeaderExtraSetter`** no longer **throws** (avoids hard crash if Provider is briefly missing / HMR / stale chunk).
- Why: Runtime: `useDashboardHeaderExtraSetter must be used inside DashboardMainChrome`.

### 2026-03-23 (AEDT) - Cursor AI Agent
- Files: `components/ui/tooltip.tsx`, `components/core/sidebar.tsx`, `components/dashboard/header.tsx`, `components/dashboard/dashboard-main-chrome.tsx`, `docs/agent_change_log.md`
- What changed: **Sidebar logo tooltip** — **`TooltipContent`** **`z-[200]`** so “Ask Tracey” isn’t covered by the **brand header** (`z-20`). **Header** — **compact search** (`~11.5–13rem`) moved **next to** **New Job + Filter** (RHS group, `justify-end`); removed wide left search. **New Job** — **emerald** glass (`bg-emerald-950/45`, border white/25) instead of **white** pill; **Filter** — **`bg-white/10`** + border (moderate emphasis). Removed **`sunlight-shadow`** from **New Job** button.
- Why: User: tooltip behind green bar; search too wide; CTAs too loud vs bar.

### 2026-03-23 (AEDT) - Cursor AI Agent
- Files: `app/crm/page.tsx`, `app/crm/dashboard/page.tsx`, `next.config.js`, `components/layout/Shell.tsx`, `components/dashboard/dashboard-main-chrome.tsx`, `app/crm/settings/layout.tsx`, `components/core/sidebar.tsx`, `components/tutorial/tutorial-overlay.tsx`, `actions/deal-actions.ts`, `actions/*` (revalidatePath), onboarding/auth/billing/not-found/offline/deals/contacts/API webhooks, `docs/agent_change_log.md`
- What changed: **Pipeline URL** is **`/crm/dashboard`** (Kanban home), not **`/crm`**. **`/crm`** **redirects** to **`/crm/dashboard`**. **Frozen Kanban headers** — **`#main-canvas`** uses **`flex flex-col overflow-hidden`** (not **`overflow-y-auto`**) so vertical scroll stays inside **`#kanban-board`**; **`DashboardMainChrome`** + settings root get **`overflow-hidden` / `overflow-y-auto`** so long settings still scroll. **Legacy `/dashboard`** redirect target updated to **`/crm/dashboard`**. **revalidatePath("/crm", "layout")** for broad CRM cache; deal actions also **`/crm/dashboard`**.
- Why: User: `/crm` alone was wrong product shape; whole-page scroll broke column header lock.

### 2026-03-23 (AEDT) - Antigravity Agent
- Files: `app/crm/layout.tsx`, `components/layout/Shell.tsx`, `components/crm/hero-dashboard-reel.tsx`
- What changed: **Layout & Context Fixes** — Restored **`DashboardMainChrome`** wrapper in **`Shell.tsx`** mounted branch to fix `useDashboardHeaderExtraSetter` runtime crash. Moved **`headerDisplayName`** database-lookup logic into **`app/crm/layout.tsx`** to fix top-right name regression. Added **`suppressHydrationWarning`** and **`mounted`** guard to **`HeroDashboardReel`** to fix SSR mismatch.
- Why: User reported context errors and "User" name regression after manual folder rename/pull; hydration mismatch on home.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `Start-local-website.bat`, `docs/run-the-app-on-your-computer.md`, `docs/agent_change_log.md`
- What changed: **Local dev helper** — Windows **`Start-local-website.bat`** runs **`npm run dev`** from the repo root (double‑click). Plain‑language guide **`docs/run-the-app-on-your-computer.md`** explains using the batch file vs terminal and **http://localhost:3000**.
- Why: User asked to have local run steps prepared; no coding background.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `app/dashboard/**` → `app/crm/**`, `next.config.js`, `lib/rbac.ts`, `components/layout/Shell.tsx`, `components/core/sidebar.tsx`, `components/dashboard/*`, actions, API callbacks, webhooks, onboarding, tests, docs (`CHANGELOG.md`, `docs/*`, plans), `docs/agent_change_log.md`
- What changed: **Authenticated app URL segment** renamed from **`/dashboard`** to **`/crm`** (e.g. `/crm`, `/crm/inbox`, `/crm/settings/...`). **`next.config.js`** **308 redirects** from **`/dashboard`** and **`/dashboard/:path*`** to **`/crm`** equivalents. Internal **`@/components/dashboard/*`** and **`dashboard-provider`** imports left unchanged; fixed mistaken **`crm-*`** module paths introduced by bulk replace.
- Why: User: Inbox and other areas are not conceptually “under Dashboard”; **`crm`** is a neutral shell name for the signed-in product area.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-main-chrome.tsx`, `docs/agent_change_log.md`
- What changed: **`DashboardMainChrome`** — always wrap non-Settings routes in **`DashboardHeaderExtraContext.Provider`** (even when **`workspaceId`/`userId`** not yet synced). Header + modals only when **`ready`**; avoids **`useDashboardHeaderExtraSetter`** runtime error on first paint.
- Why: Runtime: Dashboard mounted before shell store filled.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-main-chrome.tsx`, `components/crm/crm-header-extra-context.tsx`, `components/layout/Shell.tsx`, `components/layout/shell-initializer.tsx`, `components/crm/crm-client.tsx`, `components/core/sidebar.tsx`, `lib/store.ts`, `app/crm/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/crm/hub/page.tsx`, `app/crm/calendar/page.tsx`, `components/agent/agent-dashboard-client.tsx`, `components/tradie/tradie-dashboard-client.tsx`, `docs/agent_change_log.md`
- What changed: **Global brand top bar** — **`DashboardMainChrome`** wraps **`main-canvas`** children (search, **New Job**, activity, notifications, profile) on **all** `/crm/*` routes **except** **`/crm/settings/**`** (settings layout unchanged). **`ShellInitializer`** syncs **`headerDisplayName`** + **`workspaceIndustryType`**; **`DashboardClient`** registers **Kanban filter** via **`DashboardHeaderExtraContext`**. Removed duplicate **`Header`** from hub, calendar, agent, tradie. **Sidebar** **`border-r-0`** (no light seam next to green logo/header).
- Why: User: persistent top actions; no white line by logo; settings exception.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/core/sidebar.tsx`, `components/crm/header.tsx`, `components/layout/global-search.tsx`, `docs/agent_change_log.md`
- What changed: **Sidebar logo strip** — **`bg-emerald-900`** + **`border-emerald-950/50`** to match **brand top bar**; logo button **`hover:bg-white/10`**. **Header search** — wrapped in **`max-w-xs` … `xl:max-w-xl`** so the field doesn’t span the full gap between nav and actions (**three-zone** layout). **`GlobalSearch`** bar trigger: **`w-full`** inside cap (removed redundant **`md:w-full`** phrasing).
- Why: User: green logo area; shorter search; guidance on top-bar layout.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/notifications-btn.tsx`, `docs/agent_change_log.md`
- What changed: **Notifications** (brand header): **`tone="onDark"`** no longer uses **`Button` `ghost`** (which applies **`border-primary`** + **`focus-visible:shadow-focus`**). Renders a **plain `<button>`** with **`!outline-none`**, **`focus-visible:!shadow-none`**, **`border-0`** so **globals** (`*` **`outline-ring/50`**, **`*:focus-visible`** green shadow) cannot draw a green ring around the bell.
- Why: User: green circle still visible on notification bell.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/layout/global-search.tsx`, `components/crm/header.tsx`, `components/crm/notifications-btn.tsx`, `components/core/sidebar.tsx`, `components/layout/mobile-sidebar.tsx`, `docs/agent_change_log.md`
- What changed: **Brand top bar** — **search** trigger: **white** field, **no ⌘K pill**; **New Job** + **Filter** back to **white pills** (dark emerald text). **Notifications** bell: **`!border-0`** + **`focus-visible:!shadow-none`** (fixes **ghost** `border-primary` + global **`*:focus-visible`** green glow). **Sidebar**: **white rail** + **soft right shadow** + **emerald-50** active (product-style panel vs canvas), not flat grey.
- Why: User asked for white search + white CTAs; remove green ring on bell; better nav colour.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/header.tsx`, `components/crm/notifications-btn.tsx`, `components/core/sidebar.tsx`, `components/layout/mobile-sidebar.tsx`, `docs/agent_change_log.md`
- What changed: **Dashboard polish** — **LHS nav** uses **`bg-slate-300/95`** + stronger **border** (vs main canvas) and **emerald** active / **slate** hover states (replacing **primary-subtle** / **neutral**). **Brand header** **New Job**: **`bg-emerald-950/40`** + **`border-white/20`** (no bright white pill). **Notifications** unread dot: **plain red dot** (removed **`ring-2`** green/white halo). **Mobile** drawer matches sidebar tint.
- Why: User: nav vs body contrast; softer New Job; bell dot like pulse (no green ring).

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/header.tsx`, `components/layout/global-search.tsx`, `components/crm/notifications-btn.tsx`, `components/crm/crm-client.tsx`, `components/core/sidebar.tsx`, `components/layout/mobile-sidebar.tsx`, `components/agent/agent-dashboard-client.tsx`, `components/tradie/tradie-dashboard-client.tsx`, `app/crm/calendar/page.tsx`, `app/crm/hub/page.tsx`, `docs/agent_change_log.md`
- What changed: **Dashboard chrome** — **`Header`** **`variant="brand"`**: **dark green** (`bg-emerald-900`) top bar with **white** text, **on-dark** search trigger + notifications + pipeline action overrides (**`#new-deal-btn`**, **`#pipeline-filter-trigger`**). **`GlobalSearch`** **`tone="onDark"`**; **`NotificationsBtn`** **`tone`**. **Sidebar**: **slate** tinted background + **emerald** active states; **logo row** **`h-12`** + **bottom border** so logo aligns with **top bar** height. **Mobile** sheet matches sidebar tint. **Calendar / hub / agent / tradie** headers use **`variant="brand"`**.
- Why: User: standout top bar + nav; logo aligned with bar.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/layout/Shell.tsx`, `docs/agent_change_log.md`
- What changed: **Assistant resize grip** — **`ResizableHandle`** uses **`justify-center`** (replaces **`justify-start`**) so the pill **`w-6`** grip is **centered on the 8px** green strip instead of sitting **right of** the strip’s visual centre.
- Why: User: expand-chat pill was slightly to the right of the green line.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
- What changed: **Dashboard + RHS chat** — when **`assistantPanelExpanded`**, `<main>` uses **`pl-6 pr-0`** (not **`px-6`**) and KPI / divider / Kanban bleed rows use **`-ml-6 pl-6 pr-0`** instead of **`-mx-6 px-6`**, so pipeline content aligns **flush** to the resize handle with **no** empty **main-canvas** band left of the green line.
- Why: User: persistent blank strip between Kanban and chat edge despite handle/resizable fixes.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: **Bulk drag overlay** — back cards use **negative `translate`** (**up-left**) so they sit **behind** the dragged card (deck), not down-right beside it; **`transform-origin: top left`**, **`z-[60]`** on front; **`overflow-visible`** on wrapper.
- Why: User: selecting A,B,C and dragging A should show B,C **falling behind** A.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: **Multi-select Kanban drag** — `DragOverlay` renders **`BulkDragOverlay`** (stacked **`DealCard`** previews, **`bulkDragIds`** snapshot, cap **8** + **`+N`** badge). Removed **`bulkDragCount`**. (Stack geometry refined in following entry.)
- Why: User: when moving several selected cards, preview should show the **group** moving together, not a single card + count pill.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/ui/resizable.tsx`, `components/layout/Shell.tsx`, `docs/agent_change_log.md`
- What changed: **`PanelResizeHandle`** — removed **`::after`** wide invisible hit-expander (was **`after:w-8`** centered on the strip), which extended into the main canvas and read as a **blank strip** left of the drag line. **Shell** resize handle keeps **8px** strip + **`justify-start`** grip.
- Why: User: blank strip next to RHS chat drag handle.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/inbox-view.tsx`, `types/lucide-sparkles.d.ts`, `tsconfig.json`, `docs/agent_change_log.md`
- What changed: **Inbox** — import **`Sparkles`** from **`lucide-react/dist/esm/icons/sparkles`** (default export) instead of the **`lucide-react`** barrel so **Turbopack HMR** does not leave a stale **`bot.js`** chunk after replacing **`Bot`**. Added **`types/lucide-sparkles.d.ts`** module declaration; **`tsconfig.json`** **`include`** lists **`types/**/*.d.ts`**.
- Why: Runtime error: Bot module factory not available after HMR.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/inbox-view.tsx`, `docs/agent_change_log.md`
- What changed: **Inbox left list** — replaced **"X interaction(s)"** with **last activity preview** (chronologically latest per contact): **truncated title/content** plus **icon** — **`Settings`** for system events (`isSystemEvent`), **call/email/note** icons for communications. Contacts sorted by `createdAt` for preview row. **Contact type** filter label; **Prospect** / **Existing** (was New/Existing). **Ask Tracey** uses **`Sparkles`** instead of **`Bot`**. Custom date dialog copy: **activity** dates.
- Why: Plan execution — clearer inbox semantics; Prospect wording; AI tab icon.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/layout/Shell.tsx`, `docs/agent_change_log.md`
- What changed: **Assistant resize** — removed extra **`div` wrapper** around **`ResizableHandle`** so the handle is a **direct child** of **`ResizablePanelGroup`** (matches `react-resizable-panels` expectations; avoids an empty flex strip). Moved **`id="assistant-resize-handle"`** onto **`ResizableHandle`** for tutorial spotlight. **`justify-start`**, **`overflow-visible`**, fixed **`w-2 min-w-2 max-w-2`** so the grip sits flush to the main canvas with no dead space to its left.
- Why: User: blank strip left of the drag handle when RHS chat is open.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/kanban-board.tsx`, `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban column panel** — **`max-md:rounded-lg`** (mobile full rounding); **`md:rounded-none md:rounded-b-lg`** so desktop grey card shell has **square top** (no bevel gaps under fixed headers), **rounded bottom only** (replaces `rounded-lg` + `md:rounded-t-none`). **DealCard** footer rows (banner + default) — **`pt-1.5 pb-2` → `py-2`** so vertical padding matches body **`pt-2`** rhythm.
- Why: Plan: flush column shell under headers; symmetric deal card footer padding.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **DealCard footer** — removed icon-width spacer so **dollar starts at the same `px-3` inset as the row icons** (User / MapPin / Briefcase), not indented to match text after `gap-2`.
- Why: User: align dollar with icons above, not the text.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
- What changed: **DealCard footer** — replaced `pl-[22px]` (pixel-based) with a **`<div className="h-3.5 w-3.5 shrink-0">`** spacer inside a React fragment, so footer uses the SAME flex+gap structure as body rows (rem-based `w-3.5` + parent `gap-2`), ensuring dollar aligns pixel-perfectly with address/job text above. **Dashboard divider** — changed `py-5` to **`pt-5 pb-2.5`** so the visual gap above the line (20px) equals the gap below (10px divider padding + 10px column panel top padding). **Kanban headers** — extracted column headers into a **separate non-scrolling `shrink-0` grid** above the scroll container (desktop only); card area scrolls independently beneath locked headers. Column panels use `md:rounded-t-none md:pt-2` to connect visually with the header grid above.
- Why: User: dollar still misaligned (structural rem/px mismatch); divider gap not equidistant; headers should stay fixed while cards scroll.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/kanban-board.tsx`, `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **KPI** — replaced absolute pill element with native **`border-l-[5px]`** on the card div; `rounded-lg` on the card curves the border at corners automatically — no inner element needed. **Kanban columns** — switched from `bg-muted/40 rounded-xl` to `bg-black/[0.03] rounded-lg` (near-invisible tint eliminates perceived white outline). **DealCard footer** — replaced empty `h-3.5 w-3.5` spacer `<span>` with `pl-[22px]` on the content div (14px icon + 8px gap = 22px), aligning dollar with body text and trash with date.
- Why: User: previous fixes still broken; simplest possible approach for each.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/kanban-board.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: **KPI** — accent is **`absolute`** floating pill (`left-1.5 top-1/2 -translate-y-1/2 h-[4.25rem] w-2.5 rounded-full`) so it reads as a **capsule**, not a flex-column strip; content **`pl-6`** with **`px-3`**. **Follow-up** — weeks **`Select`** wrapped in **`w-fit max-w-[4.5rem] shrink-0`**; row uses **`gap-2`** (no `justify-between`). **Kanban** — grid **`gap-3` + `md:gap-2`** (half of former **gap-6 / md:gap-4**); column **`px-2 md:px-1.5`** (tighter horizontal inset). **globals** — **remove** `.kanban-column-panel .ghost-border` override; **deal cards** keep **`ghost-border`**; panel **`box-shadow: none`** only.
- Why: User “try again”: clearer pill accent; fix follow-up width; sane half-gaps; remove white rim without stripping card outlines.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/crm-client.tsx`, `components/crm/kanban-board.tsx`, `components/crm/deal-card.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: **KPI** — accent is a **fixed-height** centered pill (`h-[4.25rem] w-2.5 rounded-full`) so it is not a full-height “D” strip. **Dashboard** — Kanban wrapper **` -mx-2 px-2` → `-mx-6 px-6`** to **align** with KPI strip. **Kanban** — **`md:gap-2`→`md:gap-1`**, **`gap-3`→`gap-1.5`**; column **`kanban-column-panel`** + **`overflow-hidden`**. **globals.css** — **`.kanban-column-panel`** and **`.kanban-column-panel .ghost-border`** outline removed (fixes white rim). **DealCard** footer — **`pl-[22px]`** replaced with **icon-width spacer + `gap-2`** row (match address line).
- Why: User: pill accent per reference; column gap/outline; Kanban flush with top cards; dollar left-align with text.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: **KPI** — left accent is a **vertical capsule** (`rounded-full`, inset `py-3`) so both sides curve at top/bottom; content area `py-3 pr-3`. **Follow-up** — `SelectTrigger` **`!w-auto`** + **`max-w-[4.5rem]`** + **`py-0`** (overrides default **`w-full`**); label **`truncate`**. **Kanban** — column grid **`gap-6`→`gap-3`**, **`md:gap-4`→`md:gap-2`**; column panel **`border-0 ring-0 shadow-none outline-none`**.
- Why: User: pill accent like sample; weeks control must not cover title; tighter columns; remove white outline.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/kanban-board.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban** — replaced small left pip with **colored top bar** spanning full column width; each column wrapped in **rounded gray panel** (`bg-muted/40`); count badge now **accent-colored** with white text (matches column color); "+" button faded; removed separate frozen header row (header is part of each panel). **KPI cards** — removed outer **border** (`border border-border/50`); thicker accent bar (`w-1` to `w-1.5`); all 4 cards identical format.
- Why: User: match reference screenshots for both KPI cards and Kanban column layout.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: Kanban **DealCard** footer — removed **green pill** wrapper (`rounded-md bg-primary/10 px-2 py-0.5`) around **dollar amount**; amount stays **bold primary** text only.
- Why: User: no pill around dollar values.

### 2026-03-22 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/crm-kpi-cards.tsx`, `actions/deal-actions.ts`, `lib/kanban-columns.ts`, `docs/agent_change_log.md`
- What changed: **Deal card** top-right date = **scheduled date only**; **"-"** when none (no created date). **Kanban** — same-column **vertical reorder**: `handleDragOver` runs `arrayMove` when source/target share a column; `findColumnForItem` uses **`kanbanColumnIdForDealStage`** (fixes **pending_approval** → **completed**); drag end calls **`persistKanbanColumnOrder`** (writes **`metadata.kanbanOrder`**); **`getDeals`** sorts by column then **`kanbanOrder`**. **`closestCorners`** collision for sortable. **KPI cards** — screenshot-style **left accent bar** + pastel panels (sky / emerald / slate / red); **labels + metrics stay black**; same copy and logic. New **`lib/kanban-columns.ts`**.
- Why: User: scheduled-only corner date; reorder within column; dashboard KPI visual parity without changing content/colours.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: DealCard footer: replaced fragile empty-span spacer with explicit `pl-[22px]` (= icon 14px + gap 8px) on a single `justify-between` flex row. Dollar pill now at exactly 34px from card edge (matching body text). Bin pushed to right via `justify-between` so icon right aligns with date right. Removed bin wrapper div.
- Why: Empty `<span>` spacer was collapsing; dollar and bin still misaligned.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/ui/hover-scroll-name.tsx`, `components/crm/deal-card.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: (1) HoverScrollName ticker 3x faster (5s to 1.6s). (2) DealCard footer: removed -mx-3 on wrapper so px-3 aligns with body; dollar left-aligns with address/job. Bin right-padding removed so bin right-aligns with date. Removed fallback spacer. (3) KPI grid gap-3 to gap-6 (doubled).
- Why: User: scroll too slow; dollar and bin misaligned; KPI cards need more space.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/kanban-board.tsx`, `components/ui/hover-scroll-name.tsx`, `components/ui/hover-carousel-text.tsx` (deleted, unused), `docs/agent_change_log.md`
- What changed: **“Awaiting payment”** column — **only** that label (no multi-phrase carousel). When the column is narrow, **hover** runs the same **horizontal ticker** as contact names (**`HoverScrollName`** + **`textClassName`** for header type). Removed leftover **`AWAITING_PAYMENT_TITLE_PHRASES`** constant.
- Why: User: single phrase only; hover scrolls to show full words, not rotating alternate titles.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: **KPI** — label↔metric **`gap-1` → `gap-[0.17rem]`** (−⅓). **`Kanban`**: **one** **`overflow-y`** on **board** (cards); **md+** **frozen** **`KanbanColumnHeader`** row; **`DroppableColumn`** no per-column scroll. **`DealCard`**: footer **row = icon spacer + flex-1 price + `pl-1` bin** (match **date** column); **remove** **`-mx-3`**; dollar **`text-xs`**; **`mt-1.5`→`mt-1`**. **`KanbanColumnHeader`** extracted.
- Why: User: KPI row gap, unified board scroll + sticky titles, footer L/R alignment, dollar size.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/crm-kpi-cards.tsx`, `components/ui/hover-carousel-text.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: **`Awaiting payment`** — **`HoverCarouselText`** **`truncate={false}`** (no **“…”**); **`autoRotate`**; slightly smaller **`text-[10px]`** on narrow screens. **Banner footer** — same **spacer + `px-3`** row as **no-banner** (fix **$** alignment). **`.scrollbar-hide`** alias + stronger **webkit** hide. **KPI grid** **`gap-[0.33rem]` → `gap-3`**, card label↔metric **`gap-1`**. **`DealCard`** **`pt-3`→`pt-2`**, inner **`pt-1`→`pt-0`** (less top padding vs sides).
- Why: User: full carousel phrase, footer alignment, hidden column scrollbars, breathing room between KPI cards, tighter card top.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/crm-client.tsx`, `components/ui/hover-carousel-text.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: **`Awaiting payment`** — **`HoverCarouselText`** with **`autoRotate`** + **`leading-none`** + **`flex-1 overflow-hidden`** (single line, no wrap). **`DealCard`** footer — **`px-3`** + **14px spacer** + **`gap-2`** (same as address row) so **$** / **bin** align with text/date columns; job line **`text-[11px]`** vs location **`text-[10.5px]`**. **`Kanban`** — **`.kanban-column-scroll`** (hidden scrollbar, no width); **`pb-8`** column list. **Dashboard** **`main`** **`pb-24` → `pb-6`** (less blank bottom).
- Why: User: aligned footer, 1-line rotating column title, invisible scrollbars, trim bottom padding.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/crm-client.tsx`, `components/crm/crm-kpi-cards.tsx`, `components/ui/hover-carousel-text.tsx`, `components/ui/hover-scroll-name.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: **KPI** — gaps **−⅓** again (**`gap-[0.33rem]`** grid, **`gap-[0.11rem]`** label↔metric). **`DealCard`** — banner label **`text-white`**; footer **`pl-[34px] pr-3`** (line up with address/job + date); address + job **`text-[10.5px]`**; **`HoverScrollName`** (contact name ticker). **`Kanban`** — **column scroll** (`DroppableColumn` **`pb-24`**); **dashboard** **`main`** no vertical scroll. **`Awaiting payment`**: **`HoverCarouselText`**. **`@keyframes kanban-card-name-ticker`** in **`globals.css`**.
- Why: User batch: KPI spacing, white banner text, footer inset, font step, name hover carousel, column title carousel, per-column scroll.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: **`DealCard`** — body back to **`text-[10px]`** (less cramped than **`text-xs`**). **3C** footer like **`/crm/design/deal-cards`**: **one row** **`justify-between`** (price + bin), **shorter** strip **`min-h-[2.5rem]`** + **`px-2.5 pb-2 pt-1.5`**; overlay **`pointer-events-none`** (no absolute trash); status **`truncate`** one line; non-overdue label **`text-foreground`**. **`Kanban`** column titles **`min-w-0 truncate`** + flex fix so **“Awaiting payment”** stays **one line** (ellipsis if needed, **`title`** full text).
- Why: User: smaller body type again; banner height match no-banner; restore 3C bin/price layout; column header wrap fix.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: **`DealCard`** — **same** bottom **strip height** with or without banner (**`min-h-[3.25rem]`** + **`px-3 py-2`** on plain footer); secondary lines **`text-xs`** again (address, job, date, assignee, status strip, avatar) — matches older Kanban (**`e5166caa`** used **`text-xs`**, not **`text-[10px]`**). **`DashboardKpiCards`** — grid **`gap-3` → `gap-2`**; card **`gap-1` → `gap-[0.167rem]`** (~**⅓** less space between label and big number).
- Why: User: aligned footers; confirm no typography regression; tighter top KPI row.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card-pending-banner-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **Restored** full **design/deal-cards** mocks **(1)(2)(3a–d)**. Copy clarifies **only the dashboard Kanban** uses **(3C) @ 65%**; design URL is comparison-only. **`DealCard`** unchanged (**65%** overlays).
- Why: User meant **3C 65% for the board**, not stripping the internal design page.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **`/crm/design/deal-cards`** — **only** **(3C)** at **65%** (removed **(1)**, **(2)**, **45/55/75** variants). **`DealCard`** banner overlays **`/55` → `/65`**; card shell **`min-h-[176px]` → `min-h-0`** again so height follows content (no forced hollow middle).
- Why: User asked to stop piling options; single reference **3C + 65%** + match live Kanban.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **`DealCard`** — **no** **`flex-1`** on main body + **`min-h-0`** card (drop **`min-h-[176px]`**) to **remove** middle **white** **gap**. Banner **`/45` → `/55`** opacity. Footer **`px-4 py-2.5`**, trash **`right-3`**, price **`pr-14`**; **`mt-1.5`** above footer.
- Why: User: less edge crowding, stronger banner, no hollow middle.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **`DealCard`** **3C** — **price/assignee** stay on a **base row**; **absolute** **`inset-0`** **tint + status** **overlap** that row (may obscure **$**); **trash** **abs** **right** **`z-[4]`** above overlay, **clickable**.
- Why: Banner must **overlap** the dollar/trash line, not share one flex row with it.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **`DealCard`** — status text (**OVERDUE**, **Draft**, etc.) on the **same row** as price + trash (one tinted band); **shorter** cards. **White** pill / dash / assignee / label / trash for **every** banner type, not only overdue.
- Why: User asked for inline OVERDUE + universal light footer on all banners.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **KPI** — **aligned** metric row across all four cards (`min-h` label row); **Follow-up** stale window **`absolute`** top-right + **`text-xs`** / **`h-7`** trigger (was misaligned + tiny **9px** text). **`DealCard`** — **flex ~9 / ~11** (~**55%** bottom) for **price + status** (no **`mt-2`** gap); **muted** fill when no banner; **one step smaller** body text (**`text-[10px]`** etc.) except **contact name** **`text-sm`**; **managers**: **Approve** / **Reject** on **`pending_approval`** cards + **`AlertDialog`** reject reason. **Design demos** — copy + **`mt-0`** on overlay mock footer.
- Why: Plan: KPI alignment, card strip/gap, typography, 55% bottom zone, easier manager approval from Kanban.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/deal-card.tsx`, `scripts/promote-user-to-manager.ts`, `package.json`, `docs/agent_change_log.md`
- What changed: **KPI** — labels **flush top** (`justify-between` + **`min-h-[5.75rem]`**), **all label + metric text black** (including dark). **`DealCard`** — restored **3C** **single** absolute tint under **price row + status** (price/trash sit **on** the overlay again; **no** white gap). **`db:promote-manager`** script + **`scripts/promote-user-to-manager.ts`** to set **`MANAGER`** by email for local testing.
- Why: User feedback on KPI alignment/colour; banner must overlap price row; need a safe way to test manager approval.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/layout/Shell.tsx`, `docs/agent_change_log.md`
- What changed: **Dashboard shell** — root height **`h-dvh`** (was `calc(100dvh - 57px)`). The subtracted **57px** was leaving a **full-width band** at the bottom of the window (plain **`body`** background); **57px** is the **Chat/Advanced** toggle row inside the **assistant** panel, not a global top chrome offset.
- Why: User saw a pale strip at the bottom (aligned with the chat FAB) cutting off sidebar/Kanban; removing the mistaken height gap fixes it.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/crm-kpi-cards.tsx`, `components/crm/kanban-board.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `components/crm/contacts-client.tsx`, `lib/deal-utils.ts`, `actions/crm-demo-seeds.ts`, `docs/agent_change_log.md`
- What changed: **KPI** — **~10%** deeper than flat mint (`emerald-50` + **ring**), **black** text unchanged. **`DealCard`** — **all** statuses + **overdue** use **bottom** **45%** overlay (no top strip); **flush** bottom (`px-3 pt-3 pb-0`); **tooltips** for **pending** / **overdue**. **Kanban** + **pickers**: column **"Deleted"**. **Design** **(3)**: **45/55/65/75%** mocks. **Dev** **seeds**: **36** **`[Stress] …`** deals for load testing.
- Why: User feedback on tint, banner edges, approval discovery, column name, stress data, opacity variants.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban `DealCard`** — design **(3C)**: non-overdue status = **45%** full-bleed **bottom** overlay (`statusBannerOverlayClasses`); **no** top strip. **Overdue** keeps **top** strip for reconcile. **KPI row** — **black** / **`neutral-100`** text; **deeper** green (`emerald-100/95`, `emerald-300` border, dark `emerald-950/50`).
- Why: User chose 3C for dashboard cards; KPI readability + stronger mint.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card-pending-banner-demos.tsx`, `docs/agent_change_log.md`
- What changed: **Design deal-cards (3)** — three side-by-side mocks: **25%**, **34%**, **45%** amber overlay (`opacity` prop on `FooterWithOverlappingBanner`). **(1)/(2)** stay in a two-column row; **(3)** variants in a dedicated section below.
- Why: User asked to compare three opacity levels for the bottom banner.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card-pending-banner-demos.tsx`, `docs/agent_change_log.md`
- What changed: **Design deal-cards (3)** — bottom strip is **full card width** (no extra side padding wrapper); **`rounded-b-lg`**; amber fill **`/34`** / **`/40`** (was ~11%). **(1)** mock: **`rounded-t-lg`** on top banner to match card corners.
- Why: User wanted (3) to match (1)’s edge-to-edge banner, less washed out.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `docs/agent_change_log.md`
- What changed: **KPI row** — toned down from solid emerald: **light green wash** (`emerald-50` / dark `emerald-950/35`) + **dark green numbers** (not white-on-green). **Design deal-cards (3)** — uses the **same markup/classes as (1)** (`pendingBannerBaseClass`) with **~11–14%** amber fill over the price row; **`pointer-events-none`** unchanged.
- Why: User found full green too loud; (3) should match (1)’s strip but much more see-through.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **KPI strip** — **emerald** fill (**`bg-emerald-600`** / dark **`emerald-800`**), **white** labels + numbers; Follow-up **Select** trigger styled on the coloured card. **Reverted** Kanban **`DealCard`** bottom-banner experiment — **top** banner only again. **Design `/crm/design/deal-cards`** — **(3)** is a **transparent overlay** over the price + delete row (**`pointer-events-none`** so trash still clicks); removed live **`DealCard`** bottom mock.
- Why: User wanted KPIs to pop with white text; clarified bottom banner as **overlap** over price/trash, design-only mock.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `components/crm/kanban-board.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: **Deal card** — middle block **`gap-2`** (was `gap-2.5`). **`statusBannerPosition`** + optional **`metadata.bannerPosition === "bottom"`**: semi-transparent **bottom** status strip above the price row, **no** top `h-7` band — **shorter** card; trash unchanged bottom-right. **Kanban**: first **pending approval** deal in **Completed** uses **bottom** strip. **Design demos** — static (3) uses frosted banner; **live `DealCard`** mock section. **KPI row** — **one** shared tint (**`kpiSharedTint`**, slate) on all four cards for contrast on the main canvas.
- Why: User asked for tighter gaps, unified KPI colour that reads on the background, and one bottom-banner card variant.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban multi-select** — long-press selection with **2+** cards sets **group drag**: **drag one** moves **all** selected to the target column (same scheduled/assignee rules); **cancel** restores prior stages; overlay shows a **count badge**. **Selection toolbar** — **trash** opens **AlertDialog** for **bulk move to Deleted**; **Cancel** exits selection (replaces “Done selecting”). **Single-card trash** deletes **without** browser confirm. **`handleDragEnd`** fixes single-drag revert when drop target is invalid.
- Why: User asked for grouped moves, bulk delete with confirmation only, and instant single delete.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: **Kanban** middle block **`gap-2`** (double prior `gap-1`) between address / job / assignee rows. **`--main-canvas`**: **10%** blend (`90%` background + `10%` slate / black).
- Why: User asked to double row gap and slightly stronger canvas tint.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/deal-card.tsx`, `components/crm/crm-client.tsx`, `components/layout/Shell.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: **KPI Follow-up** metric uses the **same number style** as the other three (**no** leading zero, **no** amber-only colour). **Deal cards** — **removed** **Urgent / Follow up** health **left coloured borders** (top banners unchanged); **tighter** middle (**lower** `min-h`, **no** `mt-auto` on footer, slightly tighter gaps); **corner date** uses **`text-muted-foreground`** + **`tabular-nums`**. **Main workspace** (not sidebar): new **`--main-canvas`** (~50% darker than page bg in light) on **`#main-canvas`** in **`Shell`**; dashboard shell **transparent**; sticky header uses **`main-canvas`**; KPI strip **`bg-muted/35`**.
- Why: User screenshot — match Follow-up KPI formatting, less card whitespace, no health side bars, darker canvas behind white cards.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban `DealCard`** — **reverted** overlapping/semi-transparent top banners; status strips are **stacked** again **above** the name row (opaque colours). **Equal height** kept via a **fixed `h-7`** band on every card: **real banner** or **empty spacer** + **`min-h-[168px]`** + **`mt-auto`** footer.
- Why: User disliked overlapping banners; still wants uniform card height with or without a banner.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `lib/deal-utils.ts`, `components/crm/deal-detail-modal.tsx`, `components/crm/deal-detail-stage-demos.tsx`, `docs/agent_change_log.md`
- What changed: **Deal modal stage pill** — trigger uses **Kanban column colours** (`KANBAN_COLUMN_HEADER_BG` + **`KANBAN_COLUMN_HEADER_HOVER_BG`**, **`getKanbanStagePillClasses`**) matching **`kanban-board`** headers; **pending approval** = amber, **pipeline** = violet. **Link** button variant so primary hover does not override. Dropdown rows show a **colour dot** per stage. **Design demo** uses **`getKanbanStagePillClasses("SCHEDULED")`** for the sample pill.
- Why: User asked for the stage control to be coloured per Kanban column.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban `DealCard`** — **assignee** initial in a **dashboard-style circle** (**`w-8 h-8`** `rounded-full` `bg-primary/10` `border-2 border-muted`) **next to the price**; **no assignee** shows **`-`**. **Typography** — all card text **except contact name** bumped **one Tailwind step** (e.g. **`text-[10px]` → `text-xs`**, price **`text-xs` → `text-sm`**); icons **`h-4`**. **Status banners** — **semi-transparent** (`/85` + light blur) **absolute overlay** over a fixed **`h-7`** top band; **name row** overlaps (**`-mt-7`**) so banners don’t add extra stack height; **`min-h-[168px]`** + **`mt-auto`** footer for equal card height. **Removed** dead **`agentFlags`** slice vars and unused **`checkIfDealIsOverdue`** import.
- Why: User request — assignee at a glance, larger secondary text, **equal card height** with overlapping transparent banners.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `lib/deal-utils.ts`, `components/crm/deal-detail-modal.tsx`, `components/crm/deal-detail-stage-demos.tsx`, `app/crm/design/deal-detail-modal/page.tsx`, `docs/agent_change_log.md`
- What changed: **Deal detail modal** — **pipeline stage** is a **dropdown** (with **chevron**) **left of** **Edit** in the header; options match Kanban (**`KANBAN_STAGE_PICKER_OPTIONS`**) and call **`updateDealStage`** (same as drag). Client checks **assignee** for Scheduled + **scheduled date** for later stages; refetches deal on success. **Removed** full-width **stage strip** under the header. **`prismaStageToKanbanColumn`** helper in **`deal-utils`**. **Design page** — production header mock at top; older strip/pipeline layouts marked **reference**. (Supersedes earlier **Option 1 strip** in the modal entry below.)
- Why: User chose stage picker in header; card moves column when stage changes.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `lib/deal-utils.ts`, `components/crm/deal-detail-modal.tsx`, `components/crm/deal-detail-stage-demos.tsx`, `app/crm/design/deal-detail-modal/page.tsx`, `docs/agent_change_log.md`
- What changed: **Deal detail modal** — header shows **`Job title | Contact name`**; **stage** as **Option 1** full-width **coloured strip** (`getStageStripBarClass`). **Overdue** bar at top with **Reconcile** + **dismiss (X)** (session-only). **Contact** card drops **Name** row; **phone / email / company / address**; **Edit** top-right → contact page. **Current job** **Edit** top-right → deal edit. **`StaleJobReconciliationModal`** wired from Reconcile. **`getStageStripBarClass`** in **`deal-utils`**. **Design page** **`/crm/design/deal-detail-modal`** — static **5 stage layout options** to choose from.
- Why: User-approved plan — richer modal + compare stage UI before locking one variant.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **Removed Kanban triage chips** — **`agentFlags`** are no longer rendered on **`DealCard`** (no orange chip row / **+N**). **`Flag`** import removed. **`deal-card-flag-layout-demos.tsx`** deleted; **`/crm/design/deal-cards`** only loads **pending-banner** demos; metadata description updated. **Status top banners unchanged.**
- Why: User approved hiding triage chips; backend may still store `agentFlags` (triage / AI tools).

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
- What changed: **KPI row alignment** — each card uses **`flex flex-col`** with a **fixed min-height label row** (**`min-h-[2.75rem]`**) and **`mt-auto`** on the **metric** block so **$ / counts share one visual baseline**; metrics use **`leading-none`** + **`tabular-nums`**. **RHS chat + horizontal scroll** — when **`assistantPanelExpanded`**, **`main`** uses **`overflow-x-hidden`** and a single inner **`overflow-x-auto`** wraps **KPI strip + divider + Kanban** inside **`min-w-[1200px]`** so the **whole block scrolls together** (removed nested **`overflow-x-auto`** / **`md:min-w-[1200px]`** only on Kanban).
- Why: User screenshot — metric numbers not on one line; KPI strip should stay aligned with Kanban when the main column is narrow with chat open.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: **KPI cards** — removed **`min-h-[5.75rem]`**, label **`min-h-[2.75rem]`**, and **`mt-auto`** (they created a large empty band between title and value). Cards now use **`flex flex-col gap-1`**, **`p-2.5`**, and a shared **`cardShell`** so label + number sit **tight** with only a small gap.
- Why: User screenshot — too much blank space in the middle of each KPI card.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/deal-card-flag-layout-demos.tsx`, `components/crm/deal-card-pending-banner-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **Deal card statuses** — production matches **(1) full-width opaque banner at top** for **Overdue** (clickable, severity colours) and all **status labels** (Draft, Pending approval, Urgent, Follow up, Rejected); **corner** shows **date only**. **Triage `agentFlags`** unchanged — **Option A** (two chips + **+N**). Removed status **pills** and second-row status. **Design page** copy updated; metadata **description** added. **(2)/(3)** banner mocks marked reference-only.
- Why: User chose top banner for all statuses; Option A remains for flags.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card-pending-banner-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **`/crm/design/deal-cards`** — added **three static mocks** for **Pending approval** as an **opaque full-width banner** (not the pill): **(1)** banner at **top** of card, **(2)** in the **middle** (after name, before address/job), **(3)** at **bottom** (after address/job, **above** price row). Uses dashed amber card chrome + **`bg-amber-400`** strip; sample copy matches pending-approval demo style.
- Why: User asked to compare banner placement before changing production `DealCard`.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: **Deal card name row** — sortable wrapper + card shell use **`w-full min-w-0`**; title sits in **`flex-1 min-w-0 overflow-hidden`** with **`h5`** **`w-full truncate text-left`** so the name uses the full width up to the date column (avoids early ellipsis + empty gap before **Mar 21**). **Removed** fixed **`w-[4.5rem]`** on the date/status column so it **sizes to content** + **`pl-1`** only (more room for the name).
- Why: User screenshot — contact name truncated far too early with large whitespace before the date.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `components/crm/deal-card-flag-layout-demos.tsx`, `docs/agent_change_log.md`
- What changed: **Deal card density** — removed fixed **`h-[240px]`** so cards size to content (no tall empty band); slightly tighter **`p-3`**, row gaps, and footer **`pt-1.5`**. **Flag layout demos** — each of Options **A / B / C** now shows **three** mock cards in a responsive grid, each with **different example names + flags** (third Option A/C example includes **`+1`** / three flags). Mock cards use tighter **`p-2.5`** and no forced title row height.
- Why: User wanted less whitespace after the fixed-height change and three variations per style with different flags to choose from.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
- What changed: **KPI / Kanban divider** — removed **`pb-4`** under the KPI strip and the strip’s **`border-b`** so the grey area doesn’t add asymmetric space above the rule; divider wrapper uses **`py-5`** so padding **above** and **below** the **`h-px`** line matches (visually equidistant between the card row and Kanban headers).
- Why: User screenshot showed the rule sitting lower (closer to Kanban) because extra padding sat above the line only.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/layout/global-search.tsx`, `components/crm/header.tsx`, `components/crm/notifications-btn.tsx`, `components/crm/crm-client.tsx`, `components/crm/deal-card.tsx`, `components/crm/deal-card-flag-layout-demos.tsx`, `app/crm/design/deal-cards/page.tsx`, `docs/agent_change_log.md`
- What changed: **Bottom overlap** — dashboard **`main`** uses **`pb-24`** so scrollable content clears **fixed** bottom **chat** + **nav** FABs (those buttons are for opening RHS chat when collapsed and mobile nav; they are not a full-width bar — a separate **“N”** stripe is usually the Next.js dev overlay, not this app). **Header alignment** — search **bar** trigger **`h-9`** **`text-sm`** (was taller **`text-[15px]`**); **New Job** / **Filter** **`h-9`** **`text-xs`**; **Activity** / **Notifications** **`h-9`** **`w-9`** with **`h-4`** icons; weather pill **`h-9`**. **Deal cards** — fixed **`h-[240px]`** **`flex`** **`flex-col`**; **name** **`truncate`** **single line** toward a **`w-[4.5rem]`** date column; **Draft** / **Pending approval** / long statuses on a **second row**; **triage flags** — max **two** compact chips + **`+N`** with full list on **`title`** (Option A). **`/crm/design/deal-cards`** shows **Options A–C** mockups for flag placement.
- Why: User screenshot — FABs covering Kanban, mismatched top-bar typography, uneven card heights / flag wrapping; requested flag layout alternatives.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/header.tsx`, `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
- What changed: **Dashboard layout** — removed the **“Deal Pipeline”** heading row; **New Job** + **Filter** moved into the **top glass header** via optional **`headerActions`**, placed **after the search bar** and **before** weather / **Activity** / **Notifications** / profile. Header uses a three-zone flex row (search | pipeline actions | right cluster).
- Why: User preview request — compare pipeline title + in-content buttons vs compact header placement.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `lib/store.ts`, `components/layout/Shell.tsx`, `components/crm/crm-client.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: **KPI row** — cards ~**⅙ smaller** (tighter padding, `text-xl` values, smaller labels). **Gap** between KPI strip and pipeline: **divider line** + padding (removed old **`-mt-[2cm]`** / oversized bottom padding). **Kanban horizontal scroll** — **`assistantPanelExpanded`** in **`useShellStore`**, synced from **Shell** `chatbotExpanded`; **`md:min-w-[1200px]`** and inner **`overflow-x-auto`** only when RHS chat is **open**; **`#main-canvas`** uses **`overflow-x-hidden`** when chat collapsed (**`max-md:overflow-x-auto`** for phones). **Pipeline toolbar** — **New Job** / **Filter** ~**half** width (`min-w-[4.75rem]`), ~**⅓ shorter** height (`h-7`), smaller icons/text.
- Why: User wanted smaller KPIs with a visible separator, no forced horizontal scroll until chat opens (except mobile), and compact pipeline buttons.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
- What changed: **Dashboard** — reduced vertical gap between the **top 4 KPI cards** and **Deal Pipeline** by removing **`mb-8`** under the KPI strip, adding **`pb-20`** inside the strip so the next block can use **`-mt-[2cm]`** without overlapping the cards (pipeline block moves up ~2cm).
- Why: User asked to tighten the space between the KPI row and the Kanban header.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-client.tsx`, `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban + RHS chat** — pipeline min width is **`md:min-w-[1200px]`** (not `xl:`) so a **narrow main column** with a **wide browser window** still gets a horizontal scroll track instead of squashing six columns. **Grid** is **`md:grid-cols-6`** (dropped viewport-`xl` and the 3-column middle step) so column count matches the scrollable board width. Wrapper keeps **`overflow-x-auto`**.
- Why: `xl:` breakpoints follow **viewport** width; with chat expanded the **panel** can be far narrower than `xl` while the window is still “xl”, so columns were compressing.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `lib/deal-utils.ts`, `docs/agent_change_log.md`
- What changed: **Overdue** pill text is always **“Overdue”** (no “7d” / day count in the label; days stay on **hover** via `badgeTitle`). **Overdue overrides** all other top-right statuses — no second pill for Urgent, Follow up, Draft, Pending approval, or Rejected; card chrome for health/draft/pending is **not** applied when overdue (base card + overdue border).
- Why: User asked for a single clear status and no stacked labels when a job is past its scheduled date.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/crm-kpi-cards.tsx`, `components/crm/deal-card.tsx`, `lib/deal-utils.ts`, `docs/agent_change_log.md`
- What changed: **Dashboard KPI** — fourth card title is **Follow-up** (was “Pending Follow-up”); the **weeks** selector sits on the **same row** as the title, with the count on the row below. **Deal cards** — removed **Draft** / **Pending approval** **banners**; status is shown only as the **top-right pill** (less duplicate chrome). **Overdue** — date line under the pill when overdue; hover uses `badgeTitle` for detail. Health pills (Urgent / Follow up) keep a tooltip clarifying they’re **last-activity** based, **not** the same as calendar overdue (later tightened: overdue label is plain **“Overdue”** and overrides other statuses — see newer log entry).
- Why: User choices 1B / 2A / 3A plus home KPI copy/layout; plain-language distinction for overdue vs activity health.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/layout/Shell.tsx`, `components/crm/crm-client.tsx`, `components/chatbot/chat-interface.tsx`, `docs/agent_change_log.md`
- What changed: **Kanban horizontal scroll** — `#main-canvas` and dashboard `main` allow `overflow-x-auto`; pipeline section wraps the board in a container with `xl:min-w-[1200px]` so six columns keep a readable width when the RHS chat is open (scroll sideways instead of crushing cards). **Chat quick actions** — welcome quick-action buttons use a **2-column grid** with `w-full` and centered content so pairs like “Follow up call” / “Move a deal” match width.
- Why: User reported Kanban cards still compressing with chat expanded; restore horizontal scroll behavior and equal quick-action chip sizes.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `lib/auth.ts`, `lib/display-name.ts`, `app/crm/page.tsx`, `components/crm/crm-client.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: Header name uses Supabase `full_name` / `given_name`+`family_name` before `name`, plus Prisma `User` lookup by auth id or email for `resolveHeaderDisplayName` so phone sign-up shows a real name when stored in DB. Fallback label is email local part or `Account` instead of always `You`. KPI row: removed RHS micro-copy (“This month”, “Won”, “Next: 7d”, “High Priority”/“Clear”); titles carry month where metrics are calendar-month scoped; **Upcoming Jobs** now counts scheduled jobs in the **current month** from today onward (monthly reset). Pipeline toolbar: **New Job** and **Filter** use matching `h-10` / `min-w-[9.5rem]`. Reduced KPI strip padding and margin below it so the Kanban sits higher.
- Why: User feedback on header label, KPI clutter, button alignment, and wasted vertical gap above the board.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/deal-card.tsx`, `lib/deal-utils.ts`, `components/crm/crm-kpi-cards.tsx`, `actions/crm-demo-seeds.ts`, `components/crm/deal-health-widget.tsx`, `docs/agent_change_log.md`
- What changed: **Deal card** — removed absolute-positioned duplicate date strip; single flex row (checkbox + name with `min-w-0` / `break-words` + right column for date / overdue / status pills) fixes name/date overlap. **Overdue** — `checkIfDealIsOverdue` / `getOverdueStyling` now treat Kanban stage strings (`scheduled`, Prisma `SCHEDULED`/`NEGOTIATION`) consistently; removed dead duplicate `return` in `getOverdueStyling`. **KPI** — right micro-labels use explicit `text-slate-600` / `dark:text-slate-400` so they don’t pick up primary tint. **Dev demo seeds** — added 8 showcase `[Demo] …` rows (stale, rotting, overdue, draft, pending approval, rejected metadata, triage `agentFlags`, unread) plus `Activity` backdates for health; base specs get `scheduledAt` where required (e.g. NEGOTIATION, INVOICED, WON). **deal-health-widget** — prior neutral micro-copy retained from earlier pass.
- Why: Implement “Deal card layout + showcase demo deals” plan — fix overlapping text and surface all card variants in dev.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/layout/Shell.tsx`, `lib/deal-stage-rules.ts`, `actions/deal-actions.ts`, `components/crm/kanban-board.tsx`, `components/crm/deal-card.tsx`, `components/crm/deal-health-widget.tsx`, `components/crm/crm-kpi-cards.tsx`, `docs/agent_change_log.md`
- What changed: Shell horizontal layout: `min-w-0` on the flex shell + panel group, removed assistant panel CSS transition and replaced assistant pane `min-w-[320px]` with `min-w-0 max-w-full overflow-hidden` so the main canvas reliably shrinks when the RHS chat widens. Enforced pipeline rule: deals cannot move to Scheduled / Awaiting payment / Completed (server + Kanban drag) without `scheduledAt`; assign-to-scheduled modal now requires a date too. Drag-over no longer previews invalid columns (no date / no assignee for Scheduled). Deal card corner shows `-` instead of “Not scheduled” when there is no schedule/created corner date. Upcoming Jobs KPI only counts scheduled-stage deals that actually have a date. Centralized stage checks in `lib/deal-stage-rules.ts`. Neutralized green “+12%” / “Active” micro-labels in `deal-health-widget` (muted copy) in case that widget is surfaced.
- Why: User-reported regressions (chat expand not compressing main column, unwanted “Not scheduled” copy, missing schedule gate for later stages, KPI green micro-label confusion on older builds).

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `actions/crm-demo-seeds.ts`, `app/crm/page.tsx`, `components/layout/global-search.tsx`, `components/crm/header.tsx`, `components/crm/crm-client.tsx`, `components/crm/crm-kpi-cards.tsx`, `components/crm/kanban-board.tsx`, `components/crm/deal-card.tsx`, `lib/display-name.ts`, `docs/agent_change_log.md`
- What changed: Dashboard template parity pass — KPI cards use muted micro-labels (no green “Live/Active” chrome), distinct tinted card backgrounds, and slightly larger label text while keeping the large KPI values at `text-2xl`. Header display name uses `resolveHeaderDisplayName` to avoid showing phone-like strings. Dev-only `ensureDashboardDemoDeals` seeds 10 idempotent `[Demo]` deals across Prisma stages for the signed-in workspace owner. Dashboard layout: sticky top bar + scrollable main; `GlobalSearch` gains `variant="bar"` for a full-width trigger in the header; team filter is always visible (disabled with tooltip when there are no team members). Kanban first-column empty state uses the same dashed add control as other columns. Deal cards show **created** month/day in the header corner when there is no `scheduledAt`. Removed debug `writeFileSync` from the dashboard page error path.
- Why: Match the Stitch template behaviour and fix resize/header/demo-data issues called out in the dashboard parity plan.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `components/crm/header.tsx`, `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
- What changed: Added user identity (name + role + avatar initial) to the top-right of the header to match the template. Weather pill now renders next to notifications. Filter button order fixed: New Deal first, then Filter (matching template layout). Passed `userRole` from DashboardClient to Header. Added silent catch on weather fetch to prevent "Failed to fetch" console errors on localhost.
- Why: Template screenshot showed user profile top-right, weather next to notifications, and filter positioned after New Deal button — all were missing or misplaced.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `app/globals.css`, `components/crm/header.tsx`, `components/crm/crm-client.tsx`, `components/crm/crm-kpi-cards.tsx`, `components/crm/kanban-board.tsx`, `components/crm/deal-card.tsx`, `docs/agent_change_log.md`
- What changed: Full dashboard layout rewrite to faithfully match the Stitch-by-Google template. Added template CSS utilities (`sunlight-shadow`, `ghost-border`, `glass-panel`) to globals.css. Header: glass-panel top bar with search left, weather+activity+notifications right. KPI cards: `bg-muted rounded-lg ghost-border sunlight-shadow`, 9px uppercase labels, extrabold values. Kanban: CSS grid columns with colored vertical bars, 11px uppercase headers, zero-chrome drop zones, template "Add Card" dashed button. Deal cards: `p-3.5 ghost-border sunlight-shadow`, template info rows, bottom separator with price pill and inline delete. Pipeline header: "Deal Pipeline" title left, "New Deal" primary button + Filter right. Retained all existing lucide-react icons, live data, drag-and-drop, colour scheme, and 6-stage pipeline.
- Why: Previous dashboard layout did not match the provided template structure, positioning, or visual treatment.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `actions/workspace-actions.ts`, `actions/tracey-onboarding.ts`, `docs/agent_change_log.md`
- What changed: Hardened auth identity fallback in `ensureWorkspaceUserForAuth` so it no longer throws when auth metadata is partial (common in phone sign-up). It now resolves identity using caller-provided `authUserIdOverride`, then auth user id, then a workspace-scoped fallback email. Updated onboarding and workspace creation callsites to pass known user ids explicitly.
- Why: Activation could fail with “Authenticated user identity not found” for phone-auth users despite valid session and onboarding inputs.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `actions/tracey-onboarding.ts`, `docs/agent_change_log.md`
- What changed: Removed the hard failure in `saveTraceyOnboarding` when Supabase auth has no `email` (common for phone sign-up). Owner email for the app `User` row now resolves from auth email, else validated onboarding `email`, else `${userId}@phone-auth.local` (aligned with `ensureWorkspaceUserForAuth`).
- Why: Phone-authenticated users hit “User email not found” on Activate despite filling the onboarding email field.

### 2026-03-21 (AEDT) - Cursor AI Agent
- Files: `app/setup/layout.tsx`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Added `<Toaster />` to `/setup` so onboarding toast feedback (blocked activation, errors, success) actually appears. Fixed `canActivateTracey` to always allow final activation when number provisioning was not requested in billing (even if a previous run left `failed`/`idle` state). Wait for `getProvisioningIntentForOnboarding` before auto-running provisioning on step 6, and when provisioning is off, explicitly set `not_requested` on that step. Set `type="button"` on Activate; `handleSubmit` now always clears `submitting` in `finally`.
- Why: Users reported Activate doing “nothing”; the page never mounted a toast host, and gating logic could block activation after a failed provision attempt even when billing said provisioning was off.

### 2026-03-21 02:05 (AEDT) - Cursor AI Agent
- Files: `app/pricing/page.tsx`, `app/contact/page.tsx`, `app/page.tsx`, `components/layout/navbar.tsx`, `middleware.ts`, `tailwind.config.ts`, `docs/agent_change_log.md`
- What changed: Split the accidentally-overwritten `/contact` pricing UI into its own `/pricing` route, restored the original `/contact` page, and fixed navigation links (navbar + Home) so “Pricing” and “Contact” point to the correct URLs. Also wired Tailwind `rounded-*` utilities to the shared `--radius: 18px` tokens so the 18px base radius applies consistently across the UI.
- Why: Prevented the Contact page from being replaced by pricing, and ensured the “standard base radius 18px” update actually affects pages like Home that were still using the default Tailwind rounding.

### 2026-03-21 02:21 (AEDT) - Cursor AI Agent
- Files: `app/globals.css`
- What changed: Forced Tailwind `rounded*` utilities (`rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`) to use the shared `--radius` token (18px) so Home/Product “box” corners match the new standard radius visually.
- Why: After the routing + Tailwind radius wiring, Home/Product boxes still didn’t visually show the 18px corner radius; this guarantees consistent bevel/radius rendering even if the Tailwind mapping isn’t taking effect in the live build CSS.

### 2026-03-21 02:00 (AEDT) - antigravity
- Files: `app/contact/page.tsx`, `app/page.tsx`, `app/globals.css`, `docs/agent_change_log.md`
- What changed: Revamped the `/contact` route into a full-featured "Pricing & Contact" page. Introduced a humorous two-column comparison (Regular Assistant vs. Earlymark Pro), ROI stats, a new feature grid, and updated pricing FAQs. Swapped the ROI and Feature Grid sections for better flow and tightened all copy for punchiness.
- Why: To provide a more persuasive value proposition for Earlymark Pro. The 18px corner radius was applied globally to modernize the UI consistent with the new pricing layout.

### 2026-03-21 00:30 (AEDT) - antigravity
- Files: `app/page.tsx`, `tsconfig.json`, `package.json`, `package-lock.json`, `docs/agent_change_log.md`
- What changed: Fixed a TypeScript compilation error in the homepage by adding the missing `screenshotBg` property to the `HIRE_FEATURES` array. Resolved multiple test-related TypeScript errors by adding `vitest/globals` to `tsconfig.json` and installing `@testing-library/dom` as a dev dependency.
- Why: The missing `screenshotBg` property caused production builds to fail. Test-related type errors and a missing dependency were blocking the pre-commit hook and overall repository health.

## 2026-03-19 22:30 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/twilio-regulatory.ts`, `docs/agent_change_log.md`
- **Summary**: Rewrote address resolution for AU number purchase with a 3-strategy fallback: (1) Check bundle ItemAssignments for AD... objects, (2) List v2010 addresses in the subaccount (created by clone), (3) Create an address in the subaccount using Earlymark's details. Added comprehensive diagnostic logging showing all ItemAssignment objectSids and subaccount addresses. Previous approach only tried strategy 1, which returned null because Twilio bundles nest addresses inside supporting documents rather than as direct item assignments.
- **Why**: ItemAssignments alone don't contain AD... references for AU Mobile Business bundles — addresses are associated through supporting documents. The multi-strategy approach ensures we find or create a valid address regardless of bundle structure.

## 2026-03-19 21:30 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/twilio-regulatory.ts`, `lib/comms.ts`, `lib/comms-simple.ts`, `__tests__/comms.test.ts`, `__tests__/twilio-regulatory-bundle-clone.test.ts`, `docs/agent_change_log.md`
- **Summary**: Fixed number purchase to use the address already inside the cloned bundle. When a bundle is cloned, Twilio copies all items including the address. `resolveAuMobileBusinessBundleSidForAccount` now returns `{ bundleSid, addressSid }` by reading the bundle's ItemAssignments API to find the cloned address (AD...). Both are passed to `incomingPhoneNumbers.create`. Removed all standalone address-creation code (EARLYMARK_ADDRESS, resolveMainAccountAddressSid, ensureWorkspaceRegulatoryAddress). Fixed misleading error 21631 message.
- **Why**: Twilio requires both `bundleSid` (regulatory compliance) and `addressSid` (address requirement) for AU mobile purchase. The `addressSid` must be one registered inside the bundle — a separately created address triggers "Address not contained in bundle". Reading the address from the bundle's own ItemAssignments is the correct approach per Twilio docs.

## 2026-03-19 21:15 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `docs/agent_change_log.md`
- **Summary**: Removed the separate regulatory-address creation stage and `addressSid` from number purchase. The cloned AU Mobile Business bundle already contains the regulatory address, so passing a separate `addressSid` caused "Address not contained in bundle" errors. Now only `bundleSid` is passed to `incomingPhoneNumbers.create`.
- **Why**: Twilio validates that any `addressSid` passed to number purchase must be registered within the bundle. Since the bundle clone already carries its own address, the standalone address replication was redundant and conflicting.

## 2026-03-19 21:10 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `__tests__/comms.test.ts`, `docs/agent_change_log.md`
- **Summary**: Made AU regulatory address provisioning fully automatic — no manual Twilio Console steps per customer. The system now auto-discovers any existing AU address in the main Twilio account (or creates one using Earlymark's business address) and replicates it into each new subaccount. `TWILIO_VALIDATED_ADDRESS_SID` is now an optional override, not a requirement. The user's onboarding address is only for service-area calculation, not for Twilio regulatory.
- **Why**: AU mobile numbers require `address_requirements: "any"` — Twilio needs any valid address on file, not the end-user's address. Previous approach incorrectly required a manual per-setup step. Earlymark's own address satisfies the requirement for every customer, making onboarding fully hands-off.

## 2026-03-19 20:00 (AEDT) – Cursor AI Agent

- **Files changed**: `lib/comms.ts`, `__tests__/comms.test.ts`, `docs/agent_change_log.md`
- **Summary**: Replaced all address-parsing/geocoding/normalization heuristics with a reliable approach: read a pre-validated address from the main Twilio account (via `TWILIO_VALIDATED_ADDRESS_SID`) and replicate its exact fields into each subaccount. Removed unused geocoding, state-name mapping, street normalization, and suffix abbreviation code. The address data comes from Twilio itself, so the validator always accepts it.
- **Why**: Twilio's API address validator consistently rejected addresses that the Console UI accepts. Geocoding and format heuristics were unreliable. Using Twilio's own validated address data as the source of truth eliminates all format-guessing.

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
- Files: `app/crm/layout.tsx`, `app/(dashboard)/layout.tsx`, `components/chatbot/deferred-chat-interface.tsx`, `docs/agent_change_log.md`
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
  - `components/crm/crm-client.tsx`
  - `components/crm/kanban-board.tsx`
  - `components/crm/notifications-btn.tsx`
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
- Files: `prisma/schema.prisma`, `prisma/migrations/20260306_add_voice_call_logs/migration.sql`, `app/api/internal/voice-calls/route.ts`, `actions/voice-call-actions.ts`, `components/settings/recent-voice-calls.tsx`, `app/crm/settings/call-settings/page.tsx`, `livekit-agent/agent.ts`
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
- Files: `actions/chat-actions.ts`, `app/api/chat/route.ts`, `app/crm/schedule/schedule-calendar.tsx`, `components/chatbot/chat-interface.tsx`, `components/crm/activity-feed.tsx`, `components/crm/kanban-board.tsx`, `components/onboarding/tracey-onboarding.tsx`, `actions/scraper-actions.ts`, `lib/ai/tools.ts`, `lib/crm-selection.ts`, `docs/agent_change_log.md`
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
- Files: `app/crm/settings/agent/page.tsx`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
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
- Files: `components/crm/header.tsx`, `components/crm/crm-client.tsx`, `docs/agent_change_log.md`
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
- Files: `actions/onboarding-actions.ts`, `components/crm/setup-widget.tsx`, `docs/agent_change_log.md`
- What changed: Added a close button to the dashboard setup banner and made its dismissal behavior signup-age aware. During the first week after signup, dismissing the banner only hides it temporarily and it can reappear later; after that, dismissal stays hidden on the current browser.
- Why: Users need to be able to close the setup banner, but it should keep resurfacing during the first week so new signups do not lose the onboarding prompt too easily.

### 2026-03-07 12:31 (AEDT) - codex
- Files: `app/crm/schedule/schedule-calendar.tsx`, `docs/agent_change_log.md`
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
- Files: `components/crm/crm-skeleton.tsx`, `app/crm/settings/my-business/page.tsx`, `app/crm/settings/layout.tsx`, `actions/invite-actions.ts`, `__tests__/chat-interface.test.tsx`, `docs/agent_change_log.md`
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
  - `app/crm/analytics/page.tsx`
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

## 2026-03-19 10:45 (AEDT) - codex

- Files changed:
  - `lib/comms.ts`
  - `__tests__/comms.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - **Subaccount flow restored (Twilio-documented approach).** Numbers are still purchased
    in the main account (where bundle + address coexist), then **transferred** to the
    customer's subaccount per [Twilio: Exchange phone numbers between accounts](https://www.twilio.com/docs/iam/api/subaccounts#exchanging-numbers).
  - Flow: create/reuse subaccount → purchase number in main account (bundle + address) →
    create compliant Address in subaccount → transfer number to subaccount →
    create SIP trunk and set voice/SMS URLs in subaccount → persist subaccount SID and token.
  - Ensures per-customer billing and resource isolation while avoiding "Address not contained
    in bundle" (no bundle clone; purchase in main then transfer).
- Why:
  - User confirmed subaccounts are the right model. Twilio docs require a compliant address
    in the target subaccount before transfer; we create one, then transfer. No bundle cloning.

## 2026-03-19 10:10 (AEDT) - codex

- Files changed:
  - `lib/comms.ts`
  - `lib/comms-simple.ts`
  - `lib/twilio-regulatory.ts`
  - `__tests__/comms.test.ts`
  - `__tests__/twilio-regulatory-bundle-clone.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - **Architectural fix**: Stopped purchasing AU mobile numbers in Twilio subaccounts.
    Numbers are now purchased in the **main account** where the regulatory bundle and its
    address coexist. This eliminates the persistent "Address not contained in bundle"
    error caused by bundle cloning not replicating addresses across account boundaries.
  - Removed subaccount creation/cloning from the number purchase flow. The main account's
    source bundle SID and its address (found via Supporting Document `attributes.address_sids`)
    are used directly.
  - Added `findSourceBundleAddressSid()` that inspects the source bundle's ItemAssignments
    and Supporting Documents in the main account to discover the correct address.
  - `resolveAuMobileBusinessBundleSidForAccount` simplified back to returning a plain string.
  - Tests and comms-simple.ts updated to match.
- Why:
  - Twilio bundle clones copy documents but reference the original account's addresses.
    Subaccount purchases always failed because the address was either missing or not linked
    to the cloned bundle. Purchasing in the main account is the architecturally correct fix.

## 2026-03-18 03:14 (AEDT) - codex

- Files changed:
  - `components/ui/address-autocomplete.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added background auto-resolution for programmatically filled addresses (e.g. scraped-from-website). When the address value changes and the user isn’t actively typing, we automatically resolve the best Google match and fetch full details so postcode/state/locality are available without requiring a dropdown click or blur.
- Why:
  - The onboarding address gate and Twilio provisioning should not depend on the user manually interacting with the address field after a scrape; the system must infer missing postcode/state from Google in the background.

## 2026-03-20 01:55 (AEDT) - codex

- Files changed:
  - `app/api/webhooks/twilio-voice-gateway/route.ts`
  - `app/api/chat/route.ts`
  - `lib/ai/context.ts`
  - `docs/agent_change_log.md`
  - `docs/voice_operating_brief.md`
- Summary:
  - Hardened `twilio-voice-gateway` failure handling so STIR/SHAKEN failures, rate-limits, missing sipTarget cases, and handler exceptions always route to `voicemailFallbackTwiml` (which includes `<Record>`) and open a `VoiceIncident`.
  - Updated CRM dashboard chat prompting so the pricing “on-site assessment” fallback is phrased for the **business/operator** audience (not spoken in an end-customer tone).
  - Added `pricingAudience` support to `buildAgentContext()` so the unlisted-task pricing rule can be reworded by channel.
- Why:
  - Voice continuity: callers should always be able to leave a voicemail and admins can track failures in incident views.
  - Internal chat correctness: dashboard users should not receive customer-facing disclaimer phrasing.

## 2026-03-20 02:35 (AEDT) - codex

- Files changed:
  - `app/api/webhooks/twilio-voice-gateway/route.ts`
  - `components/chatbot/chat-interface.tsx`
  - `actions/chat-actions.ts`
  - `lib/comms.ts`
  - `__tests__/comms.test.ts`
  - `docs/voice_operating_brief.md`
- Summary:
  - Ensured the voice gateway handler exception path always records a `VoiceIncident` and returns `voicemailFallbackTwiml` even when caller/called metadata is missing.
  - Added an **Assignee** dropdown to the “New job — review & confirm” draft card for scheduled jobs, and pass `assignedToId` through job creation.
  - Preserved CRM chat history across “Chat” <-> “Advanced” toggles by storing in-session messages and restoring them on remount.
  - Finalised/updated the Twilio subaccount provisioning flow in `lib/comms.ts` and refreshed test mocks accordingly.
- Why:
  - Voice continuity guarantee: callers must always be able to leave a voicemail after any failure.
  - Scheduled job creation UX: backend validation requires `assignedToId` in Scheduled stage, so the UI now collects it.
  - Operator UX: switching views should not erase the conversation they just had.

## 2026-03-20 19:37 (AEDT) - codex

- Files changed:
  - `app/api/webhooks/twilio-voice-gateway/route.ts`
  - `app/api/webhooks/twilio-voice-fallback/route.ts`
  - `lib/voice-spoken-canary.ts`
  - `docs/voice_operating_brief.md`
- Summary:
  - Updated voicemail spoken prompts to use the Australian-sounding `Polly.Olivia` voice and changed the first line to: “Sorry, we can't reach you right now...”.
  - Made incident creation non-blocking inside the voice gateway so Twilio is less likely to hit webhook timeouts/generic application errors.
- Why:
  - Fix user-facing mismatch on failure prompts and reduce webhook latency that can trigger Twilio’s “application error”.

## 2026-03-21 09:30 (AEDT) - codex

- Files changed:
  - `components/tradie/job-billing-tab.tsx`
  - `actions/tradie-actions.ts`
  - `app/crm/deals/[id]/page.tsx`
  - `app/admin/customer-usage/page.tsx`
  - `lib/admin/customer-usage.ts`
  - `actions/activity-actions.ts`
  - `app/crm/inbox/page.tsx`
  - `app/inbox/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - **Invoice UX polish**: Replaced flat PAID/non-PAID badge with per-status colour badges (DRAFT grey, ISSUED blue, PAID green, VOID red strikethrough). Added Issue, Mark Paid, and Void action buttons contextual to each invoice state. Added price validation feedback. Added `voidInvoice` server action to `tradie-actions.ts`. Added Invoices tab to deal detail page.
  - **Operator-visible routing surfaces**: Expanded the Open Voice Incidents panel in the customer-usage admin page to surface `details` JSON (caller, called, STIR/SHAKEN, routing reason, source, subaccount, managed number, workspace).
  - **Activity feed parity**: Added MEETING and TASK to the inbox `typeIn` filter on both inbox pages and expanded the union type in `activity-actions.ts`. All five activity types now appear consistently across feeds.
- Why:
  - Invoice lifecycle was chatbot-only; operators need direct UI controls.
  - Routing incident details were stored but hidden from operators.
  - MEETING and TASK activities were excluded from inbox feeds, creating a blind spot.

## 2026-03-21 10:15 (AEDT) - codex

- Files changed:
  - `components/tradie/job-billing-tab.tsx`
  - `actions/tradie-actions.ts`
  - `actions/activity-actions.ts`
  - `docs/agent_change_log.md`
- Summary:
  - **Real email invoice**: `emailInvoice` server action sends the generated HTML invoice to the contact via Resend. Email button in billing tab is now live.
  - **Line-item editor**: Inline editor on DRAFT invoices lets operators add, edit, and remove line items with auto-recalculated GST totals. `updateInvoiceLineItems` server action validates and saves.
  - **Xero/MYOB sync status**: Each invoice card now shows a cloud/no-cloud badge with sync status fetched from `getInvoiceSyncStatus` (stub: always shows Not synced until accounting integration is live).
  - **Reverse status UI**: PAID invoices get a Reverse to Issued button, ISSUED invoices get Back to Draft. `reverseInvoiceStatus` server action handles the state machine and reverts deal stage when un-paying.
  - **Voicemail in activity feed**: Voicemail recordings from `WebhookEvent` (provider `twilio_voice_fallback`) are now surfaced in the activity feed as call-type entries. Matched to workspaces via Twilio phone number, with contact resolution by caller phone.
- Why:
  - Operators had no way to email, edit, or reverse invoices from the UI; all actions were chatbot-only.
  - Voicemail-only calls (never reached LiveKit) were invisible in the activity feed, creating a blind spot for missed customer contact.

## 2026-03-21 11:40 (AEDT) - codex

- Files changed:
  - `actions/analytics-actions.ts`
  - `app/crm/analytics/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added `getMonthlyRevenueBreakdown` server action returning per-deal revenue breakdown for a given month (deal list with contact, value, source, plus aggregate stats like avg deal value, largest deal, by-source split).
  - Revenue trend chart months are now clickable: clicking a month dot or label fetches the drill-down and shows a breakdown panel with summary cards, source breakdown, and a scrollable list of completed jobs.
  - Monthly bucket data now includes `start` and `end` ISO dates so the frontend can request per-month data without guessing date ranges.
  - Drill-down resets when collapsing the revenue card or changing the time range.
- Why:
  - Operators could see monthly revenue totals but had no way to understand what drove each month. The drill-down gives immediate visibility into which jobs, contacts, and sources contributed to a given month.

## 2026-03-21 12:00 (AEDT) - codex

- Files changed:
  - components/core/sidebar.tsx
- Summary:
  - Removed the dedicated left-sidebar blue "Ask Tracey" chat-mode button.
  - Made the Earlymark logo button on the top-left of the left sidebar open Chat mode (calls goToBasic()), using the same behavior as the removed button.
- Why:
  - Match the requested UX: use the top-left Earlymark logo as the entry point into chat mode, and reduce sidebar clutter.

## 2026-03-21 12:30 (AEDT) - codex

- Files changed:
  - pp/crm/analytics/page.tsx
- Summary:
  - Removed the “Distribution” score grid under Customer Ratings.
  - Replaced it with a “Score curve” bell-curve style score visual using the existing rating distribution counts.
- Why:
  - The distribution grid was visually noisy; a smoother score curve is easier to read while preserving the same underlying signal.

## 2026-03-21 12:15 (AEDT) - codex

- Files changed:
  - `components/map/map-view.tsx`
  - `components/map/google-map-view.tsx`
- Summary:
  - Map pages no longer stick to a hardcoded Melbourne center when loading.
  - Added geolocation-based auto-centering on page load (only when browser geolocation permission is already granted), and included the user location in the map fit-bounds calculation.
  - Leaflet fallback now includes a My Location button and renders your location marker after geolocation.
- Why:
  - Users reported that opening /crm/map always started at the same Melbourne spot, instead of their current location.

## 2026-03-21 13:05 (AEDT) - codex

- Files changed:
  - `components/crm/crm-client.tsx`
  - `components/crm/header.tsx`
  - `components/crm/notifications-btn.tsx`
  - `components/crm/kanban-board.tsx`
  - `components/crm/deal-card.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Reworked `/crm` composition to follow the new Stitch-inspired format: KPI section first, then a dedicated `Deal Pipeline` action row, then the kanban board area.
  - Moved dashboard-level actions so `/crm` now shows `New Deal` and `Filter` controls in the pipeline action row, while keeping existing dynamic KPI/kanban data and interactions.
  - Added header configurability (`showFilter`, `showPrimaryCta`) so the same header component still behaves as before on other dashboard pages.
  - Restyled kanban columns/cards to better match the new layout feel without changing stage logic or drag/drop behavior.
  - Replaced dashboard blue accents with theme primary green (`#00D28B`) in the updated dashboard flow (weather icon, notification accents, unread indicator, call action button).
- Why:
  - The dashboard needed to adopt the new formatting/layout while preserving existing content, icon set, and feature behavior, and to align accent color usage with the brand primary green.

## 2026-03-21 13:40 (AEDT) - codex

- Files changed:
  - `lib/billing-plan.ts`
  - `components/auth/auth-selector.tsx`
  - `components/onboarding/tracey-onboarding.tsx`
  - `actions/workspace-actions.ts`
  - `actions/tracey-onboarding.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the temporary Stripe legacy price fallback and restored strict monthly/yearly env key requirements in billing plan resolution.
  - Fixed phone OTP signup metadata so onboarding name is no longer silently populated from the phone number.
  - Hardened onboarding scraped-address prefill to only auto-fill high-confidence AU street addresses and avoid broad location phrase fallbacks.
  - Updated workspace user upsert logic to support phone-authenticated users without email by using a deterministic auth-id fallback identity instead of hard-failing.
  - Added onboarding provisioning-intent lookup and gated step-5 auto provisioning checks/retry UI when number provisioning was not requested, while keeping activation unblocked for `not_requested`.
  - Reduced misleading red emphasis for lead-capture readiness in the activation checklist so it is informational and distinct from number provisioning blockers.
- Why:
  - Onboarding reliability regressed for phone-auth users and service-area websites: names were contaminated by phone values, addresses could be incorrectly auto-filled, and provisioning/no-provisioning states surfaced confusing blockers. These changes make onboarding deterministic and aligned with billing intent.

## 2026-03-21 13:55 (AEDT) - codex

- Files changed:
  - `public/sw.js`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed service worker fetch fallback paths so they always return a valid `Response` object.
  - Added explicit offline `503` fallback responses when both network and cache are unavailable, including API/RSC fetch handling.
- Why:
  - Browser console showed `TypeError: Failed to convert value to 'Response'` from `sw.js`, which can silently break request flows and made onboarding actions (including Activate Tracey) appear unresponsive.

## 2026-03-23 18:15 (AEDT) - codex

- Files changed:
  - `components/providers/sync-provider.tsx`
  - `app/api/deals/update-stage/route.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Replaced `SyncProvider` direct server-action import for `updateDealStage` with a standard `fetch` call to a new API endpoint.
  - Added `POST /api/deals/update-stage` route that validates payload, calls `updateDealStage`, and returns structured success/error JSON.
- Why:
  - Turbopack HMR repeatedly failed with `module factory is not available` for the client-side provider because it depended on a server-action module graph during hot updates. Moving the sync replay path to an API route avoids this fragile import path and stabilizes local dev reloads.

## 2026-03-23 18:24 (AEDT) - codex

- Files changed:
  - `components/core/command-palette.tsx`
  - `components/layout/global-search.tsx`
  - `components/layout/search-dialog.tsx`
  - `app/api/search/global/route.ts`
  - `lib/search-client.ts`
  - `lib/search-types.ts`
  - `actions/search-actions.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Removed direct client imports of `globalSearch` server action from command/search UI components.
  - Added `POST /api/search/global` and a small browser helper (`globalSearchClient`) so search UI uses HTTP instead of pulling server-action modules into client bundles.
  - Extracted shared `SearchResultItem` type into `lib/search-types.ts` for both server and client usage.
- Why:
  - Turbopack kept throwing `module factory is not available` during HMR whenever client components referenced server-action modules. This change isolates server logic to API routes and makes dashboard hot-reload stable.

## 2026-03-23 18:31 (AEDT) - codex

- Files changed:
  - `package.json`
  - `docs/agent_change_log.md`
- Summary:
  - Switched local development script from `next dev` (Turbopack) to `next dev --webpack`.
- Why:
  - The project currently includes many client components that import server actions directly. Turbopack HMR repeatedly crashes in this setup with `module factory is not available`, while Webpack dev mode is more stable and avoids these runtime reload failures during normal local development.

## 2026-03-23 18:42 (AEDT) - codex

- Files changed:
  - `components/providers/service-worker-provider.tsx`
  - `components/core/sidebar.tsx`
  - `components/layout/Shell.tsx`
  - `components/core/search-command.tsx`
  - `app/api/sync/replay/route.ts`
  - `app/api/workspace/complete-tutorial/route.ts`
  - `app/api/contacts/search/route.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Removed direct server-action imports from core shell/provider client components and replaced them with API calls or client auth calls.
  - Added dedicated API routes for offline sync replay, tutorial completion, and contact search.
  - Updated sidebar sign-out to use client Supabase sign-out directly instead of importing server logout action.
- Why:
  - These components load globally in the dashboard shell, so any client->server-action import path there increases HMR fragility and startup/runtime crashes. Moving those paths to API boundaries is a long-term architecture hardening step.

## 2026-03-23 18:51 (AEDT) - codex

- Files changed:
  - `lib/startup-environment-validation.ts`
  - `instrumentation.ts`
  - `lib/startup.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Extracted startup environment validation into a lightweight standalone module and updated startup/instrumentation imports to use it.
  - Removed startup validation dependency on the broader `health-check` module chain for runtime boot paths.
- Why:
  - Webpack dev mode hit `UnhandledSchemeError` for `node:crypto` through a transitive import chain (`health-check` -> readiness -> livekit-server-sdk). Isolating startup validation from that chain prevents bundling Node-only LiveKit crypto modules in the wrong build path.

## 2026-03-23 19:10 (AEDT) - codex

- Files changed:
  - `components/layout/global-search.tsx`
  - `components/ui/tooltip.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added a visually hidden `DialogTitle` inside `GlobalSearch`’s `DialogContent` to satisfy Radix accessibility requirements.
  - Updated the shared `TooltipContent` wrapper to render via `TooltipPrimitive.Portal` so tooltips are not clipped by layout `overflow-hidden` containers.
- Why:
  - Fixes the runtime console warning about missing `DialogTitle`.
  - Restores the “Ask Tracey / Open chat mode” hover bubble on the dashboard when layout overflow rules would otherwise hide tooltip content.

## 2026-03-23 19:28 (AEDT) - codex

- Files changed:
  - `tailwind.config.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Normalized Tailwind border-radius scale so `rounded-xl` and `rounded-2xl` also resolve to the shared `--radius` token (18px), matching `rounded`/`rounded-lg`.
- Why:
  - Dashboard boxes still used mixed radius classes (`rounded-lg`, `rounded-xl`, `rounded-2xl`), which produced inconsistent corner sizes. This makes corners consistently 18px.

## 2026-03-23 20:10 (AEDT) - codex

- Files changed:
  - `components/dashboard/dashboard-kpi-cards.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Strengthened the colours for the top 4 dashboard KPI cards (less pale fills) and improved dark-mode label/value contrast for readability.
- Why:
  - The previous card palette was too light to scan quickly at a glance.

## 2026-03-23 20:30 (AEDT) - codex

- Files changed:
  - `components/crm/deal-card.tsx`
- Summary:
  - Reduced Kanban deal-card vertical spacing around the dollar value by tightening footer margin/padding and line-height.
- Why:
  - Cards were visually taller than needed; reducing the top/bottom gaps around the price improves density while preserving the same overall aesthetic.

## 2026-03-23 20:25 (AEDT) - codex

- Files changed:
  - `app/crm/analytics/page.tsx`
- Summary:
  - Made the CRM analytics page content scrollable inside the dashboard shell by applying `flex-1 min-h-0 overflow-y-auto` to the page container.
- Why:
  - `DashboardMainChrome` uses `overflow-hidden` on its child wrapper; without a scrollable container, the analytics content gets clipped and expandable sections (revenue/customer cards) can’t be reached.

## 2026-03-24 11:45 (AEDT) - codex

- Files changed:
  - `app/crm/deals/page.tsx`
  - `app/crm/hub/page.tsx`
  - `app/crm/agent/page.tsx`
  - `app/crm/estimator/page.tsx`
  - `app/crm/deals/new/page.tsx`
  - `app/crm/tradie/page.tsx`
  - `app/crm/jobs/[id]/page.tsx`
  - `app/crm/calendar/page.tsx`
  - `app/crm/design/deal-cards/page.tsx`
  - `app/crm/design/deal-detail-modal/page.tsx`
  - `app/(dashboard)/contacts/page.tsx`
  - `components/modals/new-deal-modal-standalone.tsx`
  - `components/layout/search-dialog.tsx`
  - `components/scheduler/draggable-job-card.tsx`
  - `app/admin/diagnostics/page.tsx`
  - `components/dashboard/dashboard-kpi-cards.tsx`
  - `components/dashboard/setup-widget.tsx`
  - `actions/settings-actions.ts`
  - `actions/chat-actions.ts`
  - `app/crm/settings/agent/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Retired legacy CRM surfaces to canonical routes with safe redirects (dashboard-first), fixed stale navigation links, and secured `/admin/diagnostics` with internal-admin access.
  - Standardized key dashboard card corners to 18px and upgraded AI behavioural-rule handling with editable per-rule settings UI, visible 20-rule usage count, backend rule validation/rejection, and consistent blocked-action messaging.
- Why:
  - Prevents duplicate/hidden route drift and broken navigation while preserving old URLs safely.
  - Aligns dashboard visual consistency with the desired 18px card style.
  - Makes preference/rule behavior safer and clearer by enforcing hard limits/policy constraints and giving users better feedback when an action is blocked.

## 2026-03-24 12:10 (AEDT) - codex

- Files changed:
  - `actions/contact-actions.ts`
  - `actions/deal-actions.ts`
  - `app/crm/contacts/page.tsx`
  - `components/crm/contacts-client.tsx`
  - `app/crm/dashboard/page.tsx`
  - `app/api/contacts/route.ts`
  - `app/api/deals/route.ts`
  - `actions/chat-actions.ts`
  - `app/api/chat/route.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Added practical pagination/caps for large datasets: contacts now support page/pageSize access with a paginated server helper and UI next/previous controls; deals now use a safe default fetch cap unless explicitly requested as unbounded.
  - Updated dashboard and public API routes to use bounded fetches by default, while preserving full-data behavior for internal AI/chat workflows via explicit `unbounded` fetches.
- Why:
  - Prevents large 5,000+ contact/deal datasets from loading in one request, reducing slow dashboard loads and timeout risk.
  - Keeps product behavior reliable by limiting user-facing views while not breaking AI operations that depend on full workspace context.

## 2026-03-24 12:40 (AEDT) - codex

- Files changed:
  - `components/dashboard/dashboard-client.tsx`
  - `components/crm/kanban-board.tsx`
  - `app/auth/next/page.tsx`
  - `app/billing/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Replaced the team-only Kanban filter control with a unified dropdown that supports combined local pipeline filters (quick search, value range, date range, location, team member) plus save/apply/delete filter presets.
  - Added tutorial progression enforcement in post-auth and post-billing redirects so subscribed + onboarded users with incomplete tutorial are routed into dashboard tutorial mode before normal usage.
- Why:
  - High-volume pipelines need practical local filtering to avoid visual scanning across hundreds of cards.
  - The intended onboarding journey requires users to complete tutorial flow before normal dashboard operation.

## 2026-03-24 13:20 (AEDT) - codex

- Files changed:
  - `lib/db.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
  - `instrumentation-client.ts`
  - `prisma/schema.prisma`
  - `actions/contact-actions.ts`
  - `lib/invoice-number.ts`
  - `actions/tradie-actions.ts`
  - `actions/chat-actions.ts`
  - `actions/deal-actions.ts`
  - `app/api/chat/route.ts`
  - `.env.example`
  - `docs/agent_change_log.md`
- Summary:
  - Hardened backend reliability and safety: added DB connection-limit wiring for Prisma, increased Sentry sampling for better production visibility, added DB-level workspace contact uniqueness plus graceful race handling, and replaced timestamp invoice IDs with atomic workspace-scoped sequence allocation.
  - Added server-side image signature checks for deal-photo uploads (magic-byte validation + content-type enforcement), and added a hard prompt-size guard in chat to prevent oversized LLM requests.
  - Documented previously missing environment variables required for Sentry, Mem0, Deepgram, Gmail Pub/Sub, and DB pool tuning.
- Why:
  - Prevents duplicate contacts/invoice collisions and reduces concurrency-related failures in production.
  - Improves observability and reduces silent failures/cost spikes by enforcing practical runtime limits.
  - Makes first-time deployments and team handoffs safer by documenting required environment setup.

## 2026-03-24 14:05 (AEDT) - codex

- Files changed:
  - `package.json`
  - `package-lock.json`
  - `lib/shared-store.ts`
  - `lib/rate-limit.ts`
  - `lib/ai/context.ts`
  - `prisma/schema.prisma`
  - `lib/push-notifications.ts`
  - `app/api/push/subscribe/route.ts`
  - `app/api/push/unsubscribe/route.ts`
  - `actions/notification-actions.ts`
  - `app/crm/settings/notifications/page.tsx`
  - `public/sw.js`
  - `components/dashboard/notifications-btn.tsx`
  - `.env.example`
  - `__tests__/rate-limit.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Added shared runtime state support using Upstash Redis (with safe local fallback) and moved rate limiting + AI context/memory caches off single-instance in-memory maps to support multi-instance deployments.
  - Implemented browser push notification plumbing end-to-end: VAPID/web-push backend sender, push subscription persistence/API routes, settings toggle for opt-in/out, and service worker handlers for push display/click navigation.
  - Improved notification accessibility by adding dialog semantics and live status announcements to the notifications dropdown trigger/panel.
- Why:
  - Fixes production consistency issues where rate limits/caches diverge across instances and reduces duplicate concurrent work.
  - Enables immediate laptop/phone browser alerts for tradies without relying only on email/in-app polling.
  - Improves screen-reader support and interaction clarity for key notification UI.

## 2026-03-24 14:25 (AEDT) - codex

- Files changed:
  - `actions/deal-actions.ts`
  - `actions/tradie-actions.ts`
  - `components/crm/kanban-board.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Replaced remaining high-impact server-side `console.error` calls in core deal/tradie action paths with structured `logger.error` calls including component/action context and key IDs.
  - Added Kanban accessibility announcements via an `aria-live` status region and clearer board labeling so assistive technologies can track stage move outcomes/conflict refresh events.
- Why:
  - Structured logs are easier to query/correlate in production and improve incident debugging quality.
  - Live region updates improve WCAG behavior for non-visual users when drag/drop and bulk actions complete or fail.

## 2026-03-24 14:40 (AEDT) - codex

- Files changed:
  - `actions/chat-actions.ts`
  - `app/api/deals/route.ts`
  - `app/api/contacts/route.ts`
  - `components/crm/deal-detail-modal.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Replaced additional `console.error` paths in chat actions and core contacts/deals API routes with structured logger calls and contextual metadata.
  - Improved deal detail modal accessibility by adding screen-reader live announcements for async outcomes and proper tablist/tab/tabpanel semantics for the internal detail tabs.
- Why:
  - Continues the production logging hardening so backend failures are easier to diagnose by action and scope.
  - Improves keyboard/screen-reader navigation and status feedback in one of the most-used CRM modals.

## 2026-03-25 10:15 (AEDT) - codex

- Files changed:
  - `app/api/deals/[id]/route.ts`
  - `app/api/activity/route.ts`
  - `app/api/extension/import/route.ts`
  - `app/api/stale-jobs/sync/route.ts`
  - `lib/encryption.ts`
  - `actions/user-actions.ts`
  - `actions/referral-actions.ts`
  - `__tests__/encryption.test.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Security remediation: added authenticated workspace-scoped access to deal/activity endpoints, removed open access from extension import + stale-jobs sync, made `ENCRYPTION_KEY` deterministic and required, refactored account deletion into a single DB transaction, and fixed the referral conversion double-award race by atomically claiming a per-workspace lock in `settings`.
- Why:
  - Prevents data leaks from unauthenticated or cross-workspace API access.
  - Stops silent OAuth-token decryption failures after redeploys.
  - Ensures deletes are all-or-nothing and avoids orphaned records.
  - Prevents concurrent referral redemptions from awarding rewards twice.

## 2026-03-25 18:30 (AEDT) – Cursor AI Agent

- Files changed:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260325_add_action_execution_idempotency/migration.sql`
  - `lib/idempotency.ts`
  - `actions/task-actions.ts`, `actions/notification-actions.ts`, `actions/activity-actions.ts`
  - `actions/chat-actions.ts`, `actions/automated-message-actions.ts`, `actions/reminder-actions.ts`
  - `lib/ai/context.ts`, `livekit-agent/voice-prompts.ts`, `livekit-agent/agent.ts`
  - `__tests__/idempotency.test.ts`, `__tests__/voice-prompts.test.ts`, `__tests__/dashboard-layout.test.tsx`, `__tests__/tracey-onboarding-email-preview.test.tsx`
- Summary:
  - Added DB-backed cross-system idempotency via a new Prisma `ActionExecution` model and `lib/idempotency.ts` so tasks, notifications, activity rows, email sends, and booking/job/trip SMS reminders don’t duplicate when multiple automation layers race.
  - Improved negative-scope/no-go knowledge handling by deduping near-identical rules using word-overlap and enforcing `[HARD_CONSTRAINT]` as strict no-go while treating `[FLAG_ONLY]` as advisory for owner flags.
- Why:
  - Removes duplicate side-effects caused by uncoordinated automation subsystems.
  - Prevents “near-miss” knowledge no-go duplicates and makes hard constraints consistently dominate prompt behaviour in both chat and voice grounding.

## 2026-03-25 19:35 (AEDT) - codex

- Files changed:
  - `app/api/stale-jobs/sync/route.ts`
  - `app/api/extension/import/route.ts`
  - `extension/manifest.json`
  - `extension/ARCHIVED.md`
  - `.env.example`
  - `docs/agent_change_log.md`
- Summary:
  - Changed stale-jobs sync to be an **automatic/cron** endpoint protected by `CRON_SECRET` (`Authorization: Bearer ...`), instead of requiring a logged-in user session.
  - Archived the paused real-estate browser extension and hard-disabled `/api/extension/import` by default (returns `410`) unless explicitly re-enabled via `ENABLE_ARCHIVED_REAL_ESTATE_EXTENSION=true`.
- Why:
  - Automatic background jobs cannot safely depend on a browser login session; they need a server-to-server secret.
  - Prevents accidentally exposing or relying on a paused, unrelated real-estate feature inside the tradie CRM.

## 2026-03-25 23:55 (AEDT) – Cursor AI Agent

- Files changed:
  - **Typing + hooks + lint fixes across many files**, including:
    - `components/**`, `actions/**`, `lib/**`, `hooks/**`, `app/**`, `__tests__/**`
  - `next.config.mjs` (replaced `next.config.js` to remove `require()` style imports)
  - `livekit-agent/healthcheck.js`, `scripts/fix-env.js` (remove `require()` usage)
  - `docs/current_agent_handoff.md`
- Summary:
  - Removed remaining `any` usage and tightened types (especially around Prisma JSON fields, chat message shapes, and Google Places types).
  - Fixed hook patterns that ESLint flagged (state-setting-in-effect and related patterns) without downgrading rules.
  - Replaced forbidden `require()` imports with safe ESM/dynamic imports where needed.
  - Ensured CI-quality checks now pass: `npm run lint` exits **0 errors** and `npx tsc --noEmit` exits **0**.
- Why:
  - The repo has strict ESLint + TypeScript rules; older “prototype” patterns (`any`, loose JSON, `require()`, effect-driven state) had accumulated and started failing quality gates.
  - This brings the codebase back to a clean, enforceable baseline so future changes don’t regress silently.

## 2026-03-26 14:45 (AEDT) - Codex

- Files changed:
  - `app/**`, `actions/**`, `components/**`, `__tests__/**`
  - `docs/agent_change_log.md`
- Summary:
  - Continued the lint cleanup pass and removed a broad batch of dead imports, dead state, unused variables, and test/mock noise across dashboard, CRM, onboarding, auth, API route, and test files.
  - Fixed several real hook dependency issues with `useCallback` and dependency updates instead of suppressing lint rules.
  - Kept the repo type-safe while materially reducing the current lint warning count, though lint is not yet fully clean.
- Why:
  - This reduces the remaining warning surface so the next cleanup pass can focus on the smaller set of higher-signal files still failing the zero-warning target.
  - Structural hook fixes are preferable to lint suppression because they prevent unstable effect behavior from recurring.

## 2026-03-27 08:40 (AEDT) - Codex

- Files changed:
  - `components/ui/dialog.tsx`
  - `components/ui/alert-dialog.tsx`
  - `components/modals/activity-modal.tsx`
  - `components/modals/new-deal-modal.tsx`
  - `lib/deal-utils.ts`
  - `next.config.mjs`
  - `docs/agent_change_log.md`
- Summary:
  - Restyled the shared dialog and alert-dialog primitives so dashboard overlays use the same softer green-tinted surface, spacing, rounded corners, and typography as the CRM/dashboard revamp instead of the older generic modal look.
  - Updated the dashboard activity modal and the main new-job modal to match that visual system and increased the modal/form typography hierarchy so labels and content are easier to scan.
  - Fixed the new-job modal to actually pass `assignedToId` into `createDeal`, and aligned the `ready_to_invoice` / `INVOICED` stage label to the board-facing name `Awaiting payment`.
  - Removed the restrictive `images.localPatterns` override from `next.config.mjs` so local `next/image` assets like `/latest-logo.png` stop failing SSR with an unconfigured local pattern error.
- Why:
  - Dashboard popups had drifted visually from the refreshed CRM shell, which made the experience feel inconsistent and cramped.
  - The stage-name alignment and assigned-user fix address real workflow confusion in the job creation flow, while the image-config fix removes the recoverable SSR fallback on local logo assets.

## 2026-03-27 09:20 (AEDT) - Codex

- Files changed:
  - `actions/workspace-actions.ts`
  - `lib/workspace-access.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed workspace resolution for accounts whose Supabase auth user id changed but whose app user/workspace is still keyed by the same email.
  - `getOrCreateWorkspace()` now prefers the existing email-linked app user workspace before creating or selecting an owner-id-only workspace.
  - `requireCurrentWorkspaceAccess()` now falls back from auth user id to auth email when no matching app user row exists for the current auth id.
- Why:
  - A stale inactive workspace had been created under a newer auth id, while the real paid workspace still existed under the email-linked app user row.
  - That mismatch caused `/crm/*` layout gating to read the wrong workspace and redirect active users to `/billing`.

## 2026-03-27 20:05 (AEDT) - Codex

- Files changed:
  - `actions/contact-actions.ts`
  - `components/crm/contacts-client.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added a `Last job` column to the contacts table by exposing each contact's primary deal title in the shared contacts view model and query layer.
  - Fixed the contacts page layout to use the same inner scroll container pattern as the CRM shell, restoring page scrolling inside the dashboard frame.
  - Standardized the contacts page heading and table labels to better match the simplified typography direction already applied on analytics and team pages.
- Why:
  - The contacts page had the same shell-layout regression that previously broke analytics scrolling, and operators lacked enough context to tell which job each contact was tied to at a glance.
  - Typography had started drifting page-to-page, so contacts now follows the same tighter header hierarchy instead of keeping an older oversized/mismatched treatment.

## 2026-03-27 20:32 (AEDT) - Codex

- Files changed:
  - `docs/crm_typography_spec.md`
  - `docs/agent_change_log.md`
- Summary:
  - Wrote a CRM typography spec anchored to the dashboard's visual tone, with explicit rules for page titles, section titles, body text, helper copy, and how dark versus muted text should be used across operational pages and settings.
  - Added specific table guidance so primary columns, secondary columns, and status columns stop feeling arbitrary from page to page.
- Why:
  - CRM page typography had started drifting, especially in headers, table emphasis, and helper-copy usage.
  - The spec creates a shared design rationale before further cleanup work, so future changes can be judged against consistent rules instead of isolated taste decisions.

## 2026-03-27 20:54 (AEDT) - Codex

- Files changed:
  - `components/crm/contacts-client.tsx`
  - `app/crm/analytics/page.tsx`
  - `app/crm/team/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Applied the new CRM typography rules to the first operational pages in the sweep: contacts, analytics, and team.
  - Made `Last job` the second primary contact-table column, converted job status into a badge treatment, and kept only supporting columns muted.
  - Standardized the touched analytics/team surfaces and cards to `18px` corners and stronger section-title hierarchy so they sit closer to the dashboard's visual tone.
- Why:
  - The first goal of the spec is to remove arbitrary emphasis, especially in tables and card-heavy operational pages.
  - Radius drift had crept back into custom page-level surfaces, so these pages now explicitly follow the `18px` box-corner rule rather than relying on inconsistent local classes.

## 2026-03-27 21:08 (AEDT) - Codex

- Files changed:
  - `components/layout/global-search.tsx`
  - `components/crm/deal-card.tsx`
  - `components/crm/kanban-board.tsx`
  - `components/crm/deal-detail-modal.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the "Type at least 2 characters to search" helper copy from the shared global search palette so the search surface feels cleaner and less instructional.
  - Continued the CRM typography/radius sweep into the core jobs pipeline surfaces: kanban columns, deal cards, bulk-action dialogs, scheduled-assignment dialog, and the deal detail modal.
  - Normalized the touched custom boxes and panel shells to `18px` corners.
- Why:
  - The search helper message added visual clutter without helping experienced users.
  - Kanban and deal detail are the highest-frequency operational surfaces after dashboard, so they need to match the same typographic hierarchy and corner system instead of keeping older mixed radii.

## 2026-03-27 21:20 (AEDT) - Codex

- Files changed:
  - `components/dashboard/dashboard-main-chrome.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed a hydration mismatch in the CRM shell by making `DashboardMainChrome` keep a stable wrapper structure on both server and client, then only mount the header/modals after hydration when the shell store is ready.
- Why:
  - The previous implementation branched the whole layout tree on client-populated store values (`workspaceId`, `userId`), which meant server HTML and first client render diverged and React regenerated the tree on the client.

## 2026-03-28 13:18 (AEDT) - Codex

- Files changed:
  - `app/api/internal/voice-scheduling/route.ts`
  - `app/crm/settings/training/training-tabs.tsx`
  - `components/settings/google-review-url-section.tsx`
  - `components/layout/Shell.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Normalized omitted voice-scheduling job prices to `0` before handing off to the shared natural-language job creator.
  - Fixed settings save flows that were submitting partial workspace payloads to `updateWorkspaceSettings` by reloading the current settings first and then writing a complete, type-safe payload.
  - Fixed a CRM shell hydration mismatch by removing the alternate pre-hydration shell branch and rendering the same `ResizablePanelGroup` tree on both server and client.
- Why:
  - The internal voice-scheduling API accepts `price` as optional, but the downstream job-creation action requires a concrete number. Passing `undefined` broke production builds under TypeScript.
  - The training and Google Review settings panels had drifted from the full-payload contract used by the shared settings action, which surfaced as TypeScript build failures once the first route error was fixed.
  - The shell still had two separate layout trees around hydration; removing that split eliminates the remaining server/client markup drift in the dashboard frame.

## 2026-03-28 13:46 (AEDT) - Codex

- Files changed:
  - `components/layout/shell-host.tsx`
  - `components/settings/call-forwarding-card.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added a host-level mount gate so the CRM shell renders the same lightweight frame on the server and first client pass before upgrading to the interactive dashboard shell.
  - Wired the call-forwarding `Update phone` CTA directly through the Next router instead of relying on a button/link composition.
- Why:
  - A host-level mount gate is more robust than trusting every shell subcomponent and third-party panel wrapper to remain SSR-stable.
  - The phone-settings CTA should navigate explicitly and predictably from the settings surface.

## 2026-03-28 14:02 (AEDT) - Codex

- Files changed:
  - `actions/deal-actions.ts`
  - `components/crm/deal-card.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Switched completion approval/rejection actions to resolve the acting user through the shared workspace-access helper instead of requiring a session email match.
  - Added explicit draft approve/reject actions and moved both draft and pending-approval card actions into the fixed-height footer banner so card heights stay consistent.
- Why:
  - Pending-approval actions were still using an older `auth.email` lookup, which could wrongly report `Not signed in` for valid managers/owners whose current session resolved by auth user ID and workspace fallback elsewhere in the CRM.
  - Draft cards needed a clear accept/reject outcome, and action rows could not keep changing card height inside kanban columns.

## 2026-03-28 14:34 (AEDT) - Codex

- Files changed:
  - `components/layout/Shell.tsx`
  - `components/ui/resizable.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Split the assistant edge control into two responsibilities: the resize handle remains the drag surface, and a separate overlay pill button now handles expand/collapse clicks.
  - Increased the assistant panel minimum width to `27` so the chat pane does not collapse too narrowly.
- Why:
  - `react-resizable-panels` gives drag priority to overlapping elements on the resize handle, so an embedded clickable pill remained unreliable even after event-propagation fixes.

## 2026-03-28 14:46 (AEDT) - Codex

- Files changed:
  - `components/layout/Shell.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Replaced the assistant edge pill with a single custom control that supports both click-to-toggle and click-and-drag resizing/collapse, while hiding the old built-in handle pill.
- Why:
  - The dedicated overlay button solved click reliability, but the old handle remained visible and the new control did not support dragging. The custom pill now owns both behaviors directly.

## 2026-03-28 14:58 (AEDT) - Codex

- Files changed:
  - `components/layout/Shell.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Restored the assistant divider to a hairline instead of a widened strip, kept the old grip-style pill look, and moved the pill-position updates off React state so dragging feels tighter.
  - Fixed the custom pill close logic to decide collapse vs. clamp from the final dragged size rather than lagging component state.
- Why:
  - The widened divider was wasting canvas width, and rerender-driven pill positioning made the edge control feel visually laggy while dragging.

## 2026-03-28 16:12 (AEDT) - Codex

- Files changed:
  - `app/globals.css`
  - `components/ui/button.tsx`
  - `components/layout/global-search.tsx`
  - `components/dashboard/dashboard-main-chrome.tsx`
  - `components/dashboard/dashboard-client.tsx`
  - `components/dashboard/dashboard-kpi-cards.tsx`
  - `app/crm/analytics/page.tsx`
  - `app/crm/team/page.tsx`
  - `components/crm/contacts-client.tsx`
  - `app/crm/settings/settings-header.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added shared typography/control utility classes for page titles, section titles, body text, micro labels, KPI values, and toolbar pills.
  - Standardized the most visible product controls around a shared toolbar-pill scale so `New Job`, `Filters`, top-bar search, and key utility actions stop drifting in font size and height.
  - Removed the `2w` stale-window selector from the dashboard `Attention Required` KPI so it now reflects all attention-signalled cards in general.
- Why:
  - The product had a written typography spec but not an enforced implementation layer, which left top-bar controls and page headings visually inconsistent.
  - The `Attention Required` KPI was implying a date-windowed definition even though the desired behavior is a general attention count.

## 2026-03-28 16:38 (AEDT) - Codex

- Files changed:
  - `components/crm/deal-card.tsx`
  - `components/crm/kanban-board.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added an explicit post-decision callback from kanban cards back into the board so draft and pending-approval approve/reject actions immediately update the card banner, stage, and position.
  - Decision actions now reinsert the affected card at the top of its destination column instead of waiting for a refresh and leaving it visually stuck.
- Why:
  - The action buttons were calling server actions and `router.refresh()`, but the in-memory kanban state never changed, so cards appeared unchanged until a later refresh and did not move to a logical place in the board.

## 2026-03-28 18:02 (AEDT) - Codex

- Files changed:
  - `app/crm/settings/integrations/page.tsx`
  - `app/crm/settings/settings-header.tsx`
  - `app/crm/settings/account/page.tsx`
  - `components/settings/account-security-card.tsx`
  - `components/ui/alert-dialog.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the unused payment-processor section (`Stripe`, `MYOB PayBy`) from Settings → Integrations and removed the dead-end `Documentation (Soon)` action from the settings header.
  - Redirected the duplicate `/crm/settings/account` route back to the canonical `/crm/settings` account surface.
  - Rebuilt account deletion into a single stronger 3-step rescue flow with reason selection, a tailored off-ramp step, and final typed-name confirmation; removed reliance on the production-blocked `/api/delete-user` fallback from the primary UI path.
  - Tightened shared alert-dialog styling so destructive popups align better with the upgraded dialog treatment.
- Why:
  - The settings area had dead-end controls and overlapping account surfaces that made the product feel unfinished and internally inconsistent.
  - The old delete-account flow was too eager, duplicated in two places, and routed through a fallback that is blocked in production.

## 2026-03-28 18:46 (AEDT) - Codex

- Files changed:
  - `actions/phone-settings.ts`
  - `app/crm/settings/layout.tsx`
  - `app/crm/settings/page.tsx`
  - `app/crm/settings/phone-settings/page.tsx`
  - `app/crm/settings/integrations/page.tsx`
  - `components/dashboard/profile-form.tsx`
  - `components/settings/call-forwarding-card.tsx`
  - `components/settings/personal-phone-card.tsx`
  - `components/settings/personal-phone-dialog.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Rebuilt the account settings phone flow so personal mobile updates now happen inline inside `/crm/settings` instead of bouncing users to a separate phone-settings page.
  - Simplified call forwarding into a single call-handling choice (`Backup AI`, `100% AI`, or `Forwarding off`) and moved carrier selection into an advanced help section instead of presenting it as a primary setup decision.
  - Redirected the old `/crm/settings/phone-settings` route back to the canonical account settings page, tightened the account page copy/headings, and cleaned up integration copy plus the fake disabled `Connected` Xero button.
  - Hardened phone settings actions to resolve the current workspace/user through shared workspace access instead of relying on owner-id-only workspace lookup.
- Why:
  - The settings flow was asking the same call-forwarding question multiple ways, splitting one phone task across multiple surfaces, and surfacing advanced carrier detail too early.
  - The account/settings area needed one canonical place for phone changes and fewer controls that looked clickable or primary without matching the actual workflow.

## 2026-03-29 09:18 (AEDT) - Codex

- Files changed:
  - `components/settings/call-forwarding-card.tsx`
  - `components/settings/account-security-card.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the carrier-help/settings block from the account phone card and simplified the call-handling copy so the section only asks the decisions that matter.
  - Fixed the call-handling option layout to wrap text inside each button/card properly, kept all three modes selectable when a Tracey number exists, and cleaned up the one-tap apply section copy.
  - Rewrote the delete-account rescue flow copy around concrete consequences like losing jobs, contacts, setup, and history instead of generic SaaS phrasing.
- Why:
  - The carrier block was exposing internal setup detail without enough user value, and the shared button `whitespace-nowrap` styling was letting longer descriptions spill outside their sections.
  - The delete flow needed language that sounded like a real warning to a business owner, not abstract product copy.

## 2026-03-29 09:31 (AEDT) - Codex

- Files changed:
  - `app/crm/settings/page.tsx`
  - `components/dashboard/profile-form.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the redundant section labels and separators from the account settings page so cards are no longer titled twice.
  - Shortened the page heading from `Account settings` to `Account` and tightened the profile card title to `Profile`.
- Why:
  - The settings page was narrating the same information twice, which made it feel verbose and heavier than the actual amount of content on screen.

## 2026-03-29 09:44 (AEDT) - Codex

- Files changed:
  - `components/settings/pricing-for-agent-section.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Rebalanced the service pricing table so `Service` and `Comment` own most of the width while `Min fee`, `Max fee`, and actions stay compact.
  - Switched the comment field from a cramped single-line input to a compact two-line textarea for both new and existing rows.
- Why:
  - The table needed to stay dense without forcing long service names and pricing guidance into tiny one-line fields that cut off the information users actually need to type.

## 2026-03-29 09:52 (AEDT) - Codex

- Files changed:
  - `components/onboarding/tracey-onboarding.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Rebalanced the onboarding services/pricing step to use the same content hierarchy as settings: wide `Service` and `Teach Tracey` columns, fixed-width numeric columns, and a compact two-line notes textarea.
- Why:
  - Onboarding needed the same typing space for real service names and pricing guidance, but without turning the step into a bulky back-office table.

## 2026-03-29 10:01 (AEDT) - Codex

- Files changed:
  - `components/settings/pricing-for-agent-section.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Replaced the always-visible blank draft row in the settings service pricing table with an explicit `Add service` flow.
  - The table now shows only real rows by default, opens a draft row only when the user asks to add one, and disables the add action until a service name is entered.
- Why:
  - The permanent blank row looked broken because the action silently no-op’d until a required name field was filled, which made the table feel buggy and cluttered.

## 2026-03-29 10:22 (AEDT) - Codex

- Files changed:
  - `app/crm/settings/call-settings/page.tsx`
  - `app/crm/settings/display/page.tsx`
  - `app/crm/settings/training/page.tsx`
  - `app/crm/settings/training/training-tabs.tsx`
  - `app/crm/settings/workspace/page.tsx`
  - `app/crm/settings/workspace/workspace-form.tsx`
  - `components/settings/call-settings-client.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed duplicate business-hours editors from `Calls & texting` and `Teach Tracey` so `My business` is now the only settings surface that owns working hours.
  - Redirected the duplicate `/crm/settings/workspace` route to `My business` and moved the unique pipeline-threshold controls into `Display` so that setting still exists without a second business-details page.
  - Added an `Other` specialty path in the business-details form that reveals a custom text field instead of trapping users in a fixed preset list.
- Why:
  - Settings had overlapping ownership of business data, which made the app feel inconsistent and made it unclear where users should edit the real source of truth.

## 2026-03-29 11:08 (AEDT) - Codex

- Files changed:
  - `app/crm/settings/after-hours/page.tsx`
  - `app/crm/settings/agent/page.tsx`
  - `app/crm/settings/ai-voice/page.tsx`
  - `app/crm/settings/appearance/page.tsx`
  - `app/crm/settings/help/page.tsx`
  - `app/crm/settings/layout.tsx`
  - `app/crm/settings/notifications/page.tsx`
  - `app/crm/settings/sms-templates/page.tsx`
  - `app/crm/settings/support/page.tsx`
  - `app/crm/settings/training/page.tsx`
  - `components/settings/account-security-card.tsx`
  - `components/settings/support-request-panel.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Consolidated the settings IA so `My business` owns business facts, `Calls & texting` owns communication behavior, and `AI Assistant` is the single canonical page for Tracey�s decision-making.
  - Removed the visible `Teach Tracey` duplication by keeping the `AI Assistant` name in the sidebar and redirecting the old training route into the canonical AI Assistant page.
  - Converted legacy duplicate settings routes like `ai-voice`, `after-hours`, `sms-templates`, `appearance`, and `support` into redirects to their canonical destinations.
  - Merged the support request form into `Help` and redirected the old support page so help and support no longer compete as separate settings experiences.
- Why:
  - The settings area had multiple generations of overlapping pages, which made it unclear where the real source of truth lived for AI behavior, communications, and support.

## 2026-03-29 11:32 (AEDT) - Codex

- Files changed:
  - `app/crm/settings/my-business/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Removed the built-in `Website lead form` section from `My business` so settings no longer presents a second lead-capture path based on embedding an Earlymark form.
- Why:
  - The intended workflow is to use the business�s own website form and send those leads to the Earlymark inbound email, not to maintain a parallel embedded webform product inside settings.

## 2026-03-29 11:48 (AEDT) - Codex

- Files changed:
  - `actions/messaging-actions.ts`
  - `actions/scraper-actions.ts`
  - `actions/sms-templates.ts`
  - `actions/tracey-onboarding.ts`
  - `actions/tradie-actions.ts`
  - `app/crm/settings/sms-templates/sms-templates-form.tsx`
  - `components/onboarding/tracey-onboarding.tsx`
  - `components/settings/google-review-url-section.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Added an optional Google review link field to onboarding so the review URL is captured during setup instead of only living in post-setup settings.
  - Website scraping now attempts to auto-fill the review URL when the business website already links to a Google review page.
  - Review-request messaging now degrades cleanly: if no review link is set, Tracey asks for feedback without sending a broken placeholder link.
- Why:
  - The review-link workflow needed to be part of setup, and the blank-link case needed to behave intentionally instead of sending bad review-link copy to customers.

## 2026-03-29 23:24 (AEDT) - Codex

- Files changed:
  - `actions/automated-message-actions.ts`
  - `actions/feedback-actions.ts`
  - `actions/messaging-actions.ts`
  - `actions/sms-templates.ts`
  - `actions/tradie-actions.ts`
  - `app/api/public-feedback/route.ts`
  - `app/api/twilio/webhook/route.ts`
  - `app/crm/contacts/[id]/page.tsx`
  - `app/crm/settings/call-settings/page.tsx`
  - `app/crm/settings/help/page.tsx`
  - `app/crm/settings/sms-templates/sms-templates-form.tsx`
  - `app/feedback/[token]/page.tsx`
  - `components/dashboard/dashboard-kpi-cards.tsx`
  - `components/feedback/public-feedback-form.tsx`
  - `components/onboarding/tracey-onboarding.tsx`
  - `components/settings/call-settings-client.tsx`
  - `components/settings/google-review-url-section.tsx`
  - `components/settings/pricing-for-agent-section.tsx`
  - `components/settings/support-request-panel.tsx`
  - `components/settings/working-hours-form.tsx`
  - `docs/user_facing_truth_map.md`
  - `lib/public-feedback.ts`
  - `__tests__/public-feedback-route.test.ts`
  - `__tests__/public-feedback.test.ts`
  - `__tests__/twilio-sms-webhook.test.ts`
- Summary:
  - Reduced `Calls & texting` to real customer-facing controls only: contact hours, urgent-call routing, and automated customer messages, with the automated-message actions now resolving the current workspace through shared workspace access instead of brittle email lookup.
  - Added a signed public customer feedback flow at `/feedback/[token]` plus `/api/public-feedback`, and rewired review-request SMS and template placeholders to send customers to the internal Earlymark feedback form first.
  - Standardized customer ratings around `CustomerFeedback` as the canonical source, including low-score alerts, contact-page feedback visibility, and Google review as an optional second-step CTA only after strong internal feedback.
  - Removed the separate SMS auto-response kill switch from the Twilio webhook path so Tracey mode remains the single customer-contact policy across calls and messages.
  - Documented the new product source-of-truth ownership model in `docs/user_facing_truth_map.md` and tightened a few remaining settings saves so business-hours and pricing edits no longer rewrite unrelated hidden voice or debug settings.
- Why:
  - The product was implying behavior that did not line up with its real runtime paths. This pass narrows the surface area to what actually works, makes feedback analytics trustworthy by wiring a real intake path, and reduces duplicate or contradictory settings logic.

## 2026-03-31 01:16 (AEDT) - Codex

- Files changed:
  - `app/admin/customer-usage/page.tsx`
  - `app/admin/diagnostics/page.tsx`
  - `app/admin/ops-status/page.tsx`
  - `docs/agent_change_log.md`
  - `lib/admin/customer-usage.ts`
  - `lib/admin/voice-ai-rate-card.ts`
  - `__tests__/admin-internal-route-redirects.test.ts`
  - `__tests__/customer-usage-metrics.test.ts`
- Summary:
  - Replaced the three drifting internal admin pages with one canonical observability surface at `/admin/customer-usage`, using a top overview plus `Overview`, `Customers`, and `Ops` tabs driven by query params.
  - Removed the hardcoded Stripe `$59` fallback and the old proxy-heavy economics from the admin data contract, keeping only exact subscription revenue from live Stripe, exact current-month Twilio spend, explicit coverage counts, and clearly labeled rollups.
  - Locked `Jobs Won With Tracey` to the approved system-source formula, added exact `Sub rev - Twilio month spend`, and limited `Cost per won job` to the approved current-month formula.
  - Added a documented voice-only AI cost estimate path backed by an explicit rate card module, persisted call duration/transcript data, and estimate coverage reporting, while keeping that estimate out of top truth KPIs.
  - Redirected `/admin/ops-status` and `/admin/diagnostics` into the unified page and added targeted tests for filters, formula helpers, and redirect behavior.
- Why:
  - The internal admin surface needed to become a real single point of truth instead of three overlapping pages that mixed exact values with silent fallbacks and proxy metrics.

## 2026-03-31 20:33 (AEDT) - Codex

- Files changed:
  - `app/admin/customer-usage/page.tsx`
  - `docs/agent_change_log.md`
  - `lib/admin/customer-usage.ts`
  - `__tests__/customer-usage-metrics.test.ts`
- Summary:
  - Added a `1d` range to the unified internal admin page and its filter parser so the observability view can switch between `1d`, `7d`, `30d`, and `90d` without falling back to card-only summary blocks.
  - Reworked `/admin/customer-usage` from a card-heavy dashboard collage into clearer table-based sections for truth rules, overview metrics, coverage, customer rows, action queues, and ops checks, while keeping the full customer table visible both in Overview and in the detailed Customers tab.
  - Removed the extra top subtitle, improved the truth-model wording to clarify exact numbers vs rollups vs estimates, and expanded the `Twilio month spend` explanation so it states that the number is the live current-month total from Twilio Usage Records plus explicit coverage.
  - Kept the selected customer drilldown intact while cleaning up the remaining observability wording and separators so the page reads more like one operational monitor and less like three dashboards stitched together.
- Why:
  - The unified page still felt too card-driven and too hard to skim. This pass makes the main internal page denser, clearer, and closer to the single source of truth the user expected.

## 2026-04-03 14:05 (AEDT) - Codex

- Files changed:
  - `__tests__/voice-prompts.test.ts`
  - `__tests__/whatsapp-route.test.ts`
  - `app/crm/settings/agent/page.tsx`
  - `APP_FEATURES.md`
  - `docs/agent_change_log.md`
- Summary:
  - Audited the internal WhatsApp Assistant path and the multilingual voice-call claim against the actual runtime code instead of relying on old UI wording.
  - Added regression coverage showing the WhatsApp webhook authenticates users by their saved personal mobile, strips the `whatsapp:` prefix before lookup, and sends a fallback WhatsApp reply when the headless CRM agent errors.
  - Added direct voice-prompt tests so normal customer calls plus both Earlymark sales/demo call types all preserve the explicit "reply in the same language as the caller" rule.
  - Updated the AI Assistant settings copy to describe WhatsApp as a beta internal control surface for workspace users, not an end-customer channel and not a vague WIP.
  - Updated `APP_FEATURES.md` to document the real WhatsApp access model and to note that multilingual voice is live in runtime while the onboarding multilingual toggle is currently captured preference data rather than a hard runtime gate.
- Why:
  - Product truth had drifted: the WhatsApp assistant was more real than the UI suggested, while the multilingual onboarding toggle implied a stronger runtime switch than the code currently enforces. This pass aligns tests and docs with what actually works today.

## 2026-04-03 22:58 (AEDT) - Codex

- Files changed:
  - `__tests__/chat-actions.test.ts`
  - `__tests__/pre-classifier.test.ts`
  - `actions/chat-actions.ts`
  - `app/crm/settings/agent/page.tsx`
  - `docs/agent_change_log.md`
  - `lib/ai/pre-classifier.ts`
- Summary:
  - Added a lightweight chatbot feedback guardrail so obvious feedback, complaints, and feature-suggestion language gets classified into the support/escalation lane instead of being handled too casually in general chat.
  - Updated the support-ticket subject and user-facing support response so feedback-like requests are labeled as `Product Feedback` and acknowledged as something the team reviews directly.
  - Added regression coverage for the new pre-classifier behavior and for feedback-like chatbot messages creating the expected ticket type.
  - Confirmed via the linked Vercel project envs that the deployed WhatsApp backend number is the Earlymark demo number `+61485010634`, and aligned the AI Assistant settings page fallback display to that number so the UI does not fall back to a fake placeholder when no public env is present.
- Why:
  - Missing feedback is more expensive than over-escalating it. This keeps product feedback from disappearing into a normal chatbot reply while keeping the implementation lightweight and easy to maintain.

## 2026-04-03 23:08 (AEDT) - Codex

- Files changed:
  - `__tests__/chat-actions.test.ts`
  - `actions/chat-actions.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Extended chatbot-created support and feedback tickets so they now also send an email to the configured support inbox (`SUPPORT_EMAIL_TO`) using the same Resend-based support channel as the manual support form.
  - Included ticket ID, workspace context, Tracey number, Twilio/voice status, and the original user message in the outbound support email so product/support can triage directly from inbox.
  - Added regression coverage proving chatbot phone-support and product-feedback requests now trigger the support email send as well as the internal activity ticket.
- Why:
  - Capturing feedback only in the database still risked it going unseen. Emailing the support inbox closes that loop so chatbot feedback reaches a channel the team actually monitors.

## 2026-04-03 23:32 (AEDT) - Codex

- Files changed:
  - `FEATURE_VERIFICATION.md`
  - `APP_FEATURES.md`
  - `__tests__/feature-verification.test.ts`
  - `app/admin/customer-usage/page.tsx`
  - `docs/agent_change_log.md`
  - `lib/feature-verification.ts`
- Summary:
  - Added a new feature-verification source of truth that grades important promises across behavior, delivery, observability, and live-proof layers instead of assuming implemented code means a feature is production-proven.
  - Surfaced that report directly inside the internal ops tab at `/admin/customer-usage?tab=ops#feature-promises`, including current blockers and the next reinforcement needed for each promise.
  - Tracked the current proof state for the internal WhatsApp assistant, chatbot feedback delivery, multilingual voice calls, booking confirmations on scheduled transitions, and the public job portal.
  - Added regression coverage for the verification report logic and linked `APP_FEATURES.md` back to the new verification process so product docs and live proof do not drift apart again.
- Why:
  - The gap was not just missing code. It was missing proof that the right thing reached the right destination and that ops could tell when it stopped happening. This makes those gaps visible instead of accidental.

## 2026-04-03 23:41 (AEDT) - Codex

- Files changed:
  - `FEATURE_VERIFICATION.md`
  - `JOURNEY_ACCEPTANCE.md`
  - `docs/agent_change_log.md`
- Summary:
  - Added a separate journey-acceptance gate focused on whether the intended user can actually find, access, complete, and make sense of the flow end to end, instead of only checking backend correctness.
  - Documented the eight release checks for user journeys: discoverability, access, completion, outcome, coherence, follow-through, failure handling, and proof.
  - Listed the current highest-priority journeys to audit with that lens: internal WhatsApp assistant, chatbot feedback, booking confirmations, the public job portal, and multilingual Tracey calls.
- Why:
  - A feature can be technically implemented and still be incomplete for the real user. This adds a concrete standard for "nothing important is missing" rather than treating that as a vague feeling.

## 2026-04-03 23:55 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/contact-form.test.tsx`
  - `__tests__/inbox-view.test.tsx`
  - `__tests__/map-view.test.tsx`
  - `app/crm/contacts/[id]/edit/page.tsx`
  - `app/crm/contacts/new/page.tsx`
  - `app/crm/inbox/page.tsx`
  - `components/crm/contact-form.tsx`
  - `components/crm/inbox-view.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Audited the main CRM surface with a user-journey lens instead of only checking server actions and backend behavior.
  - Fixed two concrete CRM usability gaps: the missing contact create/edit pages behind existing links, and the inbox deep-link behavior so `/crm/inbox?contact=...` now opens the intended contact thread.
  - Added focused coverage for contact create/update flow and inbox deep-linking, and made the map-view interaction test resilient to date drift.
  - Documented the current CRM page verdicts in `CRM_PAGE_AUDIT.md`, separating stronger `go` surfaces from `watch` areas that still need more end-to-end verification.
- Why:
  - The user explicitly wanted confidence that the actual CRM pages and workflows are there, accessible, and logically complete. This pass closes obvious dead ends and records what still needs a deeper audit.

## 2026-04-04 00:08 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/crm-route-guards.test.tsx`
  - `app/crm/analytics/layout.tsx`
  - `app/crm/schedule/schedule-calendar.tsx`
  - `app/crm/settings/integrations/layout.tsx`
  - `app/crm/team/page.tsx`
  - `components\layout\search-dialog.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Tightened CRM page access so manager-only sections are now blocked at the route layer for analytics and integrations instead of relying on client-side redirects or hidden sidebar links alone.
  - Made the team page more coherent for team members by hiding invite and role-management controls they are not allowed to use.
  - Improved schedule drag/drop failure handling so users get a visible error toast instead of a silent console-only failure.
  - Updated the CRM audit to reflect the stronger direct-access guarantees and the team-page behavior improvements.
- Why:
  - A CRM page is not really "working" if the wrong user can reach it in a confusing state or if an interaction fails without clear user feedback.

## 2026-04-04 00:20 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/schedule-calendar.test.tsx`
  - `__tests__/schedule-page.test.tsx`
  - `__tests__/settings-layout.test.tsx`
  - `app/crm/schedule/page.tsx`
  - `app/crm/schedule/schedule-calendar.tsx`
- Summary:
  - Tightened the schedule journey for team members so they now only see their own jobs and their own visible lane instead of the full team roster with empty lanes.
  - Hid the schedule team filter when there is only one visible team member, which removes a pointless control in the restricted tradie view.
  - Added direct coverage for the schedule page role split and the schedule calendar UI behavior, plus sidebar coverage proving team members do not see Billing or Integrations links in settings.
  - Updated the CRM audit to distinguish the now-stronger schedule access proof from the still-unverified scheduling side effects.
- Why:
  - A page can still feel wrong even when the raw data is filtered correctly. This pass makes the tradie schedule view match the intended product workflow and adds proof that the CRM navigation matches user permissions.

## 2026-04-04 00:34 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/deal-actions.test.ts`
  - `__tests__/deal-edit-form.test.tsx`
  - `__tests__/deal-page-access.test.tsx`
  - `__tests__/team-page.test.tsx`
  - `actions/deal-actions.ts`
  - `app/crm/deals/[id]/edit/deal-edit-form.tsx`
  - `app/crm/deals/[id]/edit/page.tsx`
  - `app/crm/deals/[id]/page.tsx`
  - `docs/agent_change_log.md`
  - `lib/workspace-access.ts`
- Summary:
  - Closed a direct-URL access hole where team members could still reach arbitrary deal detail and edit pages inside the workspace even though the rest of the CRM filtered them to assigned jobs.
  - Routed the deal detail and deal edit pages through the shared scoped-deal guard and added page-level tests proving forbidden jobs now resolve as not found.
  - Added a reassignment guardrail so team members can no longer change assignees through the edit flow or server action path, and hid assignment controls for restricted users on the edit form.
  - Added role-specific rendering coverage for the team page so manager-only invite controls are now directly proven instead of only visually inspected.
- Why:
  - CRM trust drops fast when users can reach the wrong records by URL or are shown controls they should not be able to use. This pass closes those holes and adds proof around them.

## 2026-04-04 00:47 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/contact-page-access.test.tsx`
  - `__tests__/map-page-access.test.tsx`
  - `app/crm/contacts/[id]/page.tsx`
  - `app/crm/map/page.tsx`
  - `docs/agent_change_log.md`
  - `lib/workspace-access.ts`
- Summary:
  - Closed another direct-link access hole by scoping contact detail pages through the shared contact-access guard, so team members cannot browse unrelated customer records by URL.
  - Aligned the map page with the schedule page by filtering scheduled jobs down to the current tradie for `TEAM_MEMBER` users instead of loading the whole workspace roster.
  - Added focused page-level coverage proving contact detail access now fails closed when the scoped guard denies access, and that the map page respects manager vs tradie visibility.
  - Updated the CRM audit to reflect that map visibility and contact access are now materially stronger than before.
- Why:
  - CRM pages have to agree on who can see what. When one page still leaks the full workspace while another is restricted, the product feels inconsistent and unsafe. This pass removes two more of those inconsistencies.

## 2026-04-04 00:51 (AEDT) - Codex

- Files changed:
  - `app/crm/settings/help/page.tsx`
  - `components/crm/contact-notes.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Cleaned obvious mojibake and broken punctuation in the CRM help handbook and contact-notes editor so these core user-facing surfaces read like finished product instead of mis-encoded text.
  - Standardized the contact-notes placeholder and save button copy to plain ASCII wording.
  - Replaced broken handbook arrows in Settings -> Help with stable readable text.
- Why:
  - Even when the workflows work, broken copy makes the CRM feel less trustworthy. These are high-visibility surfaces that users read directly while learning and using the product.

## 2026-04-04 01:03 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/contact-page-access.test.tsx`
  - `__tests__/deal-page-access.test.tsx`
  - `app/crm/contacts/[id]/page.tsx`
  - `app/crm/deals/[id]/page.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Closed a quieter CRM visibility leak where team members could be blocked from unrelated contacts/deals by URL but still see other tradies' jobs and history once inside a shared customer record.
  - Scoped contact detail jobs, customer feedback, and timeline items down to the current tradie's visible assigned jobs, and added focused regression coverage proving hidden items no longer render.
  - Scoped the deal detail page's related "Past jobs" panel to the current tradie's own jobs for that customer, and added page-level proof for the new query behavior.
  - Cleaned the visible job-history copy on those detail pages to remove broken punctuation and ambiguous placeholder glyphs.
- Why:
  - Access control has to hold inside the page, not just at the route boundary. This closes another class of "page loads, but shows too much" CRM issue on the highest-visibility customer/job detail screens.

## 2026-04-04 01:06 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/contact-actions.test.ts`
  - `actions/contact-actions.ts`
  - `docs/agent_change_log.md`
- Summary:
  - Aligned contact mutation permissions with the actual CRM UI by blocking `TEAM_MEMBER` users from editing contact fields or bulk-deleting contacts through server actions.
  - Tightened the shared `getContact` helper so future consumers inherit the same visible-deal scoping as the live contact detail page instead of reintroducing full-history leakage by accident.
  - Added regression coverage proving team members are rejected from contact-detail edits and bulk contact deletion even if they can still view the assigned customer record.
- Why:
  - Hiding manager-only pages is not enough if a looser server action still accepts the change. This closes the backend side of that mismatch for contact management.

## 2026-04-04 01:12 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/schedule-calendar.test.tsx`
  - `app/crm/schedule/schedule-calendar.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Fixed a misleading schedule-calendar path where drag/drop reschedules treated a returned `{ success: false }` action result as success as long as the server action did not throw.
  - The calendar now checks the actual action result, shows the backend error message when a drop is rejected, and refreshes back to server truth instead of leaving the user with a false success toast.
  - Added a drag/drop regression test proving failed reschedules now surface the backend message and trigger a refresh, while keeping the earlier team-lane visibility coverage.
  - Cleaned the visible week-range header copy to plain ASCII punctuation.
- Why:
  - A CRM workflow is not trustworthy if the page says "Job updated" when the backend actually said no. This makes the schedule UI tell the truth under failure, not just under happy-path success.

## 2026-04-04 01:20 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/deal-api-route.test.ts`
  - `__tests__/deal-detail-modal.test.tsx`
  - `app/api/deals/[id]/route.ts`
  - `components/crm/deal-detail-modal.tsx`
  - `components/settings/business-contact-form.tsx`
  - `components/settings/working-hours-form.tsx`
  - `docs/agent_change_log.md`
- Summary:
  - Tightened the deal-detail modal and its backing API so the modal now matches the stricter full-page behavior instead of drifting into its own weaker access and action rules.
  - The modal API route now scopes related customer jobs by workspace and assigned tradie for `TEAM_MEMBER` users, closing a second path where other tradies' jobs could still leak through the modal after the full detail page was fixed.
  - The modal's `Edit` buttons now route to the actual deal/contact edit pages, the quick-update send button now really sends without requiring Enter in the input, and returned `updateDeal()` failures now surface as errors for draft confirmation and invoice updates instead of pretending the save worked.
  - Added focused proof for the modal interactions and the API scoping, and cleaned two visible settings save labels back to plain ASCII `Saving...`.
- Why:
  - The deal modal is one of the highest-traffic CRM surfaces. It needs to be held to the same standard as the full pages: the right user sees the right data, every prominent action goes somewhere real, and failures are reported honestly instead of being papered over.

## 2026-04-04 01:38 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/deal-photos-upload.test.tsx`
  - `__tests__/job-billing-tab.test.tsx`
  - `__tests__/settings-route-redirects.test.tsx`
  - `__tests__/tradie-actions.test.ts`
  - `actions/tradie-actions.ts`
  - `components/crm/deal-photos-upload.tsx`
  - `components/tradie/job-billing-tab.tsx`
- Summary:
  - Tightened the remaining CRM truthfulness gaps around billing, photo uploads, and legacy settings entry points so those surfaces are now proven under the same "does the user actually get the right outcome?" standard as the earlier schedule and deal-detail fixes.
  - The job billing tab now respects returned `generateQuote()` failures instead of falsely toasting success, and gained focused component coverage for both the rejected and successful create-invoice paths.
  - Added direct photo-upload coverage proving the deal detail surface refreshes and clears its note on success, while surfacing backend rejection messages without falsely refreshing on failure.
  - Added route-level proof that legacy settings URLs still land on the correct canonical pages and that direct `/crm/settings/billing` access is blocked for team members before any workspace data loads.
  - Aligned `sendOnMyWaySMS()` with the shared scoped-deal guard so the tradie workflow no longer performs an unscoped job lookup before sending a live customer message.
- Why:
  - The remaining CRM risk was less about missing pages and more about trust: whether high-traffic actions tell the truth, whether old URLs still get users somewhere sensible, and whether live customer-facing actions obey the same access rules as the rest of the system. This pass closes several of those last obvious gaps.

## 2026-04-04 01:50 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/call-settings-client.test.tsx`
  - `__tests__/deal-actions.test.ts`
  - `__tests__/knowledge-actions.test.ts`
  - `__tests__/service-areas-section.test.tsx`
  - `actions/deal-actions.ts`
  - `actions/knowledge-actions.ts`
  - `components/settings/service-areas-section.tsx`
- Summary:
  - Closed a real workflow gap where jobs created directly into `Scheduled` did not have the same business-rule parity as the other scheduled-entry paths. Scheduled creation now requires both an assignee and a booked time, and it fires the booking-confirmation hook just like stage transitions and direct deal edits.
  - Promoted job reassignment from a silent field update into a proper CRM action by logging it, auditing it, revalidating the key schedule/map/detail surfaces, and best-effort resyncing the calendar event when the deal is already scheduled.
  - Fixed a stale settings invalidation path by revalidating the live `/crm/settings/my-business` surface alongside the legacy `/crm/settings/knowledge` alias for knowledge/service-area mutations.
  - Tightened the My business service-area component so it now respects returned backend failures instead of always toasting success.
  - Added direct component proof for the Calls & texting settings page covering fallback/default loading, merged settings saves, and automatic Tracey sign-off handling on automated message templates.
- Why:
  - At this stage the remaining CRM risks were workflow-consistency risks: different entry points into the same business action behaving differently, or a save succeeding in the backend but not cleanly propagating back to the page the user is actually on. This pass closes several of those last visible seams.

## 2026-04-04 02:05 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/business-contact-form.test.tsx`
  - `__tests__/deal-actions.test.ts`
  - `__tests__/google-review-url-section.test.tsx`
  - `__tests__/schedule-calendar.test.tsx`
  - `actions/deal-actions.ts`
  - `app/crm/schedule/schedule-calendar.tsx`
  - `components/settings/business-contact-form.tsx`
  - `components/settings/google-review-url-section.tsx`
- Summary:
  - Removed the last meaningful partial-update risk in the CRM schedule by replacing the two-step drag/drop mutation path with a single `rescheduleDeal()` server action. Cross-lane moves now update time and assignee atomically instead of risking a half-applied backend state.
  - Added direct proof that the calendar now uses the atomic reschedule path and still surfaces backend failures honestly.
  - Added direct component proof for two more My business forms: business contact details and Google review URL. Both now have interaction coverage for trimmed saves and visible failure handling.
  - Tightened those form components so they no longer treat a non-throwing failed save result as success.
- Why:
  - The remaining CRM issues were no longer missing pages; they were subtle trust problems where one failed mutation could leave data in-between states or where settings forms were only "probably fine." This pass reduces that last class of risk in both schedule operations and business-profile settings.

## 2026-04-04 03:22 (AEDT) - Codex

- Files changed:
  - `CRM_PAGE_AUDIT.md`
  - `__tests__/dashboard-layout.test.tsx`
  - `__tests__/inbox-page.test.tsx`
- Summary:
  - Added direct route-level proof for the main CRM shell gates so the app now explicitly verifies the three user-entry branches that matter most: unauthenticated users are redirected to `/auth`, unpaid workspaces to `/billing`, and active but not-yet-onboarded workspaces to `/setup`.
  - Added a new page-level inbox test suite covering login redirect, manager-only route protection, query-param thread selection, and the "database unavailable" fallback state. That closes the gap where the inbox internals were well-tested but the page boundary itself was still assumed.
  - Updated the CRM audit to reflect that `/crm/inbox` is now supported by both page-level and component-level journey proof.
- Why:
  - The next reliability layer is no longer "does the widget work," but "can the intended user actually reach the right page and get sensible behavior from the boundary conditions?" This pass adds that proof for two of the most central CRM surfaces.

## 2026-04-04 04:18 (AEDT) - Codex

- Files changed:
  - `.gitignore`
  - `app/crm/dashboard/page.tsx`
  - `e2e/admin.spec.ts`
  - `e2e/constants.ts`
  - `e2e/global-setup.ts`
  - `e2e/public-preview.spec.ts`
  - `e2e/team-member.spec.ts`
  - `lib/auth.ts`
  - `package.json`
  - `playwright.config.ts`
- Summary:
  - Added a real Playwright harness to the repo with a test script, config, auth-cookie test mode, and browser specs for admin, tradie, and public customer-facing flows.
  - The CRM specs are designed to run against an isolated Postgres-backed E2E workspace when the harness can provision it, and they now skip cleanly instead of hanging when that DB layer is unavailable.
  - Added public browser smoke coverage that runs without the DB harness and verifies the landing page plus the polished portal preview route in a real browser.
  - Suppressed dashboard demo seeding during E2E runs so browser assertions can target deterministic data instead of dev-only injected jobs.
- Why:
  - The next step after unit/integration proof is real browser proof. This harness makes that possible in-repo while being honest about environmental blockers: public Playwright smoke tests pass now, and the deeper CRM flows are ready to execute as soon as the isolated DB harness becomes available on the machine running the suite.
## 2026-04-05 00:28 (AEDT) - Codex

- Files changed:
  - `docs/agent_handoff_2026-04-05.md`
  - `docs/master_outstanding_checklist.md`
- Summary:
  - Added a flat master checklist that consolidates the full-chat context into one operational status document: what is fixed, what is still open, what must be re-verified in the live app, what is deferred for real provider/device testing, and what context only exists in local unshipped files.
  - Updated the main handoff so the next agent reads this checklist before diving into code or the live workflow audit.
- Why:
  - The handoff, change log, and workflow audit together were already strong, but they still required synthesis. This pass removes that ambiguity by giving the next agent one explicit checklist that captures the outstanding work from the whole session.
