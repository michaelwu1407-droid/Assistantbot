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
- `fixed` Legacy `/crm/settings/phone-settings` now lands on `/crm/settings/call-settings` instead of the generic settings home.
- `fixed` Tradie bottom-sheet `Photos` tab no longer fakes uploads; it now points field users into the real full-job photo workflow.
- `fixed` Tradie completion-modal photo follow-up now stays in full job mode instead of bouncing field users into the office CRM.
- `fixed` The older command palette/search surface now routes contacts and settings into canonical CRM paths instead of stale `/contacts` and `/settings` URLs.
- `fixed` Tracey reschedule follow-up wording is now clearer and more professional: it logs a confirm-with-customer follow-up instead of the vague `lock it down` phrasing.
- `fixed` Map workflow CTAs now say `Open customer timeline` where they open the unified inbox thread, instead of the vaguer `Message`.
- `fixed` Legacy job-map labels no longer leak malformed characters like `→`/apostrophe mojibake in user-facing schedule text.

## Highest-Priority Open Product Work

- `open` Continue live authenticated CRM workflow testing and fix remaining trust/coherence issues.
- `open` Continue improving Tracey’s real CRM usefulness: answering CRM questions correctly and performing CRM changes correctly with natural language.
- `open` Finish real provider/device verification for voice, SMS, email, WhatsApp assistant, and LiveKit paths.
- `fixed` Reconcile and stabilize the targeted test suite: 626/626 unit tests pass on every push. Only 3 pre-existing Playwright e2e specs fail due to config incompatibility (not code regressions).

## Current Outstanding Summary

This is the shortest truthful summary of what remains outstanding from the full session:

