# Earlymark — App Testing & Troubleshooting Playbook

**Purpose:** a single guide to (1) understand every feature of Earlymark, (2) test the
workflows that cover ~80% of real daily use, and (3) probe the edge cases and the most
expansive surface — everything you can ask the chatbot (Tracey) to do.

**How to use:** work top-to-bottom. Each workflow has a *Do this* (steps) and *Pass if*
(expected result). Mark each ✅ / ⚠️ / ❌ as you go. Where a workflow says **VERIFY**, the
feature is suspected incomplete/stubbed — confirm whether it actually works.

---

## Part 0 — Source docs & how reliable they are

I cross-checked the feature docs against `CHANGELOG.md` (latest v2.5.4, Apr 2026). Trust the
recent, narrow docs over the big older ones.

| Doc | Use it for | Reliability |
| --- | --- | --- |
| `CHANGELOG.md` | Ground truth of what shipped, version by version | **High** — primary cross-check |
| `docs/missing_features.md` (2026-05-11) | Current known product gaps | **High** — most recent gap list |
| `docs/user_facing_truth_map.md` | What settings/analytics/feedback actually map to | **High** — recent, precise |
| `lib/ai/tools.ts` | The chatbot's real tool surface (read directly) | **High** — source code |
| `README.md` | High-level architecture & 4 Tracey surfaces | Medium — accurate but high-level |
| `APP_FEATURES.md` (86KB) | Deep per-screen feature detail | **Stale on routes** — uses `/dashboard/*`; live routes are `/crm/*`. Treat feature descriptions as mostly-right, paths as wrong. |
| `docs/use_case_walkthroughs.md` | Past manual test results | Historical — many ❌/⚠️ were later fixed; re-test, don't trust verdicts |
| `TUTORIAL_HANDBOOK.md`, `AGENTS.md` | Onboarding tour & dev conventions | Medium |

**Known route truth (verified):** all CRM lives under `/crm/*`:
`/crm/dashboard`, `/crm/deals`, `/crm/contacts`, `/crm/inbox`, `/crm/calendar`,
`/crm/schedule`, `/crm/map`, `/crm/analytics`, `/crm/team`, `/crm/tradie`, `/crm/agent`,
`/crm/estimator`, `/crm/hub`, `/crm/settings/*`. Marketing/public: `/`, `/pricing`,
`/features`, `/solutions`, `/contact`, `/auth`, `/setup`, `/billing`, `/portal/[token]`,
`/portal-preview`.

---

## Part 1 — Feature inventory (what the app can do)

Earlymark is an AI assistant + CRM for Australian tradies. There are **four distinct Tracey
surfaces** plus a full CRM. Know which Tracey you are testing — they have different rules.

### 1.1 The four Tracey surfaces

| Surface | Where | What it does | Governed by 3 modes? |
| --- | --- | --- | --- |
| **Interview/demo Tracey** | Homepage interview form | Marketing demo of the assistant | No |
| **Inbound sales Tracey** | Calls to Earlymark's own number | Sells/demos Earlymark to prospects | No |
| **Tracey for users** | Customer calls + texts to the tradie's number | Books jobs, quotes, qualifies leads, answers, takes messages | **Yes** — execute / review & approve / info only |
| **CRM chatbot** | Right-hand chat panel inside `/crm` | Operator runs the business by chat (jobs, invoices, contacts, comms) | Internal ops not gated; but customer-facing actions it triggers ARE gated |

**The 3 customer-contact modes** (`lib/agent-mode.ts`, set per workspace):
- **execute** (EXECUTION) — Tracey sends/acts immediately.
- **review & approve** (DRAFT) — Tracey drafts; owner/manager must approve before send.
- **info only** (INFO_ONLY) — Tracey never contacts customers; answers/internal only.

Auto-call also requires: `voiceEnabled` (workspace circuit breaker) + `agentMode=EXECUTION`
+ a provisioned Twilio number (`lib/auto-call-eligibility.ts`).

### 1.2 Account lifecycle

