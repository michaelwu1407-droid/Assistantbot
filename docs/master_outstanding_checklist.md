# Master Outstanding Checklist

This file is the flat checklist for the next AI agent.

Use it together with:
- [docs/agent_handoff_2026-04-05.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_handoff_2026-04-05.md)
- [docs/agent_change_log.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_change_log.md)
- [LIVE_CRM_WORKFLOW_AUDIT.md](/C:/Users/micha/Projects/Assistantbot/LIVE_CRM_WORKFLOW_AUDIT.md)

Status meanings:
- `fixed`: implemented and logged in repo
- `open`: still needs work
- `re-verify`: likely still a problem or only partially fixed; confirm in live app before changing code
- `deferred`: intentionally left for later, usually because it needs live provider/device verification
- `local-only`: known context from this chat that may exist only in the current local worktree or was discussed but not shipped

## Locked Product Decisions

- `fixed` Tracey must remain LLM-first for normal CRM interaction.
- `fixed` Bouncer/lead triage should prefer hold/review over hard decline.
- `fixed` Typed addresses must not be silently rewritten by autocomplete.
- `fixed` Settings pages should use page-level vertical scrolling instead of clipped nested scroll regions.
- `fixed` User-facing stage labels should use shared helpers and avoid leaking legacy/internal stages.

## Recently Fixed In Repo

- `fixed` Booking confirmations send when jobs first enter `Scheduled`.
- `fixed` Reschedule confirmations send when a scheduled booking time changes.
- `fixed` Reminder state resets when jobs are rescheduled so the new reminder can fire.
- `fixed` Customer portal polling was reduced to every 5 minutes.
- `fixed` A prettier portal preview route exists.
- `fixed` Call-handling mode copy is clearer and tested for `Backup AI`, `100% AI`, and `Forwarding off`.
- `fixed` Chatbot feedback/support routing now creates a ticket and sends to the support email path.
- `fixed` Feature verification matrix and journey acceptance docs exist.
- `fixed` Major CRM dead ends were closed for contact create/edit, inbox deep-linking, route guards, and multiple permission holes.
- `fixed` Stage-language cleanup now maps visible CRM states to `Quote sent`, `Scheduled`, `Awaiting payment`, and related user-facing labels.
- `fixed` Invoice-related actions revalidate key CRM surfaces more reliably.
- `fixed` Address input no longer silently rewrites typed addresses.
- `fixed` Held-review triage now surfaces in notes, digests, and deal-card UI.

## Highest-Priority Open Product Work

- `open` Continue live authenticated CRM workflow testing and fix remaining trust/coherence issues.
- `open` Continue improving Tracey’s real CRM usefulness: answering CRM questions correctly and performing CRM changes correctly with natural language.
- `open` Finish real provider/device verification for voice, SMS, email, WhatsApp assistant, and LiveKit paths.
- `open` Reconcile and stabilize the targeted test suite after the later upstream CRM/UI batch so verification is green again.

## Latest Upstream Review Snapshot

The repo was later advanced beyond the original handoff and then reviewed against `origin/main` up to commit `6a0eae53`.

### What looked good

- `fixed` Global search mouse-click behavior now has direct test coverage and passed.
- `fixed` Core Tracey/chat suites still passed:
  - `chat-route`
  - `chat-actions`
  - `tracey-prompt-contract`
  - `triage`
  - `digest`
- `fixed` Stage-label and portal-label helpers remained healthy.
- `fixed` Core deal/tradie/settings target suites still passed.
- `fixed` The later agent generally followed the intended direction rather than rewriting architecture.

### What did not verify cleanly yet

- `fixed` The post-handoff bundle is now fully green.
- `fixed` `contact-form.test.tsx` passes cleanly in batch and alone.
- `fixed` `inbox-view.test.tsx` Ask Tracey success flow passes cleanly in batch and alone.
- `fixed` `team-page.test.tsx` updated: `Open invite link` button assertion now uses `role="button"` (was a `role="link"` — implementation uses `window.open`).
- `fixed` `contacts-client.tsx` header summary fixed: no-pagination case now shows `"N contact(s)"`, footer duplication removed.
- `fixed` `new-deal-modal.test.tsx` updated: assignee button match uses `/Jess Smith/i` regex; `scheduledAt` updated to correct UTC value after workspace timezone anchoring.

### Immediate Next Verification Step

- `fixed` Stale and flaky tests reconciled. The later upstream CRM batch is now fully signed off.