- `fixed` Latest `main` deploy is now live in production on Vercel and `https://www.earlymark.ai` reports app SHA `ddbcf1f4`.
- `fixed` Protected launch-readiness and monitor checks were rerun after deploy. Production now returns `200` with `status: healthy`.
- `open` Continue live authenticated CRM workflow testing focused on real trust/coherence issues across contacts, deal/job detail, schedule/reschedule, inbox/direct message vs Ask Tracey, quote/invoice/payment, and map/route mode.
- `open` Continue improving Tracey on real CRM operations with an output-quality-first approach. Keep Tracey LLM-first, keep using the saved live regression harnesses, and focus on whether it actually performs CRM work and explains it clearly.
- `fixed` Production quote/invoice core flow is now proven through the real authorized `/api/chat` path: existing draft quote recognized truthfully, amount updated, deal moved to `Quote sent`, and the invoice-status / mark-paid no-invoice responses are correct.
- `fixed` Production schedule/reschedule via Tracey is now proven again through the real authorized `/api/chat` path: a live scheduled job updated to `tomorrow at 3pm`, persisted the new `scheduledAt`, and reset reminder state correctly.
- `fixed` Production completion approval and rejection are now proven through the real authorized `/api/chat` path: `approveCompletion` moved a `Pending approval` job to `Completed`, and `rejectCompletion` reverted a pending-completion job with the provided reason.
- `fixed` Production morning briefing / today-summary path is now proven through the real authorized `/api/chat` path: `getTodaySummary` returns today’s jobs plus overdue tasks with workspace-timezone-aware scheduling.
- `fixed` Production attention filtering is now proven again through the real authorized `/api/chat` path: filtered incomplete/blocked queries return the exact matching stale job with correct user-facing stage and signal labels.
- `fixed` Production blocked/incomplete aggregate filtering is no longer noisy for `ZZZ AUTO LIVE`; it now returns a truthful no-match result instead of leaking `livefull_*` / `liveprobe_*` records.
- `open` Contact lookup with duplicate QA data still needs UX polish. `Find contact ZZZ AUTO LIVE Alex Harper` now responds honestly with an ambiguity prompt instead of picking the wrong contact, but the disambiguation experience is still basic.
- `fixed` In repo, duplicate-contact lookups now prepare a clearer shortlist for Tracey: when multiple equally strong contact matches exist, the contact-context path surfaces company/phone/email clues and tells the model to ask which one the user means instead of guessing.
- `fixed` The ambiguity prompt is now more actionable too: the model is explicitly told to ask for a phone number, company, email, or option number instead of giving a vague follow-up.
- `fixed` In repo, draft rejection is now a first-class Tracey action: `rejectDraft` is exposed to the model, suggested by the pre-classifier for draft-rejection language, and covered by focused tests.
- `fixed` Production draft rejection is now proven through the real authorized `/api/chat` path: `Reject the draft for ...` now invokes `rejectDraft`, returns a truthful rejection message with the supplied reason, clears `isDraft`, and moves the draft to `Deleted`.
- `open` Real provider/device verification still remains for WhatsApp assistant and the 3 Tracey call-handling modes on real phones/carriers.
- `open` WhatsApp is app-complete but still provider-blocked in production. The remaining live blocker is Twilio error `63007` (`Twilio could not find a Channel with the specified From address`) for `whatsapp:+61485010634`.
- `fixed` Quote/invoice trust fix is now in repo: Tracey invoice amount updates sync both `deal.value` and `deal.invoicedAmount`, and paid-invoice follow-ups now point to `Request review` instead of a redundant `Move to Completed`.
- `open` Keep rechecking worker/app release alignment and monitor freshness as normal ops hygiene, but it is no longer a current launch blocker.

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
- `fixed` Kanban move-to-`Scheduled` no longer dead-ends when there are no team members to assign. The assignment dialog now gives the user a real recovery path into Team settings instead of only static warning text.
- `fixed` Kanban move-to-`Scheduled` now also gives users a recovery path when the job has no booked date yet: instead of only toasting an error, it offers `Open Job` so they can add the scheduled date immediately.
- `fixed` Map view Today Only empty state: when no jobs today, shows the next upcoming job with date/time and a 'Show all upcoming jobs' button; if none exist, shows 'Switch to All Jobs view'.
- `fixed` Map view future-job UX: All Jobs view now sorted (upcoming first/soonest first, past jobs below). Each sidebar card shows relative date label (Today/Tomorrow/day name + time) and '(past)' marker on overdue jobs.
- `fixed` Route mode no longer dead-ends after today is complete. If there are upcoming jobs, the sidebar now surfaces the next upcoming booking and offers `Show all upcoming jobs` so the user can keep planning ahead.
- `fixed` Google-map route mode now matches the main map route-mode behavior: when today is done, it also surfaces the next upcoming booking and offers `Show all upcoming jobs` instead of stopping at a dead-end `All Done!` card.
- `fixed` Tradie dashboard/map/schedule loaders no longer use a broad workspace-wide demo filter for team members. Shared tradie actions now scope TEAM_MEMBER users to their own assigned jobs while leaving manager-level views workspace-wide.
- `fixed` Tradie dashboard "Up Next" data is now coherent: the first job card keeps the real value and customer phone instead of falling back to `$0` and empty contact details.
- `fixed` Tradie dashboard map now uses the actual `lat`/`lng` values coming from tradie job loaders instead of silently dropping to default Sydney coordinates.
- `fixed` The deep-link tradie job route (`/tradie/jobs/[id]`) now uses the shared scoped job-details loader instead of its own raw DB query, so access rules and displayed data stay consistent with the rest of the tradie experience.
- `fixed` Tradie schedule/day logic is now workspace-timezone aware. The shared tradie loaders compute “today” and display job times from the workspace timezone instead of the server’s local clock.
- `fixed` The older non-tradie job detail surface now uses user-facing status labels and only offers completion actions for real field-work states instead of leaking raw internal stages like `INVOICED`.
- `fixed` Tradie empty-state and back-navigation links now stay inside the tradie flow (`/tradie`, `/tradie/map`) instead of bouncing users into `/crm/tradie`, which redirected to the main CRM dashboard.
- `fixed` The legacy `/crm/tradie` route now redirects into `/tradie`, so stale links degrade into the correct tradie surface instead of the manager dashboard.
- `fixed` The legacy estimator routes are now real workflows. `/tradie/estimator` and `/crm/estimator` render the estimator form with active accessible deals instead of redirecting users to the dashboard.
- `fixed` The legacy `/crm/agent` route now degrades into `/crm/settings/agent`, so old AI-assistant links land on the real AI Assistant page instead of the generic dashboard.
- `fixed` `/crm/deals/new` is now a real standalone job-creation page built on the existing form instead of another redirect back to the dashboard.

