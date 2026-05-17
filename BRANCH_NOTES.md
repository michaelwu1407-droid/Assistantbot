# Lead routing branch — `claude/review-lead-routing-EzRTr`

End-to-end review and rebuild of how leads reach the CRM and the voice agent, plus the customer-facing UX that exposes it.

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
- **Auto-call settings** moved from a numeric seconds input to plain-English presets (Immediate / Wait 1 min / Wait 5 min / Wait 15 min). Default: Immediate.
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

GitHub Actions cron has a 5-minute schedule floor. We default to Immediate (which bypasses the cron entirely), so the principle is satisfied for the default. But the "Wait 1 min" preset is dishonest — actual delay is 1–5 min depending on cron timing. **Options**: (a) drop the "Wait 1 min" preset, (b) move the cron to a per-minute scheduler (Vercel Cron, Upstash QStash, Inngest) — infra work, no code change.

### 4. Subscription-pending state for tradies still in the Stripe window

We hide the "your number isn't set up" recovery step during the pending window (per audit fix), but we don't show *anything* positive either. A first-session tradie sees no signal that provisioning is happening. **Suggestion**: a soft "Your business number is being set up — usually takes a few seconds" status row that disappears once the number lands.

### 5. Detect "inbox connected but no platform leads arriving"

The Lead Channels panel marks hipages/Airtasker/etc. as `live` the moment the inbox is connected. If the tradie's hipages registered email ≠ connected inbox, they'd see "Live" forever and never know nothing's coming through. **Suggestion**: track last-lead-seen-per-platform per workspace; if `inbox_connected_at` is >30 days ago AND no leads from platform X ever, surface an amber badge.

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