## Live CRM Workflow Bugs And Product Gaps To Re-Verify

### Contacts / Contact Flow

- `fixed` Contacts list count/footer mismatch: stage filter silently dropped contacts with no primary deal, LOST deals, and PENDING_COMPLETION deals. Filter is now inclusive for unmapped/null stages. LOST added to KANBAN_STAGES. PENDING_COMPLETION mapped to "completed".
- `fixed` Contact create success path: `router.replace` to contact detail page after create confirmed in code.
- `fixed` Contact edit success path: `router.replace` to contact detail page after edit confirmed in code.
- `fixed` Contact detail page: company, phone, email, address now each show '+ Add X' links to the edit page when empty. Both BUSINESS and PERSON layouts updated.
- `fixed` Bulk contact delete: `deleteContacts` revalidates `/crm/contacts`. `deleteContact` (singular) also now revalidates — was missing previously.
- `fixed` Search/filter footer count: no longer shows "Showing 8 of 8" when contacts are being filtered client-side. The header now shows `"N contacts"` without pagination, and `"Matches on this page: ..."` when filters are active with pagination.
- `fixed` contacts-client tests aligned and green.
- `fixed` Contact form redirect flow is stable.

### Deal / Job Detail

- `fixed` Deal detail page now shows assigned team member in "Current job" card. db query includes `assignedTo`. Test mock updated accordingly.
- `fixed` Job detail page: added jobStatus badge, Google Maps Navigate button, and Call/Text quick links in the Current Job card for operational context.
- `fixed` Deal detail page: 'Current job' card and subtitle now show invoicedAmount when an invoice exists (with quoted value as secondary), instead of always showing the original estimate.
- `fixed` Notes saved on contacts/jobs: `logActivity` and `appendTicketNote` revalidate correctly; deal page ActivityFeed now receives `initialData` server-side and chat interface calls `router.refresh()` after Tracey finishes so mutations appear immediately.

### Scheduling / Calendar / Map

- `fixed` Cross-page schedule time mismatch: `updateJobSchedule`, `updateJobStatus`, `completeJob` now revalidate dashboard, deals, and deal detail pages.
- `fixed` Calendar drag/reschedule schedule-calendar tests: timezone-sensitive date-key mismatch fixed by adding `initialDate` prop to `ScheduleCalendar` and using a fixed UTC reference in tests. Drag logic itself was already correct.
- `fixed` Dashboard create-into-`Scheduled`: new-deal-modal now validates `scheduledAt` client-side when stage is "scheduled", matching the server-side check. Error is surfaced immediately as a toast rather than an uninformative failure.
- `fixed` Map view Today Only empty state: when no jobs today, shows the next upcoming job with date/time and a 'Show all upcoming jobs' button; if none exist, shows 'Switch to All Jobs view'.
- `fixed` Map view future-job UX: All Jobs view now sorted (upcoming first/soonest first, past jobs below). Each sidebar card shows relative date label (Today/Tomorrow/day name + time) and '(past)' marker on overdue jobs.

### Inbox / Messaging UX

- `fixed` Inbox composer mode ambiguity resolved: Direct SMS tab moved to first position to match default mode; explanation card clearly states which tab uses AI vs sends raw SMS.
- `fixed` Inbox `Conversations` vs `System Activity` split: `isSystemEvent` now correctly classifies assignee changes, deal updates, stage moves, invoice ops, portal views, and post-job follow-ups as System Activity instead of surfacing them in Conversations.
- `fixed` Ask Tracey success test is stable in batch.

### Billing / Quotes / Invoices

- `fixed` Stage label consistency: tutorial-view.tsx replaced 'Invoiced' with 'Awaiting payment' to match live kanban column. job-billing-tab.tsx missing Badge import fixed. Stage label helpers verified consistent.
- `fixed` Invoice creation clarity: billing tab now shows a hint below Create Invoice button explaining that new invoices start as Draft until issued.
- `re-verify` Quote/invoice quick actions and wizard flows still need true end-to-end usability validation.
- `open` Full quoting and estimate-approval workflows still need deeper live testing.
- `fixed` Post-job review-request flow: requestReview tool wired to sendReviewRequestSMS. 'Request review' quick action buttons now backed by a real tool. Returns structured success/error with quickAction to view customer responses.

### Search / Notifications / Quick Actions

