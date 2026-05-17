# Lead routing branch — `claude/review-lead-routing-EzRTr`

End-to-end review and rebuild of how leads reach the CRM and the voice agent, plus the customer-facing UX that exposes it.

---

## ✅ Post-closeout fixes landed on this branch

These were tightened after the original closeout review to remove customer-facing trust gaps:

- **Dishonest one-minute callback delay removed.** The `Wait 1 min` preset is gone, legacy `60s` values are normalised to `Immediate`, and all four lead-entry handlers now treat the old `60` default as immediate dispatch rather than silently waiting for the 5-minute cron.
- **Lead Channels is more truthful.** Teammates no longer see copy that says *you connected the inbox* when the workspace owner did. Workspace-wide inbox counts now ignore expired OAuth tokens, default email platforms can surface a `needs_routing_check` state after 30 quiet days, and the website-form row no longer overpromises `Live` just because an inbox exists.
- **Inbox-connect flow now points to the next job.** After Gmail/Outlook OAuth, the integrations page scrolls the user down to **Where your leads come from** and shows a clear prompt explaining what is live now and what still needs one more step.
- **Onboarding now has a real auto-call toggle.** The inbox step still explains the feature, but it also gives the tradie a real on/off switch instead of an informational notice only.
- **Phone-number claim is now asynchronous.** Claiming a business number returns immediately, provisioning runs in the background, and the settings UI polls status instead of blocking the user on a long synchronous server action.
- **Webform telemetry is now operationally useful.** The webform route now records `WebhookEvent` rows, includes auto-call block reasons, rate-limits repeated submissions by source, and is surfaced as an advanced/manual integration option rather than hidden dead-ish infrastructure.
- **SMS blocked auto-calls are visible too.** The Twilio SMS path now records blocked auto-call reasons consistently so ops can query them across channels instead of only on email and missed-call flows.
- **Callback outcomes are now visible in the inbox thread.** Tradies now see `queued`, `called`, `no answer`, `busy`, and `failed to start` as simple system timeline events inside the prospect conversation instead of needing ops-level debugging.
- **Automatic recall loops are now guarded.** We allow one recent automatic callback attempt per prospect, then leave the next step to the tradie with a clear `Recall with Tracey` action in the inbox if the call did not connect.
- **Admin monitoring now sees callback lifecycle detail too.** The internal customer-usage page now shows callback counts and recent events by kind, outcome, source channel, block reason, and linked deal/contact.

---

## ✅ What's done on this branch

### Lead capture — all four channels now actually fire the voice agent

Before this branch, the headline product promise — "lead arrives → Tracey calls them back" — was wired only on paper: `autoCallLeads` was a UI toggle with no runtime effect, and `callTriggered = false` was hardcoded in the email handler.

| Channel | What now happens |
|---|---|
| **Webform** (`/api/webhooks/webform`) | Creates contact + deal, runs triage, then dispatches a voice-agent callback through `scheduleLeadCallback`. Honeypot field silently rejects bots. Relative `redirect_url` values are resolved against the request URL; cross-origin redirects are refused. |
| **Inbound email** (`/api/webhooks/inbound-email`) | Detects hipages, Airtasker, Oneflare, Service Seeking, Bark, **Google LSA** and **Meta Lead Ads** senders, parses the lead body, creates a deal, dispatches the callback. |
| **Inbound SMS** (`/api/twilio/webhook`) | Existing SMS lead capture path now also dispatches a callback when conditions allow. |
| **Missed call** (`/api/webhooks/twilio-voice-status` — new) | Twilio `<Dial action>` callback creates a deal for any `no-answer`/`busy`/`failed`/`canceled` inbound dial and queues a callback. Idempotent on `CallSid`. |

### Workspace-level policy gate (`lib/auto-call-eligibility.ts`)

Every handler now goes through one helper, `canAutoCallLead`, which returns a structured block reason. The four checks:

- `auto_call_disabled` — tradie turned the toggle off
- `voice_disabled` — workspace circuit breaker tripped
- `agent_mode_not_execution` — tradie is on `DRAFT` / `INFO_ONLY`, so Tracey may not act on their behalf
- `no_workspace_number` — workspace has no Twilio number to dial from

Per-lead blocks (`urgent`, `after_hours`, `triage_review`, `no_lead_phone`) are still applied on top. Every block reason is logged at info level and stored on the relevant `WebhookEvent` payload for ops debugging.

