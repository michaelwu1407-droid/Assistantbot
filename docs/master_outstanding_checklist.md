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
- `re-verify` Contact create success path leaves user on form instead of clearly redirecting.
- `re-verify` Contact edit success path leaves user on form instead of clearly redirecting.
- `re-verify` Contact detail page may still omit editable fields like company/address.
- `re-verify` Bulk contact delete appeared to be a no-op in live testing.
- `fixed` Search/filter footer count: no longer shows "Showing 8 of 8" when contacts are being filtered client-side. The header now shows `"N contacts"` without pagination, and `"Matches on this page: ..."` when filters are active with pagination.
- `fixed` contacts-client tests aligned and green.
- `fixed` Contact form redirect flow is stable.

### Deal / Job Detail

- `re-verify` Deal detail/history cards and sections need product-polish validation after the recent page-height fix.
- `re-verify` Job detail page may still lack enough communication history/context for an operational page.
- `re-verify` Some visible billing/value transitions may still be confusing after invoice creation.
- `re-verify` Notes saved on contacts/jobs may still not surface where users expect.

### Scheduling / Calendar / Map

- `re-verify` Cross-page schedule time mismatch between deal page, dashboard, and schedule.
- `re-verify` Calendar drag/reschedule should match deal page time exactly.
- `re-verify` Dashboard create-into-`Scheduled` flow may still be a dead end if assignee/date UX is incomplete.
- `re-verify` Map route mode for upcoming jobs still felt weak or confusing when there are no jobs today.
- `re-verify` Scheduled jobs appearing as future items on the map still need UX validation.

### Inbox / Messaging UX

- `re-verify` `Direct Message` vs `Ask Tracey` in the CRM inbox is still too ambiguous.
- `re-verify` The visible composer may still behave like Tracey when the user expects direct manual messaging.
- `fixed` Inbox `Conversations` vs `System Activity` split: `isSystemEvent` now correctly classifies assignee changes, deal updates, stage moves, invoice ops, portal views, and post-job follow-ups as System Activity instead of surfacing them in Conversations.
- `fixed` Ask Tracey success test is stable in batch.

### Billing / Quotes / Invoices

- `re-verify` Contacts page and other CRM surfaces may still use inconsistent billing/stage words such as `Invoiced` vs `Awaiting payment`.
- `re-verify` Invoice creation and resulting job value still may not be explained clearly enough to users.
- `re-verify` Quote/invoice quick actions and wizard flows still need true end-to-end usability validation.
- `open` Full quoting and estimate-approval workflows still need deeper live testing.
- `open` Post-job review-request flow still needs deeper live testing.

### Search / Notifications / Quick Actions

- `re-verify` Global search mouse-click bug on visible results.
- `re-verify` Notification panel is useful, but some assistant quick actions like `Create quote` did not show obvious visible outcomes.

### Team / Analytics / Settings / Integrations

- `re-verify` Team invite flow had broken success copy like `Invite sent to !`.
- `re-verify` Analytics still had unclear metric copy like `Status 0`.
- `re-verify` Integration connection CTAs for some providers looked broken or misconfigured in live use.
- `re-verify` Settings pages should be checked again after the scrolling fix to ensure no remaining clipped cards/buttons.
- `open` Update `team-page` tests to match the new `window.open` invite-link behavior, or restore link semantics if that is the preferred UX.

## Chatbot / Tracey Outstanding Work

- `open` Keep improving output quality first, not just latency.
- `open` Continue testing Tracey with real CRM operation prompts, not toy questions.
- `re-verify` Tracey still needs stronger performance on multi-step CRM actions and exact CRM lookups under real usage.
- `re-verify` Tracey should stay truthful about whether a CRM mutation actually succeeded.
- `re-verify` Tracey should continue using user-facing stage language consistently in replies.
- `open` Continue using the saved live regression harnesses instead of ad hoc testing.

### Specific Tracey Use Cases Still To Prove Well

- `open` Inbound lead capture and AI triage end to end.
- `open` Job approval and kanban progression from AI-generated draft/job-card flows.
- `open` Field routing and customer communication flows such as `ON_MY_WAY`.
- `open` Quoting, invoicing, and sign-off workflows from the user’s operational perspective.
- `open` Stale deals, approvals, and rejection flows.
- `open` Daily digest and task triage morning routine.
- `open` AI-assisted manual tasks like `create a quote for John Smith for $500` with confirmation/undo style UX.

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

- `open` Strengthen delivery observability so key flows are not just “coded” but provably delivered.
- `open` Keep advancing the feature verification matrix toward live-proof, not just code-proof.
- `open` Ensure feedback/support, confirmations, reminders, portal opens, WhatsApp responses, and similar flows all have clear ops visibility.

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