- **Auth** (`/auth`): Google OAuth, Australian phone OTP, or email/password. Forgot-password flow.
- **Billing** (`/billing`): Stripe checkout (Earlymark Pro monthly/yearly). Beta toggle
  "Provision mobile business number" gates Twilio provisioning.
- **Onboarding** (`/setup`, ~15 steps): contact card → autonomy mode → business identity →
  email/lead-capture → pricing & services → **The Bouncer (no-go exclusion rules)** →
  working hours/timezone → number provisioning intent → dashboard tour.
- **Twilio model:** one subaccount + one mobile number per workspace, auto-provisioned. It
  IS the business number — no BYO, no decline. Owner-only management.

### 1.3 CRM surfaces (non-chat UI)

- **Dashboard / Kanban** (`/crm/dashboard`): pipeline stages (New Request, Quote Sent,
  Scheduled, Invoiced/Ready-to-invoice, Won/Completed, + Deleted), drag-drop, deal cards with
  source badge, stale/attention badges, KPI cards, filter by team member, bulk select.
- **Deal detail**: metadata, contact history, notes, job photos, activity feed, billing tab,
  loss-reason & job-completion modals.
- **Contacts** (`/crm/contacts`): list, create, edit, properties tab, per-contact deals.
- **Inbox** (`/crm/inbox`): SMS/call/email threads per contact, call button.
- **Calendar / Schedule** (`/crm/calendar`, `/crm/schedule`): month/week/day, drag-reschedule,
  team lanes, "Open Job Mode".
- **Map** (`/crm/map`): scheduled jobs plotted, today summary, click → deal.
- **Tradie / Job Mode** (`/crm/tradie`): on-site view — Start Travel, Finish Job, completion
  modal with labour hours, MaterialPicker, running total, **customer signature pad**.
- **Estimator** (`/crm/estimator`): line-item quote builder with materials + GST.
- **Analytics** (`/crm/analytics`): revenue, customers, satisfaction, jobs-won-with-Tracey,
  lead-source breakdown, CSV/print.
- **Team** (`/crm/team`): list/invite/role/remove members.
- **Public job portal** (`/portal/[token]`): customer-facing read-only job status + feedback.
- **Feedback**: post-job SMS → public feedback page → rating; Google review CTA on high score.

### 1.4 Settings (sub-pages under `/crm/settings/`)

Verified pages: `account`, `my-business`, `call-settings`, `agent`, `automations`,
`integrations`, `notifications`, `sms-templates`, `workspace`, `knowledge`, `training`,
`billing`, `data-privacy`/`privacy`, `appearance`/`display`, `after-hours`, `ai-voice`,
`phone-settings`, `help`/`support`. (Some older ones may redirect/consolidate — confirm.)

Key configurable things: autonomy mode (execute/review/info), working hours & call/text
windows, business identity & ABN, trade types & service areas, pricing/services & call-out
fee, no-go/exclusion rules, AI learning rules/preferences, automation rules (new lead, stale
deal, overdue task → notify/email/SMS/call/move), notification prefs (email/in-app/WhatsApp,
per-type, default OFF), integrations (Gmail/Outlook OAuth, Xero, custom domain), billing.

### 1.5 Lead capture & comms pipeline

- **Inbound email** lead capture (Resend + Gmail/Outlook push + generic parser), AI triage
  (genuine vs tire-kicker), auto-reply per mode, creates contact + NEW deal.
- **Webform webhook** (`/api/webhooks/webform`): website form → contact + NEW lead, `source` badge.
- **Missed-call rescue**: missed call → lead + activity → auto-callback if eligible.
- **WhatsApp** (v2.5.4): per-type notifications + two-way action-code replies
  (`ACCEPT N-<code>` / `REJECT N-<code>`) — provider-gated, may be OFF.
- **Voice agent** (LiveKit; Groq primary + fallback; Cartesia TTS; Deepgram STT) for in/outbound calls.

### 1.6 Roles (RBAC)