### Inbox / Messaging UX

- `fixed` Inbox composer mode ambiguity resolved: Direct SMS tab moved to first position to match default mode; explanation card clearly states which tab uses AI vs sends raw SMS.
- `fixed` Inbox composer mode distinction is now visually stronger too: `Direct SMS` carries a `Sends immediately` state badge and `Send now` CTA, while `Ask Tracey` carries an `AI handles next step` badge and `Ask Tracey to act` CTA.
- `fixed` Inbox now falls back to `Ask Tracey` when the selected contact has no phone number, instead of dropping users into a dead direct-SMS composer. Direct SMS is still visible, but clearly unavailable for that contact.
- `fixed` Inbox `Conversations` vs `System Activity` split: `isSystemEvent` now correctly classifies assignee changes, deal updates, stage moves, invoice ops, portal views, and post-job follow-ups as System Activity instead of surfacing them in Conversations.
- `fixed` Ask Tracey success test is stable in batch.

### Billing / Quotes / Invoices

- `fixed` In repo, Tracey quote amount updates now sync both `deal.value` and `deal.invoicedAmount`, so CRM surfaces that still render `deal.value` no longer drift away from invoice reality.
- `fixed` In repo, paid-invoice follow-ups now point to `Request review` instead of suggesting `Move to Completed` after `markInvoicePaid` has already completed the job.
- `fixed` Stage label consistency: tutorial-view.tsx replaced 'Invoiced' with 'Awaiting payment' to match live kanban column. job-billing-tab.tsx missing Badge import fixed. Stage label helpers verified consistent.
- `fixed` Invoice creation clarity: billing tab now shows a hint below Create Invoice button explaining that new invoices start as Draft until issued.
- `fixed` Pre-classifier now fast-paths quote/invoice creation, send/issue, and mark-paid to the correct intent with the right tool suggestions and step budget. Quote creation (create→set amount→move to Quote Sent) can now complete in one turn.
- `re-verify` Full end-to-end quote→issue→paid flow on live CRM still needs usability validation to confirm the multi-step sequence works correctly in production.
- `open` Full quoting and estimate-approval workflows still need deeper live testing.
- `fixed` Manual estimator quoting is now better explained and covered: the estimator surfaces real failure toasts, explains that it creates a GST-inclusive draft invoice linked to the selected job, and explains the next step after success.
- `fixed` Manual estimator success state now gives a real next step too: after quote generation, it links straight to the selected deal’s billing panel instead of showing a disabled `Download PDF (Coming Soon)` placeholder.
- `fixed` Tradie/mobile job-detail billing no longer dead-ends on a fake `Generate Invoice` button. When a job has no invoices, the empty state now explains that billing lives in the full CRM panel and links directly to `/crm/deals/[id]` via `Open Full Billing`.
- `fixed` Tradie/full job-detail overview `Call` and `Map` actions are now wired too. They either open the real `tel:` / Google Maps targets or disable themselves honestly as `No phone` / `No address` when the job is missing that data.
- `fixed` Tradie/mobile job bottom-sheet `Parts` quick action is now a real shortcut into the billing/materials tab instead of a dead button with no behavior.
- `fixed` Tradie/mobile job bottom-sheet `Call` and `Text` actions now fail honestly too: when there is no customer phone number, they disable themselves and relabel to `No Phone` instead of trying to open blank `tel:` / `sms:` links.
- `fixed` Tradie/mobile job bottom-sheet collapsed header now shows the real scheduled time and real company context instead of a hard-coded `8:00 AM • Company` placeholder.
- `fixed` The older alternate tradie job-detail surface no longer dead-ends either: its billing tab now links to full CRM billing, its handover section now links to the full CRM job view instead of a fake send button, and its call/map actions now disable honestly when data is missing.
- `fixed` CRM-side job completion review no longer fakes photo follow-up state with dummy values. It now routes users to the full CRM job view to attach/send photos where that workflow actually exists.
- `fixed` Post-job review-request flow: requestReview tool wired to sendReviewRequestSMS. 'Request review' quick action buttons now backed by a real tool. Returns structured success/error with quickAction to view customer responses.