### Schedule the callback safely (`lib/lead-callback.ts`)

When the workspace's `autoCallDelaySec` is `0` (the default), the handler dispatches immediately through `initiateOutboundCall` — no cron involved. When the tradie has picked a wait time, a `Task` is created with title prefix `"Scheduled call:"`, picked up by the existing `/api/cron/scheduled-calls` cron (GitHub Actions workflow added: `.github/workflows/scheduled-calls.yml`, 5-minute schedule).

### Callback journey is now first-class in inbox + admin

A shared `tracey_callback` event stream now records callback lifecycle state instead of leaving it implicit in webhook logs and generic call rows:

- `callback_requested`
- `callback_dispatched`
- `callback_dispatch_failed`
- `callback_blocked`
- `callback_call_finished`

Those events now power:

- Inbox conversation timeline rows like `Tracey callback queued`, `Tracey called the prospect`, and `No answer to Tracey callback`
- A manual `Recall with Tracey` action in the inbox when a retry makes sense
- Internal admin callback monitoring with recent event history and roll-up counts per workspace

### Outbound contact guardrail: one automatic attempt, then human choice

To reduce the risk of Tracey over-calling prospects, repeat **automatic** callbacks to the same lead are blocked within a recent cooldown window. The default product flow is now:

1. A fresh lead arrives
2. Tracey makes one automatic callback attempt
3. If the callback does not connect, the tradie sees the outcome in the inbox and chooses whether to `Recall with Tracey` or handle the lead themselves

### Provisioning lock prevents double-buying numbers

`ensureWorkspaceProvisioned` now claims a workspace-scoped lock via the unique `ActionExecution.idempotencyKey` immediately before the Twilio purchase. Concurrent calls (e.g. Stripe webhook redelivery + onboarding wizard finish) can't both reach the buy stage. Stale locks (>5 min, still `IN_PROGRESS`) auto-reclaim so a crashed prior attempt doesn't permanently jam.

### Owner-only gating for workspace infrastructure

`isWorkspaceOwner` helper + filtering across every place number/billing UI surfaces:

- `claimBusinessPhoneNumber` action rejects non-owner callers with a logged warning
- Phone-claim button in `call-forwarding-card.tsx` hidden from teammates, replaced with a read-only "the owner can set this up" line
- `getLeadChannels` returns a `phone_not_provisioned` status for teammates (no actionable CTA, just a read-only "owner action needed")
- `getOnboardingProgress` only surfaces the phone-number step for the owner, and only when the workspace genuinely has no number AND it's not in a pending state

### Customer-facing UX