- **OWNER**: everything, incl. phone/billing/integrations (owner-only).
- **MANAGER**: most CRM + team + approvals; not phone/billing.
- **TEAM_MEMBER**: own assigned jobs only; no contacts/inbox/analytics/team; default kanban "My jobs".
- **Approval flows**: draft job approve/reject; job-completion (PENDING_COMPLETION) approve/reject.

### 1.7 CRM chatbot — full tool catalog (the most expansive surface)

This is everything the CRM chatbot can *do* (from `lib/ai/tools.ts`, ~55 tools). The model
picks tools by detected intent; for "general" or low-confidence turns it gets all of them.
Each line is a thing you can ask Tracey in plain English.

**Jobs / deals (read):** `listDeals`, `getDealContext`, `getAttentionRequired` (overdue/stale/
rotting/rejected/parked), `listInvoiceReadyJobs`, `listIncompleteOrBlockedJobs`,
`searchJobHistory`, `listRecentCrmChanges`.

**Jobs / deals (write):** `createDeal` (placeholder), `createJobNatural` (full job),
`showJobDraftForConfirmation` (draft card w/ Confirm/Cancel), `updateDealFields`, `moveDeal`
(enforces: scheduled needs assignee + date), `proposeReschedule`, `assignTeamMember`,
`unassignDeal`, `restoreDeal` (from lost/deleted/archived), `revertDealStageMove`,
`addDealNote`, `addAgentFlag` (private triage flag).

**Bulk (explicit selection only):** `bulkMoveDeals`, `bulkAssignDeals`,
`bulkUpdateDealDisposition` (lost/deleted/archived), `bulkCreateDealReminder`.

**Approvals:** `approveDraft`, `rejectDraft`, `approveCompletion`, `rejectCompletion`, `requestReview`.

**Invoicing:** `createDraftInvoice`, `issueInvoice`, `updateInvoiceFields` (number/line items/
totals/date), `updateInvoiceAmount` (deal-level), `markInvoicePaid`, `voidInvoice`,
`reverseInvoiceStatus` (→DRAFT/ISSUED), `sendInvoiceReminder`, `getInvoiceStatus` (+sync).

**Pricing (guardrailed):** `pricingLookup` (MUST run before quoting any price; sources from
glossary/rules/history), `pricingCalculator` (deterministic math for all dollar arithmetic).

**Contacts:** `searchContacts`, `getClientContext` (full profile), `createContact`,
`updateContactFields`, `addContactNote`, `getConversationHistory`.

**Customer contact (mode-gated — Tracey for users rules apply):** `sendSms`, `sendEmail`,
`makeCall`. execute = send now; review & approve = draft only; info only = blocked.

**Scheduling / ops:** `getSchedule`, `getAvailability`, `getTodaySummary` (readiness alerts
first), `createTask`, `completeTask`, `deleteTask`, `createNotification`, `getFinancialReport`,
`recordManualRevenue` (after confirm), `logActivity`.

**Preferences / safety / support:** `updateAiPreferences` (permanent rule; refuses conflicts),
`undoLastAction`, `showConfirmationCard`, `contactSupport`, `appendTicketNote`.

**Behavioral contract to test** (`lib/ai/prompt-contract.ts`): tool-first (never guess price/
availability/status); replies in the customer's language (Australian English default);
honestly surfaces tool failures (no fake success); doesn't re-ask for info already given;
multi-job "next" flow; confirmation/draft cards for ambiguous or multi-step actions.

---

## Part 2 — The 80% workflows (a tradie's daily work)

These are the jobs-to-be-done a real tradie hires this app for: *catch every lead, book it,
turn up, get paid, look professional, don't drop anything.* Test these first — if they pass,
the core product works. Each is written from the tradie's point of view.

### A. "Don't let a lead slip" — capture

- **A1. Missed call → callback.** *I'm under a sink and miss a call.*
  - Do: place a call to the workspace number and don't answer (or simulate via the voice
    webhook). Check `/crm/dashboard` and `/crm/inbox`.
  - Pass if: a NEW lead + contact appears with source = missed call, an activity is logged,
    and (when execute mode + voice healthy + number provisioned) an auto-callback is queued.
