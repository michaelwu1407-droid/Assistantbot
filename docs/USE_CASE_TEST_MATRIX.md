# Use Case Test Matrix

> Single authoritative grid of every user-facing surface in Earlymark
> and its current verification state. If a surface is not in this
> matrix, we do not promise it works. If a surface IS in this matrix,
> every PR is expected to keep its row green.

## How the doc set fits together

This matrix is the **data**. The conceptual framework lives in two
short companion files — don't restate them here, link to them.

| File | Role | Don't duplicate it; reference it |
|------|------|----------------------------------|
| `JOURNEY_ACCEPTANCE.md` | The 8-check journey gate (D · A · C · O · 🧠 · ↪ · 🛡 · 📋) | Definitions of each gate |
| `FEATURE_VERIFICATION.md` | The 4-layer proof model (Behavior · Delivery · Observability · Live-proof) | Status semantics (verified / watch / gap) |
| `CLAUDE.md` | Cross-cutting product + design policies (tradie load, Tracey-number identity, design tokens, typography, currency/date format, focus rings, empty-state, dialog sizing, mobile rules) | Every cross-cutting "do" / "don't" — those are already canonical there |
| `TESTING_STRATEGY.md` | The 7-layer technical testing strategy (unit → e2e) | Technical test patterns |
| `docs/missing_features.md` | Curated list of not-built-yet items | Build/no-build decisions |
| `APP_FEATURES.md` | Feature inventory — what exists today | Capability claims |
| `CRM_PAGE_AUDIT.md` | Per-page CRM audit history | Page-by-page narrative |

Any prose that previously lived in `docs/CRITICAL_USER_JOURNEYS.md` or
`docs/use_case_walkthroughs.md` has been folded into the per-row notes
below. Those files now point here instead of duplicating the data.

## Cell vocabulary

| Mark | Meaning |
|------|---------|
| ✅ | Verified — gate passes today, with proof |
| 🟡 | Watch — works but one signal is partial (no automated test, or one edge case unknown) |
| 🔴 | Gap — known failing or actively wrong behaviour |
| ⬜ | Not built — surface exists but this gate has never been wired up |
| ➖ | Not applicable to this surface |

## Row format

Each row scores the 8 `JOURNEY_ACCEPTANCE.md` gates plus a Status
rollup. Columns:

```
| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes / Proof |
```

Status rollup:
- **verified** — every cell ✅ or ➖
- **watch** — at least one 🟡, no 🔴, no ⬜
- **gap** — any 🔴 or ⬜ on a gate that matters

**Important:** cross-cutting `CLAUDE.md` policies (design tokens,
mobile-fit, owner-vs-teammate gating, en-AU formatting, currency
format, focus ring, empty-state pattern) are implicit acceptance gates
for every row. If a row otherwise meets the 8 gates but violates a
`CLAUDE.md` policy, it cannot be ✅ — drop it to 🟡 and link the
specific policy violated in *Notes*.

## How to use this matrix

| When | Do |
|------|-----|
| Before merging a PR | Find every row your diff touches. Keep it ✅ or explicitly flip to 🟡 / 🔴 with a note. Reviewers reject silent degradation. |
| At release time | Walk every 👁 (manual-only) cell in the release scope. Anything 🔴 is a blocker unless explicitly accepted by the release manager. |
| When a bug is found in prod | Add or update the row, drop the failing gate to 🔴, then fix-forward with the test that would have caught it. |
| Every quarter | Walk every ⬜ row. Decide: build it, or remove from matrix. Backlog rot is worse than honest gaps. |

## High-risk findings from the May 2026 audit

These rows are 🔴 today and are duplicated inline below — pulled to
the top so they don't get lost in the grid.

| ID | Surface | The lie | Fix path |
|----|---------|---------|----------|
| cpl-01 | Inbound SMS "STOP" | ✅ **FIXED 2026-05-24** — `Contact.smsOptedOut` added; STOP/UNSUBSCRIBE/CANCEL exits early before AI reply, sends confirmation SMS, blocks further AI replies to opted-out contacts. START re-subscribes. | `app/api/twilio/webhook/route.ts` + `prisma/schema.prisma` + migration. |
| cpl-02 | Subscription cancel | ✅ **FIXED 2026-05-24** — `customer.subscription.deleted` now calls `twilioMasterClient.incomingPhoneNumbers(sid).remove()` and nulls workspace Twilio columns. | `app/api/webhooks/stripe/route.ts`. |
| notif-01..03 | Email pref toggles | ✅ **FIXED 2026-05-24** — `shouldSendNotificationEmail()` helper added. `emailNewContacts` fires on `createContact`; `emailDealUpdates` fires on `updateDealStage`. `emailWeeklySummary` toggle disabled with "(coming soon)" label. | `actions/notification-actions.ts`, `lib/owner-notification-email.ts`, `contact-actions.ts`, `deal-actions.ts`. |
| bill-10 | Grace period on cancel | ✅ **FIXED 2026-05-24** — `app/crm/layout.tsx` now treats `"canceled"` + `stripeCurrentPeriodEnd > now` as still entitled. | `app/crm/layout.tsx`. |
| crm-10, crm-11, crm-17, comm-11, ai-05 | Kanban drag, stale→quoted drag-modal, Ctrl+K search, bulk SMS via chat, ambiguous AI fallback | comm-11/ai-05 ✅ **FIXED** — `listDeals` tool now accepts optional keyword filter enabling "find indoor work" queries. crm-10/11/17 pending. | `lib/ai/tools.ts` + `chat-actions.ts`. |

---

## A. Acquisition surfaces (`acq`)