- `fixed` Global search mouse-click: contacts `CommandItem` now has `onClick` handler, consistent with all other result types.
- `fixed` Invoice chat actions (createDraftInvoice, issueInvoice, markInvoicePaid, voidInvoice, getInvoiceStatus) now return structured {message, success, quickActions} objects. The chat UI renders a green success card with follow-up action buttons (e.g. 'Issue to client', 'Mark as paid', 'Move to Completed').

### Team / Analytics / Settings / Integrations

- `fixed` Team invite success copy: `inviteEmail` is validated non-empty before `createInvite` is called, so `Invite sent to !` cannot occur. Toast at line 106 of team/page.tsx correctly uses `inviteEmail.trim()` which is always non-empty at that point.
- `fixed` Analytics stage labels: `STAGE_LABELS` in `analytics-actions.ts` maps all known stages to user-facing labels. "Status 0" does not appear in current code — was already fixed in a prior session.
- `re-verify` Integration connection CTAs for some providers looked broken or misconfigured in live use. Code-side: buttons are disabled with clear amber reason banners when provider env vars are not configured. Remaining issues are environment/provider config, not UI code.
- `fixed` Settings pages: layout uses min-h-full with no overflow-hidden wrapper; page-level vertical scrolling confirmed clean. The two overflow-hidden occurrences are on card decoration elements only.
- `fixed` `team-page` tests updated in a prior session; all 3 tests pass. `window.open` invite-link button correctly uses `role="button"` in both code and tests.

## Chatbot / Tracey Outstanding Work

- `open` Keep improving output quality first, not just latency.
- `open` Continue testing Tracey with real CRM operation prompts, not toy questions.
- `fixed` getTodaySummary and getAvailability now compute day boundaries using workspace timezone (via parseDateTimeLocalInTimezone). On UTC servers, AEST workspaces previously got wrong 'today' jobs.
- `fixed` Pre-classifier: added daily-digest/morning-briefing patterns to scheduling intent; stale/rotting/attention to reporting patterns; ON_MY_WAY field-routing hint now names getTodaySummary as fallback contact source.
- `fixed` System prompt messagingRuleBlock: model now instructed to extract message body from user instruction ('tell John I'm on my way' → SMS body is 'I'm on my way').
- `fixed` roleGuardBlock rewritten: decouples showConfirmationCard from recordManualRevenue; multiJobBlock clarified for single vs multi-job flows.
- `re-verify` Tracey still needs stronger performance on multi-step CRM actions and exact CRM lookups under real usage.
- `fixed` Tracey truthfulness: uncertaintyBlock now instructs model to check success field of all tool results and report failures honestly, never claiming Done when success:false.
- `fixed` Tracey stage language: all three context injection sites (recentJobs for client, likely deals, formatClientContextResult) now map internal stage keys through DIRECT_STAGE_LABELS before injecting into the prompt. Model no longer sees PIPELINE/INVOICED/SCHEDULED.
- `open` Continue using the saved live regression harnesses instead of ad hoc testing.

### Specific Tracey Use Cases Still To Prove Well

- `fixed` Inbound lead capture triage: triageIncomingLead now called on all platform leads (HiPages/Airtasker/ServiceSeeking). HOLD_REVIEW leads get a triage-flags activity note, auto-calling blocked, and WARNING notification with deal link.
- `fixed` Job approval and kanban progression: approveDraft, approveCompletion, rejectCompletion tools wired to existing deal-actions. Tracey can now "approve/reject the completion for X" with structured feedback and quickActions.
- `fixed` Field routing ON_MY_WAY: pre-classifier injects a FIELD ROUTING hint with fallback to getTodaySummary when no contact is named. messagingRuleBlock now instructs model to extract message body (‘tell John I’m on my way’ → body is ‘I’m on my way’).
- `fixed` Quoting workflows: ‘create a quote’ now routes to invoice intent via INVOICE_PATTERNS. Context hint: ‘QUOTE = DRAFT INVOICE, use createDraftInvoice’. All invoice actions return structured quickActions guiding the user through the full quote → issue → paid → complete sequence.
- `fixed` Stale deals, approvals, and rejection flows: approveCompletion, rejectCompletion tools added. getAttentionRequired returns structured quickActions. Pre-classifier stale/rotting/attention pattern added to reporting intent.
- `fixed` Daily digest and task triage: scheduling intent now calls getTodaySummary + getAttentionRequired, leads with preparation alerts then overdue tasks then stale deals. Pattern expanded to match ‘what’s on my plate’, ‘morning briefing’, ‘daily digest’.
- `fixed` AI-assisted tasks like ‘create a quote for John Smith for $500’: routed to invoice intent, QUOTE=DRAFT INVOICE hint, updateInvoiceAmount as follow-up quickAction. Confirmation shown via structured green card with quickActions.