### Search / Notifications / Quick Actions

- `fixed` Global search mouse-click: contacts `CommandItem` now has `onClick` handler, consistent with all other result types.
- `fixed` Invoice chat actions (createDraftInvoice, issueInvoice, markInvoicePaid, voidInvoice, getInvoiceStatus) now return structured {message, success, quickActions} objects. The chat UI renders a green success card with follow-up action buttons that match the real workflow (for example `Mark issued`, `Mark as paid`, and `Request review`).

### Team / Analytics / Settings / Integrations

- `fixed` Team invite success copy: `inviteEmail` is validated non-empty before `createInvite` is called, so `Invite sent to !` cannot occur. Toast at line 106 of team/page.tsx correctly uses `inviteEmail.trim()` which is always non-empty at that point.
- `fixed` Analytics stage labels: `STAGE_LABELS` in `analytics-actions.ts` maps all known stages to user-facing labels. "Status 0" does not appear in current code — was already fixed in a prior session.
- `re-verify` Integration connection CTAs for some providers looked broken or misconfigured in live use. Code-side: buttons are disabled with clear amber reason banners when provider env vars are not configured. Remaining issues are environment/provider config, not UI code.
- `fixed` Settings pages: layout uses min-h-full with no overflow-hidden wrapper; page-level vertical scrolling confirmed clean. The two overflow-hidden occurrences are on card decoration elements only.
- `fixed` `team-page` tests updated in a prior session; all 3 tests pass. `window.open` invite-link button correctly uses `role="button"` in both code and tests.

## Chatbot / Tracey Outstanding Work