Public-facing pages — pre-signup or unauthenticated. Every row must
pass on mobile (CC-4) and warm-cream palette (CLAUDE.md homepage rule).

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| acq-01 | `/` homepage load | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/homepage-journeys.spec.ts`; warm-cream tokens (`bg-paper`/`bg-cream`) enforced. |
| acq-02 | `/` hero "Interview Tracey" callback form | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | watch | Callback timeout copy missing E2E (CRITICAL_USER_JOURNEYS §1). |
| acq-03 | `/features` page | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | No E2E spec; manual only. |
| acq-04 | `/pricing` plan cards + checkout CTA | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/homepage-journeys.spec.ts`. |
| acq-05 | `/pricing` enquiry → callback (with phone) | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | UI explicitly states callback before submit; `callPlaced` reflected. |
| acq-06 | `/pricing` enquiry → message only (no phone) | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same spec covers both branches. |
| acq-07 | `/contact` callback flow | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same as acq-05. |
| acq-08 | `/contact` message-only flow | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same as acq-06. |
| acq-09 | `/contact` department selection | ✅ | ➖ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | watch | CRITICAL_USER_JOURNEYS §2 — feels decorative; routing per dept not verified. |
| acq-10 | `/solutions` index | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| acq-11 | `/solutions/[slug]` (per-trade landing) | 🟡 | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Discoverable only via direct links; slugs unverified at scale. |
| acq-12 | `/(legal)/privacy` reachable from footer | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Visual spec covers footer link. |
| acq-13 | `/(legal)/terms` reachable | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| acq-14 | `/(legal)/cookies` reachable | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | No automated link assertion. |
| acq-15 | `/offline` PWA fallback page | 🟡 | ➖ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ⛔ | watch | Reachable only when SW intercepts; copy unverified. |
| acq-16 | Custom 404 (`app/not-found.tsx`) | ✅ | ➖ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | watch | Friendly text + link home, no E2E. |
| acq-17 | Demo voice call (`/api/demo-call`) | 🟡 | ➖ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | gap | `missing_features.md` "real voice signoff" — still needs live handset proof. |
| acq-18 | Public preview embed `/portal-preview` | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/public-preview.spec.ts`. |

## B. Auth, session & account lifecycle (`auth`)

Multiple competing auth surfaces (`/auth/*` and `/(auth)/*`) — see the
B-meta row below. CC-4 (mobile) and CC-6 (reassuring loading copy)
critical here.

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| auth-meta | Two auth entry-point trees exist (`/auth/*` AND `/(auth)/login`, `/(auth)/signup`, `/(auth)/forgot-password`) | 🔴 | ✅ | ✅ | ✅ | 🔴 | ✅ | 🟡 | ⛔ | gap | **Coherence failure** — two competing UIs for the same task confuse the tradie. Decide on one, redirect the other. |
| auth-01 | `/auth` magic-link request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/auth-lib.test.ts` + `auth-next-page.test.tsx`. |
| auth-02 | Magic-link land on `/auth/next` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| auth-03 | `/auth/google-done` post-OAuth landing | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | watch | Copy generic; no E2E. |
| auth-04 | `/auth/auth-code-error` recovery | ✅ | ➖ | ✅ | ✅ | 🟡 | 🔴 | ✅ | ⛔ | gap | "Try again" CTA exists but doesn't auto-clear bad state; user is stuck if cookie persists. |
| auth-05 | `/(auth)/login` Clerk-style page | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | watch | Cross-references auth-meta. |
| auth-06 | `/(auth)/login/google` OAuth init | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| auth-07 | `/(auth)/signup` page | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | watch | Cross-references auth-meta. |
| auth-08 | `/(auth)/signup/google` OAuth signup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| auth-09 | `/(auth)/forgot-password` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | gap | No E2E; reset email content unverified. |
| auth-10 | `/invite/join` teammate accept | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/team-member.spec.ts`. |
| auth-11 | `/api/auth/send-sms` OTP request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Rate-limit verified; copy unverified. |
| auth-12 | `/api/auth/verify-sms` OTP verify | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Same. |
| auth-13 | Session refresh on protected page | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | Mid-action refresh unverified. |
| auth-14 | Expired session mid-action recovery | ➖ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ⛔ | watch | Friendly redirect to `/auth/signin?next=…` not asserted. |
| auth-15 | Sign out | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/middleware.test.ts`. |
| auth-16 | Two-tab different workspaces | ➖ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | gap | No coverage. |
| auth-17 | User removed from workspace mid-session | ➖ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | gap | No friendly screen on next request. |
| auth-18 | Role change live (owner promotes teammate) | ➖ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ⛔ | gap | Next page-load reflects, but no in-session reflection. |
| auth-19 | `/api/delete-user` account deletion | 🔴 | ✅ | 🟡 | 🟡 | 🔴 | 🔴 | 🟡 | ⛔ | gap | Endpoint exists; no in-app surface or warning. Compliance gap. |

## C. Onboarding & first-run (`onb`)

Pulled from `docs/CRITICAL_USER_JOURNEYS.md` §3 — that file's content
is folded into the rows below. Three critical sequencing details
(billing-then-setup-then-tutorial, Twilio provisioning outcome surface,
resume mid-flow) are scored individually.

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| onb-01 | Email sign-up creates workspace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/admin.spec.ts` setup uses this. |
| onb-02 | Google OAuth sign-up | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Unit only. |
| onb-03 | Redirect post-signup → `/billing` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/billing-activation-flow.test.ts`. |
| onb-04 | `/billing` plan select → Stripe checkout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/billing-actions.test.ts`. |
| onb-05 | `/billing/success` explicit success UI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | CRITICAL_USER_JOURNEYS §3 finding 3 resolved. |
| onb-06 | `/onboarding` start screen | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/onboarding.test.ts` covers action; no E2E browser drive. |
| onb-07 | `/setup` trade-type + pricing wizard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Step validation tested at action layer only. |
| onb-08 | Twilio number provisioned during onboarding | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/comms-provision.test.ts`. |
| onb-09 | Onboarding completion: number provisioned copy | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | CRITICAL_USER_JOURNEYS §3 finding 4 resolved. |
| onb-10 | Onboarding completion: no-number-requested copy | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| onb-11 | Onboarding completion: provisioning failure retry copy | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | CTA explicitly tells user to fix number setup. |
| onb-12 | `/api/internal/provisioning-retry` manual retry | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | Endpoint hit by retry CTA; no E2E. |
| onb-13 | Tutorial overlay (`?tutorial=1`) dismiss | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | watch | `tutorialComplete` flip not asserted in test. |
| onb-14 | `/api/workspace/complete-tutorial` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| onb-15 | Resume onboarding mid-flow after browser close | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ⛔ | gap | Lands on `/setup` or `/onboarding` correctly, but no specific "welcome back" copy. |
| onb-16 | Full post-payment browser journey (signup → CRM ready) | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ⬜ | gap | CRITICAL_USER_JOURNEYS §3 "Next automation targets" — still outstanding. |
| onb-17 | Teammate join via `/invite/join` skips onboarding | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/team-member.spec.ts`. |

## D. Billing & subscription lifecycle (`bill`)

See top-of-file high-risk findings for bill-04 (Twilio leak) and
bill-10 (no grace period).

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| bill-01 | `/crm/settings/billing` page | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| bill-02 | "Manage" → Stripe portal | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | watch | No in-app confirmation before bouncing off-app. |
| bill-03 | Webhook `checkout.session.completed` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/stripe-webhook.test.ts`. |
| bill-04 | Webhook `customer.subscription.deleted` releases Twilio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — Twilio number released on deletion. Stub spec remains; needs live proof. |
| bill-05 | Webhook `customer.subscription.updated` (plan change) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Only happy-path tested. |
| bill-06 | Webhook `invoice.payment_failed` (dunning) | ➖ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | watch | Status flips; banner unverified. |
| bill-07 | Webhook signature invalid → 401 | ➖ | ✅ | ✅ | ➖ | ✅ | ➖ | ✅ | ✅ | verified | `__tests__/stripe-webhook.test.ts`. |
| bill-08 | Webhook duplicate delivery idempotent | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Partial; idempotency key path tested but not all branches. |
| bill-09 | In-app "Cancel subscription" button | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manage button → Stripe portal (cross-app). Acceptable for now. |
| bill-10 | Cancellation grace period through `current_period_end` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — CRM layout honours grace period. |
| bill-11 | Post-cancel banner ("ends on DD MMM") | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — Amber banner with exact date + export link on billing settings page. |
| bill-12 | Pre-cancel data export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — GET /api/export/workspace-data; button in Settings → Privacy. |
| bill-13 | Plan upgrade (monthly→yearly) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Portal-driven; partial test. |
| bill-14 | Plan downgrade | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Same. |
| bill-15 | Referral discount applied to checkout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/referral-actions.test.ts` covers application. |
| bill-16 | Re-subscribe after cancellation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| bill-17 | TEAM_MEMBER blocked from `/crm/settings/billing` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/team-member.spec.ts`. |
| bill-18 | `/api/webhooks/twilio-usage` cost-ceiling | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/cost-ceiling.test.ts`. |

## E. CRM main shell (`crm-shell`)

The authenticated `/crm/*` pages. Sidebar (forest green, 45px,
icon-only) is the durable nav. Mobile bottom-nav has exactly one
Tracey button (CC-4).

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| crm-01 | `/crm` root (legacy redirect to dashboard) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Bare redirect; no E2E assertion. |
| crm-02 | `/crm/dashboard` chat-mode default | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/crm-core-journey.spec.ts`. |
| crm-03 | `/crm/dashboard` advanced-mode toggle | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| crm-04 | `/crm/dashboard` KPI cards render | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| crm-05 | `/crm/dashboard` morning-briefing surfacing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `ensureDailyNotifications` covered. |
| crm-06 | Sidebar nav renders + active state | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Visual specs. |
| crm-07 | Mobile bottom-nav single Tracey entry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Visual mobile spec; per `CLAUDE.md` CC-4. |
| crm-08 | `/crm/contacts` list | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/contact-journeys.spec.ts` — title, stage, balance, quick actions. |
| crm-09 | `/crm/contacts/new` create form | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Validation only at action layer. |
| crm-10 | `/crm/contacts/[id]` detail with tabs (overview/deals/properties/activity) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/contact-journeys.spec.ts`. |
| crm-11 | `/crm/contacts/[id]/edit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/contact-actions.test.ts`; no UI test. |
| crm-12 | `/contacts/[id]` (legacy outside `/crm`) | 🔴 | ✅ | 🟡 | 🟡 | 🔴 | 🟡 | 🟡 | ⛔ | gap | **Logic gap** — duplicate of `crm-10`. Pick one, redirect the other; otherwise two URLs render different shells. |
| crm-13 | Contact filter chip — "Service Due" | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| crm-14 | Contact filter chip — "Last Job" | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | Not built (UC9/15). |
| crm-15 | Contact merge prompt on dedup | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | watch | `__tests__/dedup-actions.test.ts`; no UI assertion. |
| crm-16 | Properties tab on contact (multi-property) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 | watch | Round 3 walkthrough confirmed Sally fixture; no E2E. |
| crm-17 | Asset tab on contact (asset DNA) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | Out of scope per `missing_features.md` "Archived". |
| crm-18 | `/crm/deals` kanban board | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/crm-core-journey.spec.ts`. |
| crm-19 | Kanban drag-and-drop stage change persists | ✅ | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | ⛔ | gap | UC2 confirmed broken; no fix yet. |
| crm-20 | Drag stale → quoted opens follow-up modal | ✅ | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | ⛔ | gap | UC7. |
| crm-21 | Stage transition fires automation exactly once | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/automation-actions.test.ts`. |
| crm-22 | Stale / rotting badges on deals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/deal-attention.test.ts`. |
| crm-23 | `/crm/deals/[id]` detail page | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/crm-core-journey.spec.ts`. |
| crm-24 | `/crm/deals/[id]/edit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | No UI test. |
| crm-25 | `/crm/deals/new` standalone create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/deal-actions.test.ts`. |
| crm-26 | `/crm/jobs/[id]` job detail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Round 5 manual confirmed; no E2E. |
| crm-27 | `/crm/inbox` thread list | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/crm-communication-modes.spec.ts`. |
| crm-28 | `/crm/inbox/[contactId]` deep link | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| crm-29 | `/inbox` (legacy outside `/crm`) | 🔴 | ✅ | 🟡 | 🟡 | 🔴 | 🟡 | 🟡 | ⛔ | gap | **Duplicate surface** — same problem as crm-12. |
| crm-30 | `/crm/calendar` Google calendar view | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | watch | UC5: missing visual confirmation status + popover. |
| crm-31 | `/crm/schedule` daily/weekly schedule | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Round 3 manual confirmed Open Job Mode. |
| crm-32 | `/crm/map` map view | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | watch | Marker clustering + popup content unverified. |
| crm-33 | `/crm/analytics` reports | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | 👁 | watch | Round 3 confirmed loads with mock data; real workspace charts unverified. |
| crm-34 | `/crm/estimator` quote estimator | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | watch | Manual only. |
| crm-35 | `/crm/hub` hub page | 🔴 | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | ⛔ | gap | UC2 → 404; route exists but not wired. Either build it or remove the link target. |
| crm-36 | `/crm/team` team management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/team-member.spec.ts`. |
| crm-37 | `/crm/agent` Tracey agent surface | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/agent-page.test.tsx`. |
| crm-38 | `/crm/tradie` tradie field view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Round 3 manual. |
| crm-39 | Ctrl+K global search (`/api/search/global`) | ✅ | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | ⛔ | gap | UC6 confirms 'No results'; index appears broken. |
| crm-40 | `/crm/design/*` design sandbox pages | 🟡 | 🟡 | ✅ | ✅ | ✅ | ➖ | ✅ | ➖ | watch | **Internal-only** pages. Should be gated to staff, currently accessible to any signed-in user. |

## F. Modals & dialogs (`modal`)

Per `CLAUDE.md` "Dialogs & modals" rule: every modal uses `ott-dialog`
base (viewport-relative width + `max-h-[90vh]`) and a per-modal
`max-w-[Xpx]`. Mobile-fit + a11y checks apply universally.

| ID | Modal | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|-------|---|---|---|---|---|---|---|---|--------|-------|
| modal-01 | `deal-detail-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/a11y-deal-edit-modal.test.tsx` covers detail too. |
| modal-02 | `deal-edit-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| modal-03 | `new-deal-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/a11y-new-deal-modal.test.tsx`. |
| modal-04 | `new-deal-modal-standalone.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Same component reused; no separate spec. |
| modal-05 | `job-completion-modal.tsx` (crm) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/a11y-job-completion-modal.test.tsx`. |
| modal-06 | `job-completion-modal.tsx` (tradie variant) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Tradie variant not separately covered. |
| modal-07 | `stale-job-reconciliation-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/a11y-stale-job-modal.test.tsx`. |
| modal-08 | `stale-deal-follow-up-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/a11y-stale-deal-follow-up-modal.test.tsx` + `e2e/crm-follow-up-journey.spec.ts`. |
| modal-09 | `loss-reason-modal.tsx` | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ⬜ | watch | No a11y / unit test; reasons list unverified. |
| modal-10 | `kanban-automation-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/a11y-kanban-automation-modal.test.tsx`. |
| modal-11 | `activity-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | No dedicated a11y spec. |
| modal-12 | `search-dialog.tsx` | ✅ | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | ⛔ | gap | Renders but returns no results (crm-39). |
| modal-13 | `personal-phone-dialog.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/a11y-personal-phone-dialog.test.tsx`. |
| modal-14 | `onboarding-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Covered indirectly; no dedicated spec. |
| modal-15 | `referral-success-modal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | watch | No spec. |
| modal-16 | `safety-modal.tsx` | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | watch | When does it fire? Trigger conditions undocumented. |

## G. Inbox & communications (`comm`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| comm-01 | Inbox loads threads | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/crm-communication-modes.spec.ts`. |
| comm-02 | Thread shows mixed SMS+voice in chronological order | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| comm-03 | Direct SMS send | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| comm-04 | Ask Tracey composer mode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/crm-communication-recovery.spec.ts`. |
| comm-05 | Mode-switch preserves draft | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| comm-06 | Email-only contact: Direct SMS disabled + CTA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| comm-07 | Phone-only contact: email unavailable + CTA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| comm-08 | Deal page with no phone: "Add phone in CRM" recovery | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| comm-09 | Template picker insert with variable merge | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/template-actions.test.ts` (lib only). |
| comm-10 | WhatsApp send via composer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/messaging-actions.test.ts`. Provider-blocked per `missing_features.md`. |
| comm-11 | Bulk "rainy day blast" from chat ("find me indoor work") | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | **FIXED 2026-05-24** — `listDeals` AI tool now accepts keyword filter. |
| comm-12 | Outbound SMS blocked to opted-out contact | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — Contact.smsOptedOut checked before AI reply in webhook handler. |
| comm-13 | SMS delivery status reflects via Twilio status webhook | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | watch | Partial; "failed" red badge unverified. |
| comm-14 | Quote/invoice email send via Resend | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Partial. |
| comm-15 | Bounce/complaint webhook (`/api/webhooks/resend`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Svix signature handling unit-tested only. |
| comm-16 | `/api/twilio/webhook` SMS receive idempotency | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/twilio-sms-webhook.test.ts`. |
| comm-17 | Booking-confirmation auto-SMS on Scheduled stage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | JOURNEY_ACCEPTANCE journey 3 — needs delivery monitor + dedicated last-success/failure. |
| comm-18 | Customer SMS "CONFIRM" flips pending deal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/twilio-sms-webhook.test.ts`. |
| comm-19 | Customer SMS "STOP" honoured | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — STOP exits early, confirmation SMS sent, smsOptedOut=true set. |
| comm-20 | Inbound WhatsApp (`/api/webhooks/whatsapp`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Workspace user → AI assistant in WhatsApp. JOURNEY_ACCEPTANCE journey 1 — needs delivery monitor + synthetic round-trip. |

## H. Voice agent (`voice`)

Inbound + outbound + reliability. Cron heartbeat coverage in
*Background work* section.

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| voice-01 | Inbound voice → Tracey via `/api/webhooks/twilio-voice-gateway` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/twilio-voice-*.test.ts` + voice-fleet probes. |
| voice-02 | Inbound voice → after-hours defer | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/call-window.test.ts`. |
| voice-03 | Inbound voice → fallback (agent unavailable) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/twilio-voice-fallback-route.test.ts`. |
| voice-04 | Auto-call new SMS lead within call window | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/auto-call-eligibility.test.ts` + `lead-callback.test.ts`. |
| voice-05 | Auto-call blocked outside hours | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| voice-06 | Auto-call blocked on triage HOLD_REVIEW | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/triage.test.ts`. |
| voice-07 | Auto-call blocked on inbound-lead-guard | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/inbound-lead-guard.test.ts`. |
| voice-08 | Tracey replies in caller's language (multilingual) | ➖ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ⬜ | gap | JOURNEY_ACCEPTANCE journey 5 — onboarding toggle behaves like preference capture, not strict runtime switch. No multilingual synthetic canary. |
| voice-09 | Demo voice call from homepage (`/api/demo-call`) | ✅ | ➖ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ⬜ | gap | `missing_features.md` — real handset signoff still outstanding. |
| voice-10 | Retell webhook integration (`/api/retell/webhook`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Unit only. |
| voice-11 | Outbound call queue (`/api/internal/voice-outbound-queue`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Internal; covered by scheduled-calls cron. |
| voice-12 | Voice cost-ceiling circuit breaker at $50 threshold | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/cost-ceiling.test.ts` + `twilio-usage-route.test.ts`. |
| voice-13 | Customer-agent drift reconcile cron | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/customer-agent-readiness.test.ts`. |
| voice-14 | Voice fleet synthetic probe | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/voice-synthetic-probe-route.test.ts`. |

## I. Lead capture across channels (`lead`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| lead-01 | SMS inbound → new contact + deal + AI reply | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/twilio-sms-webhook.test.ts`. |
| lead-02 | SMS inbound from existing contact appends activity | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| lead-03 | SMS classified as spam → activity logged, no reply | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/spam-classifier.test.ts`. |
| lead-04 | Voice inbound → contact + transcript | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | See voice-01. |
| lead-05 | Email inbound — hipages/airtasker/oneflare (`/api/webhooks/email`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/email-filters.test.ts`. |
| lead-06 | Email inbound — Gmail PubSub (`/api/webhooks/email-received`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Partial. |
| lead-07 | Email inbound — Resend-forwarded (`/api/webhooks/inbound-email`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Svix signature path verified; AI-parse end-to-end manual. |
| lead-08 | Embeddable webform (`/api/webhooks/webform`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Partial. |
| lead-09 | Lead capture email alias (`/crm/settings/integrations`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/lead-capture-email.test.ts`. |
| lead-10 | Manual contact + deal create from CRM | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/crm-core-journey.spec.ts`. |
| lead-11 | Lead triage HOLD_REVIEW path | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/triage.test.ts`. |
| lead-12 | Inbound-lead-guard duplicate phone | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/inbound-lead-guard.test.ts`. |
| lead-13 | Auto-call eligibility chain (mode, voice, number, window) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/auto-call-eligibility.test.ts`. |
| lead-14 | Lead source attribution carries through to deal source | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Per-channel manual spot-check. |

## J. Tradie field workflow (`job`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| job-01 | Open Job Mode from `/crm/schedule` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 | watch | Round 3 walkthrough. |
| job-02 | Start travel → ETA broadcast to customer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 | watch | Manual only. |
| job-03 | Mark on site → customer SMS | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ⛔ | watch | Not asserted; SMS path not tested. |
| job-04 | Complete job → invoice + photos prompt | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 | watch | Manual only. |
| job-05 | Add job photos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 | watch | Upload works; thumbnail rendering unverified. |
| job-06 | Digital handover deliverables | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | Out of scope (real-estate arm). |
| job-07 | Uber-style customer arrival page | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | Depends on job-02 broadcast. |
| job-08 | Post-job feedback request SMS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| job-09 | Customer review page (`/feedback/[token]`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/public-feedback-route.test.ts`. |

## K. Quotes, invoices, accounting (`quote`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| quote-01 | Create quote from deal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/tradie-actions.test.ts`. |
| quote-02 | GST 10% calculation | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| quote-03 | Invoice numbering sequential & unique | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/invoice-number.test.ts`. |
| quote-04 | Send quote via email | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Partial. |
| quote-05 | Quote accepted by customer | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | ✅ | ⬜ | watch | Acceptance route exists; E2E missing. |
| quote-06 | Stripe-hosted payment link on invoice | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | 🟡 | watch | Webhook marks paid; full E2E missing. |
| quote-07 | Xero/MYOB push (`/crm/settings/integrations`) | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | watch | Draft invoice creation works; later lifecycle steps incomplete (`missing_features.md`). |
| quote-08 | `/crm/estimator` standalone quoting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |

## L. Calendar & scheduling (`cal`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| cal-01 | Google Calendar OAuth connect (`/api/auth/google-calendar/callback`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | `missing_features.md` — refresh confidence outstanding. |
| cal-02 | New deal with `scheduledAt` → calendar event push | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Outbound only by design. |
| cal-03 | Calendar inbound readback | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | n/a | Intentionally parked (`missing_features.md`). |
| cal-04 | Visual confirmation status on event | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-25** — stage status icon (CheckCircle2/Clock/XCircle) on each calendar chip; green check = confirmed booking. |
| cal-05 | Event-click popover (quick call/SMS/edit) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-25** — chip click opens lightweight Popover with call (tel: link), SMS (opens DealDetailModal), and open-full-details link. |
| cal-06 | Business hours / call-window enforcement | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/call-window.test.ts`. |

## M. Notifications (`notif`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| notif-01 | Toggle "Email deal updates" enforced | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — `shouldSendNotificationEmail` gating in `updateDealStage`. |
| notif-02 | Toggle "Email new contacts" enforced | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — `shouldSendNotificationEmail` gating in `createContact`. |
| notif-03 | Toggle "Email weekly summary" enforced | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ⛔ | watch | Toggle disabled "(coming soon)"; cron not yet implemented. |
| notif-04 | Toggle "Task reminders" enforced | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `ensureDailyNotifications` reads pref. |
| notif-05 | Toggle "Stale deal alerts" enforced | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | watch | Saves; consumer unasserted. |
| notif-06 | Push subscribe via VAPID | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/push-subscribe-routes.test.ts`. |
| notif-07 | Push unsubscribe | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| notif-08 | Push send respects `webPushEnabled` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `notification-actions.ts:158`. |
| notif-09 | Expired endpoint (410) auto-removal | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `lib/push-notifications.ts:50-90`. |
| notif-10 | WhatsApp per-type toggle persistence | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/notification-prefs-actions.test.ts`. |
| notif-11 | WhatsApp dispatch respects type pref | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `lib/notifications/whatsapp-dispatch.ts`. |
| notif-12 | Test notification button | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Settings → Send test. |
| notif-13 | Morning briefing once-per-day | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `notification-actions.ts:278+`. |
| notif-14 | Evening wrap-up once-per-day | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| notif-15 | Both briefings disabled when `inAppTaskReminders=false` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |

## N. Settings pages (`set`) — 22 subroutes

`/crm/settings/*`. Owner-only surfaces gated per `CLAUDE.md` CC-2.

| ID | Subroute | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|----------|---|---|---|---|---|---|---|---|--------|-------|
| set-01 | `/crm/settings` index | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | watch | 22 subroutes — IA risk (CC-1). Group + label review pending. |
| set-02 | `/account` profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual only. |
| set-03 | `/after-hours` messaging rules | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Per UC11 — verify presence post-Round 3. |
| set-04 | `/agent` AI configuration | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/agent-settings-page.test.tsx`. |
| set-05 | `/ai-voice` voice synthesis + LLM | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/voice-fleet.test.ts`. |
| set-06 | `/appearance` theme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | watch | No spec. |
| set-07 | `/automations` workflow rules | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/automation-actions.test.ts`. |
| set-08 | `/billing` | see Section D | – | – | – | – | – | – | – | – | – | Covered in `bill-*`. |
| set-09 | `/call-settings` phone routing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/call-forwarding.test.ts`. |
| set-10 | `/data-privacy` controls | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ⛔ | watch | Page exists; export/delete actions not surfaced (see cpl-06/07). |
| set-11 | `/display` preferences | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | watch | No spec. |
| set-12 | `/help` & docs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | watch | No spec; static content. |
| set-13 | `/integrations` (Google, Outlook, Xero, MYOB, Resend) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | Several integrations partial. |
| set-14 | `/knowledge` AI grounding | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | `__tests__/knowledge-actions.test.ts`. |
| set-15 | `/my-business` profile + refusal rules | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/settings-actions.test.ts`. |
| set-16 | `/notifications` | see Section M | – | – | – | – | – | – | – | – | – | Covered in `notif-*`. |
| set-17 | `/phone-settings` (owner-only) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Owner gate per `e2e/team-member.spec.ts`. |
| set-18 | `/privacy` (legacy?) | 🔴 | ✅ | 🟡 | 🟡 | 🔴 | 🟡 | ✅ | ⛔ | gap | **Logic gap** — overlaps `/data-privacy`. Pick one. |
| set-19 | `/sms-templates` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/sms-templates.test.ts`. |
| set-20 | `/support` contact form | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Ticket → email path partial. |
| set-21 | `/training` agent training | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | watch | Copy clarity TBD. |
| set-22 | `/workspace` org settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Owner-only. |

## O. AI / Tracey chat (`ai`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| ai-01 | Sidebar chat send | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/chat-actions.test.ts`. |
| ai-02 | AI creates job from natural language | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 | watch | Round 5 walkthrough confirmed Frank fixture. |
| ai-03 | AI books appointment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | Partial. |
| ai-04 | AI lookup tool (`/api/chat`) | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/agent-tools.test.ts`. |
| ai-05 | AI handles ambiguous request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | **FIXED 2026-05-24** — `listDeals` tool accepts keyword filter. |
| ai-06 | AI tool-call error recovery | ➖ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | Partial. |
| ai-07 | AI feedback recognition (UC: "the chatbot recognizes feedback") | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | gap | JOURNEY_ACCEPTANCE journey 2 — no end-to-end synthetic. |

## P. Team & workspace (`team`)

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| team-01 | Owner invites teammate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/team-member.spec.ts`. |
| team-02 | Teammate accepts invite | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| team-03 | Teammate sees CRM, not billing or phone | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| team-04 | Owner removes teammate | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | watch | Removal acts; friendly screen for removed user unverified. |
| team-05 | Role change reflected live | ➖ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ⛔ | gap | Same as auth-18. |
| team-06 | User in multiple workspaces — switcher | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | gap | No coverage. |

## Q. Public-facing customer surfaces (`pub`)

These are URLs a customer (not the tradie) will hit.

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| pub-01 | `/portal/[token]` public job portal | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ⛔ | gap | JOURNEY_ACCEPTANCE journey 4 — no portal-open audit trail, no E2E for token→render→status. |
| pub-02 | `/portal-preview` | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `e2e/public-preview.spec.ts`. |
| pub-03 | `/feedback/[token]` customer review submit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/public-feedback-route.test.ts`. |
| pub-04 | `/kiosk/open-house` open-house lead capture | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ⬜ | watch | Tablet/kiosk discoverability + offline behaviour unverified. |
| pub-05 | Customer ETA page (Uber-style) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | Not built; UC14. |
| pub-06 | Outbound SMS contains a portal link where promised | ➖ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ⬜ | watch | JOURNEY_ACCEPTANCE journey 4 — link presence audit not implemented. |

## R. Cron jobs & background work (`cron`)

Per `CLAUDE.md` CC-1 these never surface to the tradie. All called by
GitHub Actions; each must emit a heartbeat the ops page can read.

| ID | Cron path | Cadence | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|-----------|---------|---|---|---|---|---|---|---|---|--------|-------|
| cron-01 | `/api/cron/booking-reminders` | hourly @0 | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/reminders-actions.test.ts`. |
| cron-02 | `/api/cron/followup-reminders` | hourly @0 | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same family. |
| cron-03 | `/api/cron/job-reminders` | hourly | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Partial. |
| cron-04 | `/api/cron/task-overdue` | hourly | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Partial. |
| cron-05 | `/api/cron/recurring-jobs` | daily | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | watch | Idempotency under failure-restart unverified. |
| cron-06 | `/api/cron/scheduled-calls` | every 5m | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/lead-callback.test.ts`. |
| cron-07 | `/api/cron/voice-agent-health` | 30m | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/voice-fleet-health-route.test.ts`. |
| cron-08 | `/api/cron/voice-monitor-watchdog` | 30m | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Watchdog over cron-07. |
| cron-09 | `/api/cron/voice-synthetic-probe` | 30m | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/voice-synthetic-probe-route.test.ts`. |
| cron-10 | `/api/cron/customer-agent-reconcile` | 30m | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/customer-agent-readiness.test.ts`. |
| cron-11 | `/api/cron/passive-communications-health` | 30m | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/passive-communications-health-route.test.ts`. |

## S. Admin / internal (`adm`)

Internal-only. Should be 404 in prod for non-staff (CC-1, CC-2).

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| adm-01 | `/admin/diagnostics` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/admin-internal-route-redirects.test.ts`. |
| adm-02 | `/admin/ops-status` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Page exists; ops dashboard quality not asserted. |
| adm-03 | `/admin/customer-usage` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | This IS the live ops verification table per FEATURE_VERIFICATION.md. |
| adm-04 | `/api/internal/voice-agent-status` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Internal. |
| adm-05 | `/api/internal/voice-fleet-health` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/voice-fleet-health-route.test.ts`. |
| adm-06 | `/api/internal/launch-readiness` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/launch-readiness.test.ts`. |
| adm-07 | `/api/health` external health | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/health-route.test.ts`. |
| adm-08 | `/api/check-env` env audit | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Internal. |
| adm-09 | `/api/log-crash` client crash log | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Sentry / log destination unverified. |
| adm-10 | `/api/internal/telemetry/client` + `/latency` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Manual review. |
| adm-11 | `/api/internal/customer-agent-drift` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Cron-10 consumer. |
| adm-12 | `/api/sync/replay` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Internal recovery tool. |
| adm-13 | `/api/stale-jobs/sync` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | `__tests__/stale-job-actions.test.ts`. |
| adm-14 | `/api/extension/import` | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Browser-extension import flow. |

## T. Compliance, opt-out, data rights (`cpl`)

Legal-exposure cluster. These are the audit's top fix items.

| ID | Surface | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|---------|---|---|---|---|---|---|---|---|--------|-------|
| cpl-01 | Customer SMS STOP / UNSUBSCRIBE / CANCEL honoured | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — full opt-out + confirmation + block. E2E stub remains for live proof. |
| cpl-02 | Subscription cancel releases Twilio number | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — releases on deletion event. E2E stub remains. |
| cpl-03 | Email "Deal updates" pref enforced E2E | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — shouldSendNotificationEmail gating. E2E stub remains. |
| cpl-04 | Email "New contacts" pref enforced E2E | ✅ | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | ⛔ | gap | Same. |
| cpl-05 | Email "Weekly summary" pref enforced E2E | ✅ | ✅ | 🔴 | 🔴 | 🔴 | 🔴 | 🟡 | ⛔ | gap | Same. |
| cpl-06 | Customer data export (one-click) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | Not built. Required pre-cancel. |
| cpl-07 | Workspace deletion (hard) with cooling-off | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | `/api/delete-user` exists but no UI workflow. |
| cpl-08 | Outbound customer email has unsubscribe footer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | **FIXED 2026-05-24** — HMAC token footer appended; /api/unsubscribe/email sets emailOptedOut. |
| cpl-09 | `/(legal)/privacy` accessible app-wide | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Footer link. |
| cpl-10 | `/(legal)/terms` accessible app-wide | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Same. |
| cpl-11 | `/(legal)/cookies` accessible app-wide | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Footer link assertion missing. |
| cpl-12 | Cookie banner / consent | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | gap | AU is moving on this; verify legal stance. |

## U. Resilience & failure modes (`res`)

Cross-cutting failure simulations. Each row asks: when X breaks, does
the tradie see a sensible message and can ops see the failure?

| ID | Failure mode | D | A | C | O | 🧠 | ↪ | 🛡 | 📋 | Status | Notes |
|----|--------------|---|---|---|---|---|---|---|---|--------|-------|
| res-01 | Stripe API down during checkout | ➖ | ➖ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | watch | No retry/banner spec; CTA likely just spins. |
| res-02 | Stripe webhook delayed/missed (worker outage) | ➖ | ➖ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | watch | No backfill job documented. |
| res-03 | Twilio voice API rate-limit (429) | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Cost-ceiling + retry/backoff. |
| res-04 | Twilio SMS API down | ➖ | ➖ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | watch | Outbound queued? Unverified. |
| res-05 | Gemini/LLM timeout | ➖ | ➖ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | watch | Tool-call error recovery partial (ai-06). |
| res-06 | LiveKit SIP setup fails on inbound call | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Voice fallback (voice-03). |
| res-07 | DB connection saturation | ➖ | ➖ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | watch | No degradation strategy verified. |
| res-08 | Inngest worker queue stuck | ➖ | ➖ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⛔ | watch | Cron heartbeats catch it; no auto-alert? |
| res-09 | Push send to expired endpoint | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Auto-remove on 410. |
| res-10 | Outbound email bounce | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | watch | Resend webhook handles; CRM badge unverified. |
| res-11 | Resume-after-crash on partial provision | ➖ | ➖ | 🟡 | ✅ | ✅ | 🟡 | 🟡 | 🟡 | watch | `provisioning-retry` route exists. |
| res-12 | Cost-ceiling triggers ($50) | ➖ | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | verified | Voice disabled, banner shown. |

## V. Logic & intuitiveness review (`logic`)

This section captures **coherence problems** — surfaces that
technically work but mislead the user. Per `JOURNEY_ACCEPTANCE.md` gate
🧠 (Coherence) these are the most insidious because passing the
*Behavior* layer of `FEATURE_VERIFICATION.md` is not enough.

| ID | Coherence concern | Status | Notes |
|----|--------------------|--------|-------|
| logic-01 | **Duplicate route trees** for the same task (`/auth/*` vs `/(auth)/*`, `/crm/contacts/[id]` vs `/contacts/[id]`, `/crm/inbox` vs `/inbox`) | gap | Tradie gets sent to one but bookmarks the other. Pick one canonical path per task and redirect the rest. See auth-meta, crm-12, crm-29. |
| logic-02 | **`/crm/settings/privacy` vs `/crm/settings/data-privacy`** | gap | Two overlapping settings pages — which is canonical? Consolidate. See set-10 / set-18. |
| logic-03 | **`/crm/hub` is a 404 but appears wired in nav** | gap | Either build the hub or remove the link target. See crm-35. |
| logic-04 | **`/crm/design/*` is publicly reachable by any signed-in user** | gap | Internal-only pages should be staff-gated (`adm-01` pattern). See crm-40. |
| logic-05 | **Email pref toggles save but do nothing** | watch | **FIXED 2026-05-24** — emailDealUpdates + emailNewContacts now enforced. Weekly summary toggle disabled. |
| logic-06 | **Customer STOP gets an AI reply** | watch | **FIXED 2026-05-24** — STOP exits early, no AI reply. See cpl-01. |
| logic-07 | **Stripe Manage button bounces tradie off-app without warning** | gap | The first thing a tradie sees after clicking "Manage" is a different brand. No confirmation, no save-the-customer step. See bill-02, bill-09. |
| logic-08 | **Immediate lockout on cancel even though they paid for the month** | watch | **FIXED 2026-05-24** — Grace period honoured in CRM layout. |
| logic-09 | **Twilio number kept billable on cancelled workspaces** | watch | **FIXED 2026-05-24** — Number released on customer.subscription.deleted. |
| logic-10 | **Kanban drag does nothing** | gap | Affordance suggests drag-to-move; reality is silent failure. See crm-19. |
| logic-11 | **Stale-deal drag → expected follow-up modal doesn't open** | gap | The drag is the implicit promise of automation. See crm-20. |
| logic-12 | **Ctrl+K returns "No results" for known data** | gap | Power-user shortcut feels broken; users lose trust in search globally. See crm-39. |
| logic-13 | **Department selection on `/contact` is decorative** | gap | If routing isn't different per department, the field is a confidence-eroding ask. See acq-09. |
| logic-14 | **Calendar event click navigates to deal page** | gap | User expected a popover; navigation kicks them out of their planning context. See cal-05. |
| logic-15 | **AI fails open-ended request without graceful "I can't do that yet"** | gap | UC2 "find me indoor work" — user can't tell if the AI is broken or just refusing. See ai-05. |
| logic-16 | **Multilingual onboarding toggle reads like preference but is a runtime switch** | gap | If a caller speaks another language, the toggle must be strict at runtime. See voice-08. |
| logic-17 | **Auth has two entry-point trees** | gap | See logic-01 / auth-meta. |
| logic-18 | **"22-row settings index" without grouping or search** | gap | At 22 subroutes the index page violates CC-1 (cognitive load). Group by domain: Account / Comms / AI / Billing / Workspace / Data & Privacy / Help. See set-01. |
| logic-19 | **Onboarding "resume after browser close" lands silently** | gap | No "Welcome back, here's where you were" copy. See onb-15. |
| logic-20 | **Loading states without reassurance copy** | gap | Per CLAUDE.md CC-6, "Calling Tracey now…" not blank spinner. Audit every `loading.tsx` + Suspense fallback. |

## W. Mobile-fit pass (`mob`)

Per `CLAUDE.md` CC-4 ("Tracey visual identity"), the app must run on
iPhone 13 viewport and 768px tablet. This pass tracks which areas
have been driven on mobile.

| ID | Area | iPhone 13 | Tablet | Notes |
|----|------|-----------|--------|-------|
| mob-01 | Homepage + hero callback | ✅ | ✅ | Visual specs cover both viewports. |
| mob-02 | `/pricing`, `/contact` | ✅ | ✅ | Same. |
| mob-03 | `/crm/dashboard` chat mode | ✅ | ✅ | Bottom-nav Tracey button — one entry point. |
| mob-04 | `/crm/inbox` composer | ✅ | 🟡 | Tablet split-view unverified. |
| mob-05 | `/crm/deals` kanban | 🟡 | 🟡 | Kanban broken on desktop (crm-19); mobile usability not separately tested. |
| mob-06 | `/crm/schedule` Open Job Mode bottom sheet | ✅ | 🟡 | Tradie field flow primary mobile path. |
| mob-07 | Modals (full deal-detail, new-deal) | 🟡 | 🟡 | Mobile-fit per `ott-dialog` rule; audit by modal pending. |
| mob-08 | Settings index + 22 subroutes | 🔴 | 🟡 | CC-4 risk — 22 subroutes without grouping is bad on mobile. See logic-18. |

## X. Action items (rollup of every 🔴 / ⬜)

In approximate fix-priority order. Each lands with the test that
would have caught it (rule below).

### Compliance & money (do first)

1. **cpl-01 / comm-19** — SMS STOP. Implement opt-out flag + short-circuit + confirmation SMS + outbound block. ~30 lines in webhook + `Contact.smsOptedOut` migration + send-side guard. Tests: `e2e/sms-stop-opt-out.spec.ts` (existing stubs).
2. **cpl-02 / bill-04** — Twilio release on subscription cancel. Schedule release job for `stripeCurrentPeriodEnd`. Tests: `e2e/subscription-cancellation.spec.ts`.
3. **cpl-03..05 / notif-01..03** — Wire `shouldSendEmail(workspaceId, prefKey)` into every email sender. Tests: `e2e/notification-pref-enforcement.spec.ts`.
4. **bill-10** — Grace period through `current_period_end`. ~5 lines in `app/crm/layout.tsx`.
5. **bill-09 / bill-11 / bill-12** — In-app cancel UI: confirmation dialog, post-cancel banner, data-export offer.
6. **cpl-06 / cpl-07** — Customer data export + workspace deletion UX.
7. **cpl-08** — Outbound customer-email unsubscribe footer.

### Coherence (do next — these are user-trust bombs)

8. **logic-01 / auth-meta / crm-12 / crm-29** — Collapse duplicate route trees.
9. **logic-02 / set-10 / set-18** — Pick one privacy settings page.
10. **logic-03 / crm-35** — `/crm/hub` build or remove.
11. **logic-04 / crm-40** — Staff-gate `/crm/design/*`.
12. **logic-18 / set-01** — Group the 22 settings subroutes.
13. **logic-10 / crm-19, crm-20** — Fix kanban drag + stale-deal drag follow-up.
14. **logic-12 / crm-39 / modal-12** — Fix Ctrl+K search.
15. **logic-15 / ai-05 / comm-11** — AI graceful fallback for ambiguous requests.

### Reliability / observability (do alongside)

16. **voice-08** — Multilingual runtime switch + synthetic canary.
17. **pub-01 / pub-06** — Portal-open audit trail + portal-link presence audit.
18. **comm-17** — Booking-confirmation last-success/failure ops row.
19. **comm-20** — WhatsApp round-trip synthetic.
20. **res-01, res-02, res-04, res-05, res-07, res-08** — Failure-mode coverage.

### Cleanup / UX polish

21. **set-** rows marked watch — add at least one assertion per subroute.
22. **modal-09, modal-11, modal-14, modal-15, modal-16** — A11y / unit specs.
23. **logic-20** — Audit every `loading.tsx` + Suspense fallback for CC-6 reassurance copy.

## Y. Execution rules (do not skip)

These are the rules every PR is held to. They are the reason the
matrix is worth maintaining.

1. **Every PR updates this matrix.** If your diff touches a row's
   area, either keep its state, improve it, or flip it to 🔴 with a
   note. Reviewers reject PRs that silently degrade rows.
2. **Every bug fix lands with the test that would have caught it.**
   The test goes in the matrix row's *Proof* column.
3. **Pre-release smoke pass.** The release manager walks every 👁
   (manual-only) cell in the release scope. Anything 🔴 is a blocker
   unless explicitly accepted in writing.
4. **Quarterly cull.** Walk every ⬜ row. Decide: build it or remove
   from the matrix. Backlog rot is worse than honest gaps.
5. **A row cannot be ✅ if it violates a `CLAUDE.md` cross-cutting
   policy** (design tokens, mobile-fit, owner-vs-teammate gating,
   en-AU date/time, formatCurrency, focus ring, empty-state pattern).
   Drop to 🟡 and link the violated policy in *Notes*.
6. **A row cannot be ✅ on `📋 Proof` if its only evidence is a unit
   test of a helper.** The proof must include either an E2E /
   integration test that drives the surface or an ops observability
   row (`/admin/customer-usage`).

## Z. Change log

- **2026-05-24** — Audit: cpl-01 (STOP), cpl-02 (Twilio leak),
  notif-01..03 (decorative email prefs), bill-10 (no grace period),
  logic-01..20 (coherence problems). Three Playwright stubs added.
  Matrix consolidated with `JOURNEY_ACCEPTANCE.md` 8-check framework.
  Folded prose from `docs/CRITICAL_USER_JOURNEYS.md` and
  `docs/use_case_walkthroughs.md` into per-row notes.