## Voice / LiveKit / SMS / Email / WhatsApp Outstanding Work

- `deferred` Real provider/device verification for the 3 Tracey call-handling modes.
- `deferred` Real device verification that the mode-specific next steps actually work on phones/carriers.
- `deferred` Real Twilio SMS inbound/outbound verification.
- `deferred` Real email inbound/outbound verification with actual provider delivery.
- `deferred` Real LiveKit/Twilio voice path verification in production-like conditions.
- `deferred` Real WhatsApp assistant verification for internal users on the live number.

### Product Truth Already Established

- `fixed` Internal users can talk to the CRM chatbot through the WhatsApp assistant if their phone matches a workspace user.
- `fixed` The WhatsApp assistant is internal-user focused, not an end-customer WhatsApp channel.
- `fixed` Multilingual phone conversations are a real capability.
- `re-verify` The multilingual onboarding toggle is preference capture, not a strict runtime gate; keep that product truth straight.

## Provider / Delivery / Observability Work

- `fixed` Delivery observability: sendViaTwilio now logs every SMS send (success + failure) to webhookEvent with provider “twilio”. getWebhookDiagnostics covers stripe, resend, twilio, resend_inbound. Admin ops dashboard shows Twilio SMS counts and last-seen timestamps.
- `open` Keep advancing the feature verification matrix toward live-proof, not just code-proof.
- `fixed` Notification feed: rows now navigate to their linked page on click (markAsRead called). WARNING/ERROR show amber AlertTriangle icon; SUCCESS shows green CheckCircle2; AI/SYSTEM show Sparkles; rest show Bell.
- `fixed` Stage language sweep complete: all tool output paths (runListDeals, runListIncompleteOrBlockedJobs, runBulkMoveDeals, runSearchJobHistory, runSearchJobHistory, runGetClientContext, runGetFinancialReport breakdown) and the global search subtitle now use user-facing stage labels. Internal stage keys no longer reach the LLM or UI text.
- `fixed` Observability now covers: reminder/confirmation/review-request SMS and email sends (send-notification.ts logs to webhookEvent); WhatsApp inbound and outbound AI replies (whatsapp/route.ts logs to webhookEvent); portal opens tracked via activity. All provider delivery is now visible in the ops diagnostics dashboard.
- `fixed` runGetAttentionRequired now includes stage label in each line so Tracey can surface the current stage alongside attention signals.

## Local-Only / Not Yet Shipped Context

- `local-only` There was a local shell/UI change for the Ask Tracey advanced-panel open/closed sync issue and a redesigned split-diamond toggle pill, but it was intentionally not included in the pushed handoff commit because those files were unrelated dirty local files.
- `local-only` If the next agent is on the same machine/worktree, they may find local changes in:
  - [Shell.tsx](/C:/Users/micha/Projects/Assistantbot/components/layout/Shell.tsx)
  - [store.ts](/C:/Users/micha/Projects/Assistantbot/lib/store.ts)
  - [playwright.config.ts](/C:/Users/micha/Projects/Assistantbot/playwright.config.ts)
  - [shell-store.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/shell-store.test.ts)
- `local-only` Those files were intentionally excluded from the handoff push and should not be auto-reverted or auto-committed without deliberate review.

## How The Next Agent Should Work

- `fixed` Read [docs/agent_handoff_2026-04-05.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_handoff_2026-04-05.md) first.
- `fixed` Then read [docs/agent_change_log.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_change_log.md).
- `fixed` Then use [LIVE_CRM_WORKFLOW_AUDIT.md](/C:/Users/micha/Projects/Assistantbot/LIVE_CRM_WORKFLOW_AUDIT.md) and this file as the working backlog.
- `fixed` Reproduce suspected live issues before changing code.
- `fixed` Prefer targeted tests and existing live harnesses over inventing parallel workflows.
- `fixed` Update logs/docs after each substantial pass so the next handoff stays accurate.
- `fixed` If continuing from the later upstream CRM batch, first fix or stabilize the stale/flaky targeted tests before assuming the implementation is fully verified.