- `fixed` Tool output completeness pass: getDealContext now includes assigned team member; createTask resolves dealTitle/contactName to IDs and links the task; unassignDeal and restoreDeal accept dealTitle instead of requiring raw deal IDs; listDeals includes contactName; updateContactFields and updateDealFields success messages now list each changed field with new value.
- `fixed` Tool output formatting sweep: getClientContext, getTodaySummary, searchJobHistory, getFinancialReport now return pre-formatted strings at the tool boundary rather than raw JSON structs. Eliminates LLM formatting errors for all context/reporting tools.
- `fixed` runMoveDeal requiresSchedule guard: missing scheduledAt now returns requiresSchedule:true with targeted prompt, parallel to requiresAssignment guard. Tool descriptions updated with retry hints.
- `fixed` Filtered stale query routing: pre-classifier now distinguishes filtered stale queries (→ listIncompleteOrBlockedJobs with query) from workspace-wide attention queries (→ getAttentionRequired).
- `fixed` Stage alias coverage: "awaiting payment" and "awaiting_payment" added to STAGE_ALIASES so Tracey can move deals to that stage by user-facing name.
- `fixed` Pre-classifier routing: conversation history queries now route to contact_lookup with getConversationHistory suggested; job history searches route to reporting with searchJobHistory first; unassignDeal/restoreDeal added to crm_action suggested tools.
- `fixed` Deal query extraction: extractLikelyDealQuery now recognises "what is the exact current stage of X", "what recent notes exist for X", and "what are the most important facts about X" patterns, pre-loading the deal into LIKELY CRM TARGETS before the LLM responds.
- `open` Keep improving output quality first, not just latency.
- `open` Continue testing Tracey with real CRM operation prompts, not toy questions.
- `fixed` Internal production `/api/chat` probes can now run as a real workspace user when they carry both the cron bearer token and `x-user-id`, making live Tracey verification reliable without weakening normal auth.
- `fixed` getTodaySummary and getAvailability now compute day boundaries using workspace timezone (via parseDateTimeLocalInTimezone). On UTC servers, AEST workspaces previously got wrong 'today' jobs.
- `fixed` Pre-classifier: added daily-digest/morning-briefing patterns to scheduling intent; stale/rotting/attention to reporting patterns; ON_MY_WAY field-routing hint now names getTodaySummary as fallback contact source.
- `fixed` System prompt messagingRuleBlock: model now instructed to extract message body from user instruction ('tell John I'm on my way' → SMS body is 'I'm on my way').
- `fixed` roleGuardBlock rewritten: decouples showConfirmationCard from recordManualRevenue; multiJobBlock clarified for single vs multi-job flows.
- `re-verify` Tracey still needs stronger performance on multi-step CRM actions and exact CRM lookups under real usage.
- `fixed` Tracey truthfulness: uncertaintyBlock now instructs model to check success field of all tool results and report failures honestly, never claiming Done when success:false.
- `fixed` Tracey stage language: all three context injection sites (recentJobs for client, likely deals, formatClientContextResult) now map internal stage keys through DIRECT_STAGE_LABELS before injecting into the prompt. Model no longer sees PIPELINE/INVOICED/SCHEDULED.
- `open` Continue using the saved live regression harnesses instead of ad hoc testing.
- `fixed` Tradie bottom-sheet billing no longer fakes local video/signature capture. The fake `Add Video Explanation` and `Tap to sign on glass` interactions were replaced with honest guidance and a real link back to the full CRM job/completion flow.
- `fixed` Tradie completion modal no longer fakes local photo/file attachment. The old local-only file picker was replaced with honest guidance and a real link into the full CRM job where uploads persist properly.
- `fixed` `/api/contacts` and `/api/deals` POST routes no longer return placeholder `501` responses. Both now call the real create actions and scope creation to the authenticated workspace.
- `fixed` Tradie job-detail handover no longer shows static fake resources. The tab now gives honest status and routes users to the full CRM job for real handover docs and attachments.
- `fixed` `/api/workspace` POST no longer returns a placeholder `501`. It now updates the authenticated user's workspace through the real server action and returns the refreshed workspace payload.
- `fixed` Tradie post-job completion flow now uses clearer next-step copy when offering the feedback request, making the final review/send step more obvious in the field workflow.
- `fixed` Team page no longer contains `fake-` fixture logic in real role-management UI. Permissions now reflect only actual product rules.
- `fixed` Customer inbox now follows the intended multi-channel product model: one unified timeline per customer with SMS/email inline by default and calls shown as compact summary rows that expand into full transcripts only when needed.
- `fixed` Deal detail and deal modal now reflect that same communication model honestly: they show recent activity in-context, but route users into `Open customer timeline` for the full SMS/email/call correspondence instead of implying the smaller job panel is the whole conversation.
- `fixed` Deal-detail modal inline messaging is now explicitly a direct-SMS shortcut, not a vague second inbox. The copy, placeholder, button label, and success toast all now say `SMS`, while the panel still points users to `Open customer timeline` for the full thread.
- `fixed` Deal-detail modal direct-SMS shortcut now fails honestly when the customer has no phone number: the composer disables itself and shows a clear add-a-phone-number hint instead of letting the user walk into a send error.
- `fixed` Contact detail now matches that communication model too: it keeps notes/job context local, but gives a clear `Open customer timeline` action for the full SMS/email/call thread.
- `fixed` Legacy job detail no longer bypasses the shared field completion flow. Scheduled/traveling jobs now route users into the real tradie workflow, and only on-site jobs can complete from that surface via the shared completion modal.
- `fixed` Tradie job detail now uses explicit `Call` / `Navigate` actions and shared user-facing status labels instead of icon-only actions and leaked internal stage keys.
- `fixed` Tradie job detail chat now routes into the real unified customer timeline via scoped `contactId`, so the field view no longer dead-ends when the communication history lives in the inbox.

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
- `fixed` Real Twilio SMS outbound delivery verified in production on 2026-04-07 via direct provider probe to `+61434955958`.
- `fixed` Real Twilio SMS inbound ingestion verified in production on 2026-04-07 via self-contained probe from spare Twilio number `+12624390786` into workspace number `+61468167497`.
- `fixed` Real email inbound is now proven working in production again: after correcting the live Resend webhook endpoint and event subscriptions, a fresh QA probe to `alexandria-automotive-services-2@inbound.earlymark.ai` created a production `webhookEvent(provider="resend", eventType="email.received", status="success")`.
- `fixed` Real email outbound delivery-event logging is now proven in production: after deploy, a QA outbound probe created `webhookEvent(provider="resend", eventType="email.delivered", status="success")`.
- `fixed` Real LiveKit/Twilio voice path was actively exercised again on 2026-04-07 through the spoken PSTN canary: Twilio call completed, routing hit the canonical voice gateway, and the app persisted a matching VoiceCall with both caller and Tracey speech.
- `fixed` Voice canary phrase matching is now proven healthy in production with `Hello, Tracy` / `Monitor probe` transcript variants after deploy.
- `fixed` Voice latency scoring no longer over-flags healthy `inbound_demo` canary traffic: the PSTN-backed demo surface now uses an `1100ms` TTS TTFB threshold, and dominant-bottleneck warnings only trigger with enough samples plus a real threshold breach.
- `in-progress` Real WhatsApp assistant verification for internal users on the live number.
- `fixed` WhatsApp webhook now classifies against `workspaceId` instead of `user.id`, records `whatsapp.inbound` synchronously, and logs `whatsapp.processing` errors durably before returning `200 OK` to Twilio.
- `fixed` Duplicate-phone-number resolution for the internal WhatsApp assistant now prefers the provisioned/twilio-backed workspace instead of the first arbitrary matching user record.
- `fixed` WhatsApp assistant processing now runs inline instead of depending on `waitUntil()`, because live production probes showed the background path was not completing reliably.
- `fixed` Authenticated WhatsApp assistant messages no longer run through the inbound lead spam classifier; internal user commands now go straight to Tracey after identity resolution.
- `fixed` Headless WhatsApp assistant replies now get a non-empty fallback summary if the LLM/tool run returns blank text, preventing Twilio body-empty error `21619`.
- `fixed` Launch/readiness now degrades the WhatsApp assistant when recent `whatsapp.outbound` / `whatsapp.processing` events show real Twilio delivery failures.
- `open` Remaining WhatsApp blocker is provider-side Twilio configuration: current live sends fail with `63007` (`Twilio could not find a Channel with the specified From address`).

