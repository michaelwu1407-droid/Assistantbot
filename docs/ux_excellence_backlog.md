# UX Excellence Backlog

Tradie-grounded gaps in the app, prioritised by how much daily-use pain they remove.
Living document — update as items ship.

## Shipped (this session + continuation)

- ✅ Cooling-off period for workspace deletion (30 days, cancellable)
- ✅ Quote flow simplified — single "Send Quote" button + "Save as Draft"
- ✅ All `toast.error("Failed to ...")` rewritten to `"Couldn't ... — please try again."`
- ✅ Mobile tap targets — `Button size="sm"` raised to h-10 (40px) globally
- ✅ Field labels use `app-field-label` token across contact/deal detail pages
- ✅ Reminder settings — replaced raw hours number input (1–168) with plain-English
  preset buttons ("2 hours before / The day before / Two days before / A week before")
- ✅ Fixed silent bug where saving reminder settings overwrote working hours and
  agentMode (was hardcoding defaults instead of patching)
- ✅ Morning briefing notification now links to `/crm/run-sheet` (today's jobs in order)
  rather than `/crm/dashboard` (pipeline kanban)
- ✅ **Run sheet page** — `/crm/run-sheet` shows today's scheduled jobs in time order with
  directions button, expected revenue total, and empty state if no jobs
- ✅ **Morning chat message** enhanced to be an actual run-sheet summary: job times,
  client names, values, and expected daily revenue — posted as a Tracey chat message
- ✅ **Follow-up reminders wired** — `ensureFollowUpReminders` fires daily and posts a
  Tracey chat message listing stale quotes (past `softChase.triggerDays`) and unpaid
  invoices (past `invoiceFollowUp.triggerDays`) with "want me to chase any of these?"
- ✅ **Follow-up cadence UI** — `FollowUpCadenceCard` in Notifications settings lets the
  tradie choose when Tracey chases quotes (3/5/7/14 days) and invoices (1/2/3/4 weeks)
  using plain-English preset buttons — no raw number input
- ✅ **Chat quick-action defaults rewritten** — replaced vague placeholder prompts
  ("Help me schedule a job") with high-value defaults that work on first tap:
  "What's on today?", "Chase stale quotes", "Chase unpaid invoices", "What needs attention?"
- ✅ **Mobile inbox-thread suggested replies** — chips above the textarea show contextual
  prompts based on mode: Direct mode shows ready-to-send replies (On my way, Running late,
  Job's done); Tracey mode shows action prompts (Send a quote, Book them in, Send a payment
  reminder, Reply saying I'll call back). Mode labels also de-jargonised ("Direct" →
  "I'll reply", "Tell Tracey" → "Let Tracey reply"). Placeholder text now guides
  what to type instead of saying "Ask Tracey to do something…"
- ✅ **Inbox new-lead triage strip (desktop)** — when a contact is selected and has no
  outbound activity yet, a prominent amber strip appears above the message timeline with
  four next-move buttons: "I'll reply" (sets direct mode), "Let Tracey reply",
  "Send a quote" (pre-fills the Tracey draft), "Book them in" (pre-fills). Promotes
  the buried mode selector to the top of the panel so the user knows what to do
  with a fresh lead.

## Confirmed already present (not gaps — common misconception)

- Daily morning brief — in-app notification + assistant chat message
- Daily evening wrap — in-app notification + assistant chat message
- Auto-review request — fires on job completion modal post-Confirm
- Lead-to-revenue attribution — "Jobs Won With Tracey" KPI on dashboard
- Stale deal follow-up — modal + cron + automation triggers
- Tracey AI receptionist for missed calls
- "On my way" trip SMS when driver starts route

## Top-priority gaps — the real "best app ever" list

### P0 — daily-use friction (every job, every day)
1. ✅ **"Running late" one-tap button on Today's job card.**
   `actions/running-late-actions.ts` + `run-sheet-client.tsx`. Preset picker
   (10/20/30/60 min) texts the customer a new ETA automatically. No typing.
2. **Materials pre-flight prompt before leaving for a job.**
   "Plumbing call-out — usual kit: PVC fittings, sealant, wrench set. All loaded?"
   Suggestions derived from job type + previous similar jobs.
3. ✅ **Today's Run Sheet screen** — `/crm/run-sheet` shows jobs in time order,
   directions button, expected revenue, running-late button on each card.

### P1 — cashflow / chasing (weekly value)
4. **Automatic payment reminders.** Invoice unpaid at 3 / 7 / 14 days → Tracey
   drafts and sends a polite reminder text. Today the tradie has to manually
   ask the chatbot for each one.
5. ✅ **Cashflow widget on dashboard.** Green-stripe banner below KPI cards shows
   unpaid invoiced total + expected-this-week total. Hidden when both are zero.
6. ✅ **Customer-facing "Accept Quote" button** on existing job portal
   (`/portal/[token]`). Shown when deal is in quote stage → marks `quoteAcceptedAt`
   in metadata → fires in-app tradie notification "Time to book them in!"

### P2 — end-of-day clarity
7. ✅ **Wrap-Up Screen** at `/crm/wrap-up` — jobs done today (+ collected total),
   unpaid invoices, stale quote count. Evening notification now links here.
8. ✅ **Lead response SLA alert.** Deals still in `new_request` after 15 min
   show a red "Respond now" badge on kanban cards; counted in Attention Required KPI.

### P3 — onboarding / first-day value
9. ✅ **Business number "Test it" link.** When provisioned, call-forwarding card
   shows a `tel:` link "Test it — call your number now".
10. ✅ **Pricing setup step.** Setup checklist shows "Add pricing so Tracey quotes
    correctly" until ≥1 service item has priceMin/priceMax > 0.

### P4 — known product-principle violations still live in code
- ✅ Customer-facing "Twilio" references stripped — now says "business number".
- ✅ `reminder-settings.tsx` "Beta" badge removed.

## Still open
- P0 #2: Materials pre-flight prompt (needs job-type → typical-kit ML inference)
- P1 #4: Automatic payment reminders at 3/7/14 days post-invoice
