# UX Excellence Backlog

Tradie-grounded gaps in the app, prioritised by how much daily-use pain they remove.
Living document — update as items ship.

## Shipped (this session)

- ✅ Cooling-off period for workspace deletion (30 days, cancellable)
- ✅ Quote flow simplified — single "Send Quote" button + "Save as Draft"
- ✅ All `toast.error("Failed to ...")` rewritten to `"Couldn't ... — please try again."`
- ✅ Mobile tap targets — `Button size="sm"` raised to h-10 (40px) globally
- ✅ Field labels use `app-field-label` token across contact/deal detail pages
- ✅ Reminder settings — replaced raw hours number input (1–168) with plain-English
  preset buttons ("2 hours before / The day before / Two days before / A week before")
- ✅ Fixed silent bug where saving reminder settings overwrote working hours and
  agentMode (was hardcoding defaults instead of patching)
- ✅ Morning briefing notification now links to `/crm/schedule` (today's jobs in order)
  rather than `/crm/dashboard` (pipeline kanban)

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
1. **"Running late" one-tap button on Today's job card.**
   Customer gets `"Sorry mate, running ~20 min late. New ETA 10:50am."` Tradie
   picks delay from presets (10 / 20 / 30 / 60 min). No typing.
2. **Materials pre-flight prompt before leaving for a job.**
   "Plumbing call-out — usual kit: PVC fittings, sealant, wrench set. All loaded?"
   Suggestions derived from job type + previous similar jobs.
3. **Today's Run Sheet screen** (replaces the schedule view as the morning-briefing
   destination): jobs in time order, route map, expected revenue, pre-job notes,
   deposit status flag, weather strip. One scroll = full day at a glance.

### P1 — cashflow / chasing (weekly value)
4. **Automatic payment reminders.** Invoice unpaid at 3 / 7 / 14 days → Tracey
   drafts and sends a polite reminder text. Today the tradie has to manually
   ask the chatbot for each one.
5. **Cashflow widget on dashboard.** "$3,200 invoiced, unpaid · $1,400 expected
   this week." Today only monthly *won* revenue is shown — no forward view.
6. **Customer-facing "Accept Quote" link.** Quote PDF is sent as an attachment;
   the customer has no one-click accept. Add a hosted accept page (`/q/[token]`)
   that flips the deal to ACCEPTED and notifies the tradie.

### P2 — end-of-day clarity
7. **Wrap-Up Screen.** The evening notification fires but lands in `/crm/inbox`.
   Build a single-screen "Today: 3 jobs done, $1,200 collected, $800 outstanding,
   2 quotes need chasing tomorrow." Doubles as a satisfying end-of-day moment.
8. **Lead response SLA alert.** New lead unactioned > 15 min → escalate / show
   on dashboard as red. Tracey auto-call covers calls; web-form leads still slip.

### P3 — onboarding / first-day value
9. **Twilio number provisioning visibility.** New owner signs up — make it
   immediately obvious "This is your business number now" with a try-it-yourself
   prompt to call/text it from their own phone.
10. **Pricing-for-agent must default to non-zero.** If a tradie sets up Tracey
    without entering a base hourly rate, the AI quotes look wrong. Either block
    "go live" until pricing is set, or use industry-default fallbacks per trade.

### P4 — known product-principle violations still live in code
- `enableTripSms` toggles work but the surrounding copy still references
  "Twilio phone number" in some panels — strip every customer-facing mention.
- `reminder-settings.tsx` "Beta" badge — decide if it's still beta and remove
  or move to a Labs section.

## Decision needed from the customer / product

- Of P0/P1, what's the top 3 to ship next? My recommendation: 1 → 4 → 3.
  Running-late button is the fastest win; auto payment reminders are the
  highest-revenue-impact win; Today's Run Sheet is the highest-perception win.
- Run Sheet vs Wrap-Up — both eventually, Run Sheet first (mornings drive
  the day; evenings are recap).
- Accept-Quote hosted page — needs a public token route + minimal landing
  page; 1-day spike.