- **A2. Website form → lead.** Submit the tradie's website contact form (or POST `/api/webhooks/webform`).
  - Pass if: contact + NEW deal created with a "website" source badge; owner notified.
- **A3. Platform email → lead.** Forward a Hipages/Airtasker-style enquiry email to the
  capture alias.
  - Pass if: AI triages genuine vs tire-kicker, creates contact + deal, and (execute mode)
    sends an auto-reply under ~60s. **VERIFY** the alias is actually receiving.
- **A4. Inbound text → Tracey replies.** Text the workspace number "Hi, do you do hot water
  systems? How much?"
  - Pass if: Tracey answers the question first, stays on-brand, only quotes from real pricing
    (or says the team will confirm), and captures the lead.

### B. "Book the job" — convert

- **B1. Quote by chat.** In CRM chat: "Quote a blocked drain for Sarah Lee at 12 Park St, $280."
  - Pass if: Tracey calls `pricingLookup` before pricing, creates the job/draft, shows a
    confirm/draft card if anything's ambiguous, and lands it in the right stage.
- **B2. Book with a time.** "Book Sarah's drain job for tomorrow 9am and assign it to me."
  - Pass if: job moves to Scheduled ONLY with both an assignee and a date; if either is
    missing Tracey says so and offers to fix it (don't accept a silent fake success).
- **B3. Send the quote.** "Send Sarah the quote by text." (execute mode)
  - Pass if: SMS sends; in review & approve it drafts and waits; in info only it's blocked.
- **B4. Reschedule.** "Move the Park St job to Thursday 2pm."
  - Pass if: schedule updates, a note + follow-up task are created.

### C. "Run my day" — operate

- **C1. Morning briefing.** "What's on today?" / open dashboard.
  - Pass if: `getTodaySummary` leads with readiness alerts (missing address/phone, unassigned,
    unconfirmed) before listing jobs.
- **C2. What needs attention.** "What needs chasing?"
  - Pass if: overdue/stale/rotting/rejected jobs surface with quick actions.
- **C3. Schedule & map.** Open `/crm/schedule` and `/crm/map`; drag a job to a new slot.
  - Pass if: reschedule persists; map plots today's jobs; clicking a job opens it.
- **C4. Add a task/reminder.** "Remind me to call the supplier at 4pm."
  - Pass if: task created with correct due time, linked to deal/contact if named.

### D. "Turn up and finish" — field work

- **D1. Open job mode.** `/crm/schedule` → Open Job Mode on a job; or `/crm/tradie`.
  - Pass if: Tradie view loads with map + job info, Start Travel and Finish Job available.
- **D2. Complete on site.** Finish Job → enter labour hours, add materials via picker, capture
  customer signature, see running total.
  - Pass if: total computes; "Save for Later" → Invoiced; "Confirm & Generate" → Won +
    Xero DRAFT. **VERIFY** signature persists after refresh and the customer actually signs.

### E. "Get paid" — invoice

- **E1. Create & issue invoice.** "Invoice the Park St job." → issue.
  - Pass if: draft made from deal value, editable line items/total, status moves DRAFT→ISSUED.
- **E2. Send to customer.** "Email the invoice to Sarah."
  - Pass if: invoice reaches the customer. **VERIFY** there is an actual send + (ideally) a
    pay link — flagged as a likely gap.
- **E3. Mark paid / chase.** "Mark Sarah's invoice paid." then "Remind anyone who hasn't paid."
  - Pass if: status → PAID; `sendInvoiceReminder` respects contact mode. **VERIFY** overdue
    auto-reminders exist (suspected missing).

### F. "Look professional & keep customers" — reputation

- **F1. Job portal.** Generate/open `/portal/[token]` for a job.
  - Pass if: customer sees read-only status + feedback link. **VERIFY** the link is actually
    sent to the customer (suspected manual-only).
- **F2. Review request.** After completion: "Ask Sarah for a review."
  - Pass if: feedback SMS sent; high score surfaces Google review CTA; low score alerts owner.

### G. "Manage my crew" — team

- **G1. Invite + role.** `/crm/team` → invite a Manager and a Team Member.
  - Pass if: invite link/email works; role is fixed at invite.
- **G2. Assign + isolation.** Assign a job to a team member; log in as that member.
  - Pass if: member sees only their jobs; cannot reach contacts/inbox/analytics/team.
- **G3. Approvals.** As member, request job completion; as owner, "Approve the completion."
  - Pass if: PENDING_COMPLETION → completed; reject reverts stage + notifies member.

### H. "Set my rules" — configuration

- **H1. Autonomy mode.** Switch execute ↔ review & approve ↔ info only in settings.
  - Pass if: customer-facing sends behave per mode immediately (test with B3).
- **H2. Add a no-go rule by chat.** "Never take gas work."
  - Pass if: `updateAiPreferences` saves it and repeats the exact enforced rule; later quote
    requests for gas are declined/flagged.
- **H3. Pricing source of truth.** Set a service price in settings, then ask Tracey to quote it.
  - Pass if: Tracey quotes from the saved price, not an invented number.

---

## Part 3 — Edge cases & the long tail

Part 2 covers the happy paths. Here is what those *don't* cover: failure handling, the full
chatbot prompt surface, and known/suspected gaps a real tradie will hit.

### 3.1 Edge-case workflows (failure & boundary behaviour)

- **E-1 Ambiguous target.** "Move the kitchen job to scheduled" when two jobs match.
  - Pass if: Tracey disambiguates instead of guessing.
- **E-2 Missing prerequisites.** Move a job to Scheduled with no assignee/date (see B2);
  create a job with no price; quote with no pricing data.
  - Pass if: honest blockers (`requiresAssignment`/`requiresSchedule`), no fake success.
- **E-3 Tool failure honesty.** Trigger a failing action (e.g. invoice a non-existent deal).
  - Pass if: Tracey says what failed and suggests a fix — never claims it worked.
- **E-4 Undo.** Do an action, then "undo that."
  - Pass if: `undoLastAction` reverses the most recent change.
- **E-5 Mode enforcement under pressure.** In info only: "Just text the customer anyway."
  - Pass if: Tracey still refuses to send and explains the mode.
- **E-6 No-go enforcement live.** With a "no after-hours emergencies" rule, simulate a 9pm
  emergency call/text. Pass if: declined/flagged with reason (Bouncer Phase A vs Advisor B).
- **E-7 Spam / burst guard.** Many rapid inbound calls from one number.
  - Pass if: lead guard blocks auto-callback (3+ in 30 min) without crashing.
- **E-8 Pricing conflict.** Glossary price vs historical average disagree.
  - Pass if: Tracey flags the conflict and asks the tradie to confirm before quoting.
- **E-9 Non-English customer.** Text Tracey in another language.
  - Pass if: replies in that language; keeps names/prices/addresses exact.
- **E-10 Duplicate/edit data.** Create the same contact twice; rename a contact then ask about them.
  - Pass if: lookups resolve sensibly; **VERIFY** there's no dedupe tool (suspected gap).
- **E-11 Reversals.** Mark invoice paid, then "actually that wasn't paid"; void after paid.
  - Pass if: `reverseInvoiceStatus` / paid-before-void rules behave (paid must reverse first).
- **E-12 Permission boundary.** As Team Member, ask chat to invoice/see analytics/invite.
  - Pass if: blocked or scoped per role.
- **E-13 Provisioning not ready.** New workspace, number not yet provisioned, ask to call a customer.
  - Pass if: clean message, not a crash; auto-call correctly gated.
- **E-14 WhatsApp reply codes.** Reply `ACCEPT N-<code>` / `REJECT N-<code>` to a notification.
  - Pass if: correct action runs and ownership is enforced (wrong code is ignored, no leak).
    Note WhatsApp may be provider-gated/OFF — **VERIFY** it's enabled before expecting sends.

### 3.2 Exhaustive chatbot prompt matrix (the biggest surface)

Run one prompt per tool to confirm coverage. Tick each. (Tools: §1.7.)

- **Read jobs:** "List all my jobs." · "What needs attention?" · "What's ready to invoice?" ·
  "Show jobs that are stuck/blocked." · "Find past jobs at 12 Park St." · "What changed recently?"
- **Create/update jobs:** "New job: leak repair for Tom, 5 King St, $300, Friday 10am." ·
  "Just jot down a kitchen reno for Acme, ~$8k." · "Change the King St job value to $350." ·
  "Show me a draft card for two jobs for Tom." · "Reschedule King St to Monday."
- **Stage/assignment:** "Move King St to Quote Sent." · "Assign King St to Dave." · "Unassign
  King St." · "Restore the deleted Acme job." · "Undo the last stage move on King St."
- **Bulk (select cards first):** "Move these to Scheduled." · "Assign these to Dave." ·
  "Mark these as lost." · "Add a reminder to all of these for Friday."
- **Approvals:** "Approve the draft job for Tom." · "Reject Acme's draft, too vague." ·
  "Approve the completion on King St." · "Reject King St completion, photos missing."
- **Invoicing:** "Create a draft invoice for King St." · "Set the total to $385 with GST." ·
  "Issue it." · "Email/SMS the invoice to Tom." · "Mark it paid." · "Void it." · "Reverse it to
  draft." · "What's the invoice + sync status?" · "Send a payment reminder."
- **Pricing:** "How much for a hot water system swap?" · "Total up: 3 hrs labour at $90 + $120 parts + GST."
- **Contacts:** "Look up Sarah." · "Full history for Sarah." · "Add contact Jane, 04xx, jane@x.com." ·
  "Update Sarah's phone." · "Add a note to Sarah." · "Show my texts with Sarah."
- **Customer contact (mode-gated):** "Text Sarah she's booked for 9am." · "Email Tom the quote." ·
  "Call Tom about the deposit."
- **Scheduling/ops:** "What's on today?" · "Am I free Thursday arvo?" · "What's this week look
  like?" · "Remind me to order parts at 4pm." · "Complete the 'order parts' task." · "Delete that task." ·
  "Revenue this month?" · "Record $2,000 revenue for last week." · "Log a call with Tom."
- **Prefs/safety/support:** "From now on, call-out fee is $0." · "Never do gas work." ·
  "Undo that." · "Something's broken with my number — log a support ticket." · "Add to that ticket: ..."

### 3.3 Known & suspected gaps to verify (real-tradie pain)

From `docs/missing_features.md` + code review. Confirm each is real before reporting as a bug.

- **Get paid:** invoice email may lack a pay-now link; no overdue auto-reminder; no
  partial/deposit state; **`getInvoiceStatus` sync may always report not-synced** — verify.
- **Xero:** draft pushed but never auto-issued; lifecycle sync shallow.
- **On-site:** signature persistence after crash/refresh; per-job labour-rate override;
  materials picker has no recent/autocomplete; receipt/extra-parts capture missing.
- **Customer portal:** link likely not auto-sent; no two-way customer messaging; no reschedule
  notification to the customer.
- **Config reachability:** no-go rules editable only in onboarding (not settings?); `autoCallLeads`
  and `voiceEnabled` toggles may not be user-visible; call-forwarding number not changeable in UI.
- **Lead SLA:** "respond in 60s" has no visible SLA timer / failure alert to the tradie.
- **Voice:** real handset/provider sign-off still pending (demo callback, inbound demo, customer normal path).
- **Oversight:** no activity audit log for who approved/sent what; no granular permission matrix.
- **Email parity:** SMS review-requests stronger than email; email OAuth refresh confidence unproven.
- **Recurring work / upsell:** no obvious recurring-job scheduling or at-quote upsell.
- **Property portal scrapers (REA/Domain):** reported as mock/stubbed — verify before relying.

### 3.4 Suggested test order

1. Lead capture (A) → 2. Book & quote (B) → 3. Daily ops (C) → 4. Field + complete (D) →
5. Invoice & get paid (E) → 6. Reputation/portal (F) → 7. Team & roles (G) → 8. Config (H) →
9. Edge cases (3.1) → 10. Chatbot matrix (3.2). Log each ✅/⚠️/❌ and attach evidence.