### Product Truth Already Established

- `fixed` Internal users can talk to the CRM chatbot through the WhatsApp assistant if their phone matches a workspace user.
- `fixed` The WhatsApp assistant is internal-user focused, not an end-customer WhatsApp channel.
- `fixed` Multilingual phone conversations are a real capability.
- `re-verify` The multilingual onboarding toggle is preference capture, not a strict runtime gate; keep that product truth straight.

## Provider / Delivery / Observability Work

- `fixed` Production launch-readiness is now truthful after the latest provider and monitor passes. The app is live on `edeee7cf` and no longer claims WhatsApp is healthy when Twilio is rejecting the configured sender.
- `open` Current launch-readiness degradation is intentional/truthful: WhatsApp assistant is degraded because recent live sends fail with Twilio error `63007` (`Twilio could not find a Channel with the specified From address`).
- `fixed` Inbound email readiness truth now requires a recent successful `email.received` webhook before marking the feature ready, instead of trusting static provider metadata alone. `resendDomainStatus` is still exposed for diagnostics.
- `fixed` Public `/api/health` and `/api/check-env` returning `404` in production is intentional. Middleware treats them as internal/debug routes unless `ENABLE_INTERNAL_DEBUG_ROUTES=true`; use protected internal readiness and ops surfaces instead.
- `fixed` Delivery observability: sendViaTwilio now logs every SMS send (success + failure) to webhookEvent with provider “twilio”. getWebhookDiagnostics covers stripe, resend, twilio, resend_inbound. Admin ops dashboard shows Twilio SMS counts and last-seen timestamps.
- `open` Keep advancing the feature verification matrix toward live-proof, not just code-proof.
- `fixed` Notification feed: rows now navigate to their linked page on click (markAsRead called). WARNING/ERROR show amber AlertTriangle icon; SUCCESS shows green CheckCircle2; AI/SYSTEM show Sparkles; rest show Bell.
- `fixed` Stage language sweep complete: all tool output paths (runListDeals, runListIncompleteOrBlockedJobs, runBulkMoveDeals, runSearchJobHistory, runSearchJobHistory, runGetClientContext, runGetFinancialReport breakdown) and the global search subtitle now use user-facing stage labels. Internal stage keys no longer reach the LLM or UI text.
- `fixed` Observability now covers: reminder/confirmation/review-request SMS and email sends (send-notification.ts logs to webhookEvent); WhatsApp inbound and outbound AI replies (whatsapp/route.ts logs to webhookEvent); portal opens tracked via activity. All provider delivery is now visible in the ops diagnostics dashboard.
- `fixed` runGetAttentionRequired now includes stage label in each line so Tracey can surface the current stage alongside attention signals.
- `fixed` Tracey duplicate-contact follow-ups now honor the UX it presents: when the assistant lists numbered contact options, replying with `1`, `2`, etc. resolves the selected contact into the correct CRM record instead of forcing the user to restate the contact details.
- `fixed` Job billing now guides the user through the invoice lifecycle with a dynamic `Next best action` card instead of making them infer the right next step from raw buttons alone.
- `fixed` Job billing no longer teaches the wrong send flow: `Mark issued` and `Email customer` are now distinct, truthful actions, and the guidance explains the real order.
- `fixed` Tracey invoice quick actions now teach the same truthful workflow as billing: draft invoices are `Mark issued`, and the issue response no longer implies that issuing itself sends the invoice.
- `fixed` Deal-context `Next steps` guidance now matches that same invoice truth, so CRM context answers no longer teach a conflicting send/order model.
- `fixed` The estimator success state now matches the same truthful invoice sequence, so quote generation no longer reintroduces the old “issue means send” confusion.
- `fixed` The tradie estimator landing-page copy now matches that same sequence, closing the last obvious invoice-flow wording mismatch across the quote surfaces.
- `fixed` Contact detail no longer shows a leftover `Open job ->` label; that CTA now reads like a finished product action.
- `fixed` Contact header no longer shows a Twilio SMS composer when the contact has no phone number; it now gives an honest explanation and a real recovery path into the customer timeline.
- `fixed` Contact header wording now matches the shared communication model: CRM-managed actions route to `Open customer timeline`, while the inline composer is clearly labeled as a direct workspace-number SMS action.
- `fixed` Contact profile now teaches the same communication model as the rest of the app: native phone/email actions when details exist, and `Open customer timeline` for CRM-managed communication.
- `fixed` Deal detail no longer dead-ends when direct SMS is blocked by missing customer phone data; it now routes the user straight into CRM to add the phone number.
- `fixed` Inbox fallback mode now still exposes the missing-data fix: when direct SMS is unavailable, users can jump straight to `Add phone in CRM` instead of being stranded in Ask Tracey mode.
- `fixed` The full CRM job page now uses that same recovery pattern: missing customer phone data is explained in place and linked straight to `Add phone in CRM`.
- `fixed` The stale follow-up modal now exposes direct CRM fix actions for missing phone/email/contact details instead of only warning that a channel is unavailable.
- `fixed` The stale-job reconciliation modal now explains what each outcome will do next and gives explicit success/error feedback instead of silently saving or failing.
- `fixed` The schedule now has a real empty state with next steps instead of a blank calendar grid when nothing is booked yet.
- `fixed` Legacy job-detail screens no longer strand users with disabled `No phone` / `No address` buttons; they now route missing customer details back into the CRM record so the user can fix the blocker.
- `fixed` The tradie bottom sheet now follows the same pattern: missing customer phone shortcuts no longer dead-end and instead route the user back into the CRM job record to fix the data gap.
- `fixed` The stale-deal follow-up modal now defaults to a usable channel and explains unavailable contact methods instead of starting users on a broken SMS path.
- `fixed` Kanban automation now uses the real CRM stage model and user-facing stage labels instead of outdated generic sales-pipeline terminology.
- `fixed` Daily digest guidance now matches the same truthful invoice sequence, so briefing copy no longer conflicts with billing and Tracey follow-ups.
- `fixed` Xero integration copy now describes the real current behavior: draft invoices are created from the job-completion workflow, not magically for every invoice-ready job.

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