- **Dashboard `SetupWidget`** now actually renders on the dashboard (was built but never mounted). 30-day cutoff removed so existing tradies see new channels too. Auto-call step removed (it's on by default; surfacing it as a "to do" was noise).
- **Lead Channels panel** (`components/settings/lead-channels-panel.tsx`) — new. Shows all 11 capture sources grouped by category with honest per-channel statuses: `live` / `platform_setup_required` / `needs_inbox` / `needs_phone` / `phone_not_provisioned`. Expandable rows give exact-clicks walkthroughs for Google LSA, Meta Lead Ads, and the inbox-connect flow.
- **Pending vs failed provisioning state** in the dashboard checklist: pending (Stripe still confirming, or attempt in flight) stays silent — only genuine failures or legacy "never opted in" cases surface a recovery step.
- **Auto-call settings** moved from a numeric seconds input to plain-English presets (Immediate / Wait 5 min / Wait 15 min). Default: Immediate.
- **Onboarding wizard** now shows a visible notice during the inbox step explaining that auto-callback is on and where to change it.
- **Gmail / Outlook forwarding walkthrough** added to the lead-capture settings panel with exact filter conditions per platform.
- **Privacy framing** on the inbox-connect card sharpened to say we *act on* known lead senders rather than overstating that we *only read* them.

### Schema + migrations

- `Workspace.autoCallLeads` default → `true` (migration `20260516`)
- `Workspace.autoCallDelaySec` added, default `0` (migrations `20260516`, `20260517`)
- Existing rows: `autoCallLeads` backfilled to `true` (migration `20260517`)

### Phone format consistency

Webform and email handlers now normalise to E.164 via `lib/phone-utils.normalizePhone` before writing `Contact.phone`, so the same customer reached via different channels doesn't appear twice with different formats.

### Product principles locked in `CLAUDE.md`

So future sessions follow the same bar:
- **Never ask anything technical of the customer.** Infra limits get fixed at infra, not punted to the tradie.
- **Tracey number IS the business number** — no BYO, no decline.
- **Workspace vs teammate** — phone/billing/provisioning UI is owner-only.
- **`autoCallLeads` defaults on**, gated by `voiceEnabled` + `agentMode === "EXECUTION"` + having a Twilio number.

### Tests

Full suite green: **254 test files, 1150 tests**. Includes new coverage for:
- The four auto-call paths (webform, email, SMS, missed-call)
- The `canAutoCallLead` policy gate
- The `scheduleLeadCallback` helper (immediate vs scheduled dispatch)
- Callback lifecycle visibility in the inbox activity stream
- Manual recall from the inbox after `no answer`
- Outbound callback persistence + outcome recording from the voice-agent webhook
- Google LSA + Meta Lead Ads sender detection end-to-end
- Provisioning lock (bail on concurrent, return existing number on completed-prior)
- Webform honeypot

---

## ⚠️ What's outstanding

These were identified during the audit but not closed on this branch. Listed in roughly the order I'd tackle them.

### 1. Verify Gemini parses real Google LSA and Meta email bodies (correctness risk)

Sender detection works; what the AI extracts from those specific email formats is **untested**. If parsing fails silently, a lead is captured with no phone → no callback possible. **Needs**: ~5 real LSA emails and ~5 real Meta Lead Ads emails to verify and, if needed, add few-shot examples to the Gemini prompt.

### 2. Google LSA / Meta walkthroughs as screenshots or video (CLAUDE.md principle)

The text walkthroughs in the Lead Channels panel are functional but text-heavy. Per the "never ask anything technical" principle, screenshots or a short Loom showing each click would be a real upgrade. **Needs**: design assets.

### 3. Cron-scheduler delay floor (CLAUDE.md principle, partially mitigated)

GitHub Actions cron has a 5-minute schedule floor. We default to Immediate (which bypasses the cron entirely), so the principle is satisfied for the default. The dishonest `Wait 1 min` preset has now been removed, but any future "short wait" option still needs a real per-minute scheduler (Vercel Cron, Upstash QStash, Inngest) before it can be shown honestly.

### 4. Subscription-pending state for tradies still in the Stripe window

The onboarding wizard now shows pending/provisioning copy and the settings claim flow runs in the background, but any non-onboarding surfaces should keep using the same calm "we're setting up your number" language so pending states never look broken.

### 5. Detect "inbox connected but no platform leads arriving"

Default email platforms now surface an amber routing-check state after 30 quiet days with no real lead from that platform, but richer health detection (for example per-platform "last lead seen" timestamps across more ingestion paths and richer diagnostics in ops) would still be valuable.

### 6. Operational visibility for blocked auto-calls

Every block reason is logged at info level and stored on `WebhookEvent.payload.blockReason`. There's no ops dashboard surfacing aggregate "X% of leads were blocked because of Y" — useful for spotting widespread misconfiguration.

### 7. Phone-number recovery flow for the legitimate failure case

The `claimBusinessPhoneNumber` action exists and is owner-gated, but the recovery UX (when provisioning genuinely failed) is just a button on the call-forwarding settings card. A clearer "we're sorry, here's what happened, click to retry, or contact support" panel would be kinder.

---

## 🚢 Pre-deploy checklist

1. **Run the two new Prisma migrations** in order:
   - `prisma/migrations/20260516_auto_call_default_and_delay/migration.sql`
   - `prisma/migrations/20260517_autocall_immediate_default_and_backfill/migration.sql`
2. **Add the two GitHub Actions secrets** if not already set (the `scheduled-calls` workflow needs them):
   - `APP_URL` (or `NEXT_PUBLIC_APP_URL`)
   - `CRON_SECRET`
3. **Smoke-test end-to-end on staging**:
   - POST a webform with your phone in the `phone` field → confirm a Deal is created → confirm your phone rings (Immediate dispatch).
   - Forward a hipages-formatted email to a connected inbox → confirm deal + callback.
   - Send an SMS to your Twilio number → confirm deal + callback.
   - Let an inbound call ring out (no answer) → confirm a missed-call deal + callback.
4. **Confirm the `WebhookEvent` table is being written** with `blockReason` populated for any blocked dispatches.

---

_Generated as part of the branch closeout. See `git log --oneline c8e3255..HEAD` for the full commit list._
