# Use Case Test Matrix

> **Purpose.** Single authoritative list of every user-facing flow in
> Earlymark, mapped to its current verification state. If a flow is not in
> this matrix, we do not care whether it breaks. If a flow IS in this
> matrix, every PR is expected to keep its row green.
>
> **Audience.** Engineers shipping features, reviewers gating PRs,
> release manager running the smoke pass.
>
> **Pair documents.**
> - `docs/CRITICAL_USER_JOURNEYS.md` — product-level acceptance criteria
> - `TESTING_STRATEGY.md` — layered test approach (unit → action → e2e)
> - `docs/use_case_walkthroughs.md` — historic manual walkthrough log
> - `docs/missing_features.md` — features not yet implemented at all
>
> This matrix supersedes the ad-hoc lists in those files for the question
> *"is flow X working?"*.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Verified working — automated coverage + recent manual confirmation |
| 🟡 | Partial — UI works but the consumer/enforcement side is missing, or only one half tested |
| 🔴 | Broken — known regression or actively wrong behaviour |
| ⬜ | Not implemented — flow does not exist in code yet |
| 🧪 | Has E2E (Playwright) coverage |
| 🔬 | Has unit / action / route test only |
| 👁 | Manual verification only |
| ⛔ | No verification of any kind |

## How to use this file

1. **Before merging a PR.** Find every row your diff touches. If you
   broke a ✅ row, fix it. If you implement a ⬜ row, change its state
   and add the matching test in the verification column.
2. **At release time.** Walk the 👁 rows that touch your release scope.
   Anything 🔴 is a release blocker unless explicitly accepted.
3. **When you find a bug in production.** Add (or update) the matching
   row, drop the state to 🔴, then fix forward with the test that would
   have caught it.

## Owner conventions

Rows are tagged with the area owner so triage is unambiguous:

- `acq` — Acquisition / marketing site
- `onb` — Onboarding & first-run
- `auth` — Authentication, session, OTP, OAuth
- `bill` — Billing, Stripe, plan, dunning, cancellation
- `lead` — Lead capture across channels (SMS, voice, email, web form)
- `crm` — Contacts, deals, kanban, search, filters
- `job` — Tradie / field-work flow (travel, on-site, complete, photos)
- `comm` — Inbox, SMS send, WhatsApp, email send, templates
- `notif` — User-facing notifications (in-app, push, email, WhatsApp)
- `cal` — Calendar sync and scheduling
- `quote` — Quotes, invoices, GST, payments
- `team` — Workspace teammates, invites, roles
- `set` — Settings (business, voice, integrations, my number)
- `ai` — Tracey chat / agent surface
- `rep` — Reports, analytics, feedback, reputation
- `adm` — Admin / internal routes
- `cpl` — Compliance, privacy, export, opt-out

## Cross-cutting compliance flows (read first)

These are the high-risk flows that came out of the May 2026 audit. They
are duplicated inline in the matrix below but called out here so they
don't get lost.

| ID | Flow | State | Notes |
|----|------|-------|-------|
| cpl-01 | Customer replies STOP to a Tracey SMS | 🔴 ⛔ | AI still generates and sends a reply. No opt-out flag set on Contact. Twilio blocks future outbound at carrier level, but app has zero visibility. |
| cpl-02 | Tradie cancels Earlymark subscription | 🟡 🔬 | Stripe portal flow works and `subscriptionStatus` flips, BUT Twilio number is **not** released — we keep paying Twilio for an orphaned number. |
| notif-01 | Tradie toggles off "Email deal updates" | 🟡 🔬 | Preference saves to `workspace.settings.notificationPreferences` but no email-sending code reads it. The toggle is currently decorative. |
| notif-02 | Tradie toggles off "Email new contacts" | 🟡 🔬 | Same as notif-01. |
| notif-03 | Tradie toggles off "Email weekly summary" | 🟡 🔬 | Same as notif-01. |

Fix tickets for each of these live in `docs/missing_features.md` under
the "Compliance & opt-out" section (added in this same change).

---

## A. Acquisition (`acq`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| acq-01 | Homepage load | `/` | Hero + nav render, no console errors | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-02 | "Interview Tracey" callback form | `/` hero CTA | Form posts, success copy says callback is happening | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-03 | Callback timeout / failure recovery copy | `/` hero CTA, server returns 5xx | UI tells user details still captured, no resubmit needed | 🟡 | 🔬 `__tests__/contact-route.test.ts` (no E2E) |
| acq-04 | Pricing page renders plans | `/pricing` | Monthly + yearly cards visible, CTA → checkout | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-05 | Pricing enquiry → callback | `/pricing` contact form with phone | UI explicitly states callback will happen + success state shows `callPlaced` | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-06 | Contact page enquiry → callback | `/contact` with phone | Callback initiated, success branch says so | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-07 | Contact page enquiry → message only | `/contact` no phone | Message-only success branch | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-08 | Public preview embed | `/preview/[id]` | Renders shared resource without auth | ✅ | 🧪 `e2e/public-preview.spec.ts` |
| acq-09 | Privacy page accessible | `/privacy` | Renders | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-10 | Terms page accessible | `/terms` | Renders | ✅ | 🧪 `e2e/homepage-journeys.spec.ts` |
| acq-11 | 404 page on unknown route | `/does-not-exist` | Friendly 404, link home | 🟡 | 👁 |

## B. Onboarding (`onb`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| onb-01 | Sign up with email | `/auth/signin` → magic link | Workspace row created, user lands on `/billing` | ✅ | 🔬 `__tests__/auth-flow-pages.test.tsx` + 🧪 `e2e/admin.spec.ts` setup |
| onb-02 | Sign up via Google OAuth | `/auth/signin` | Same as onb-01, profile prefilled | 🟡 | 🔬 only |
| onb-03 | Billing → Stripe checkout success | `/billing` plan click | Stripe redirect, return to `/billing/success`, workspace activated | ✅ | 🔬 `__tests__/billing-activation-flow.test.ts` + `billing-success-page.test.tsx` |
| onb-04 | Post-payment success page | `/billing/success` | Explicit success UI before bounce to `/auth/next` | ✅ | 🔬 `__tests__/billing-success-state.test.tsx` |
| onb-05 | Twilio number provisioned during onboarding | Setup flow | Tradie sees own number on completion screen | ✅ | 🔬 `__tests__/comms-provision.test.ts` |
| onb-06 | Twilio provisioning failure → clear retry guidance | Setup flow, Twilio API 5xx | CTA explicitly says fix number setup, not generic waiting | ✅ | 🔬 `__tests__/tracey-onboarding-email-preview.test.tsx` (partial) |
| onb-07 | Number not requested (skipped) onboarding | Setup flow with skip | Completion screen says "no number requested", no Twilio call | ✅ | 🔬 covered in onb-04 fixture |
| onb-08 | Trade type + pricing wizard | `/setup` | Each step validates, can't skip mandatory | 🟡 | 🔬 `__tests__/onboarding.test.ts` (no E2E) |
| onb-09 | Resume onboarding after browser close | Sign back in mid-setup | Land on last incomplete step | 🟡 | 👁 |
| onb-10 | Tutorial completion → dashboard | `/crm/dashboard?tutorial=1` | Tutorial dismissable, `tutorialComplete` flips | 🟡 | 👁 |
| onb-11 | Authenticated post-payment full journey | Stripe checkout → CRM ready | One E2E spec drives entire chain in a browser | ⬜ | ⛔ (called out in `CRITICAL_USER_JOURNEYS.md` §3) |

## C. Authentication & session (`auth`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| auth-01 | Sign in via email magic link | `/auth/signin` | Link emailed, click → session | ✅ | 🔬 `__tests__/auth-lib.test.ts`, `auth-next-page.test.tsx` |
| auth-02 | Sign in via Google OAuth | `/auth/signin` | Redirects, returns with session | 🟡 | 🔬 only |
| auth-03 | Phone OTP signin (where enabled) | OTP form | 6-digit OTP accepts, session created | 🟡 | 🔬 only |
| auth-04 | Sign out | Profile menu | Session invalidated, redirect home | ✅ | 🔬 `__tests__/middleware.test.ts` |
| auth-05 | Session refresh on protected page | Any `/crm/*` | Stale token transparently refreshed | 🟡 | 🔬 partial |
| auth-06 | Expired session mid-action | Submit form with dead session | Friendly redirect to `/auth/signin?next=…` | 🟡 | 👁 |
| auth-07 | Role-gated route (TEAM_MEMBER on owner-only) | `/crm/settings/billing` as TEAM_MEMBER | 403 / redirect away | ✅ | 🧪 `e2e/team-member.spec.ts` |
| auth-08 | Two tabs, different workspaces | Switch workspace in tab A | Tab B sees correct context after next nav | 🟡 | ⛔ |
| auth-09 | User removed from workspace mid-session | Owner removes them | Next request 403, friendly screen | 🟡 | ⛔ |
| auth-10 | Internal admin route blocked in prod | `/admin/*` without role | 404 in production builds | ✅ | 🔬 `__tests__/admin-internal-route-redirects.test.ts` |

## D. Billing & subscription (`bill`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| bill-01 | Plan select → Stripe checkout | `/billing` plan card | Stripe redirect, returns to `/billing/success` | ✅ | 🔬 `__tests__/billing-actions.test.ts` |
| bill-02 | Webhook `checkout.session.completed` | Stripe POST | Workspace flips to `active`, `stripeSubscriptionId` saved | ✅ | 🔬 `__tests__/stripe-webhook.test.ts` |
| bill-03 | Webhook `customer.subscription.updated` | Stripe POST | `subscriptionStatus`, `stripePriceId`, `stripeCurrentPeriodEnd` updated | 🟡 | 🔬 partial (only happy path) |
| bill-04 | Webhook `customer.subscription.deleted` (cancellation) | Stripe POST | `subscriptionStatus = "canceled"` **AND Twilio number released** | 🔴 | ⛔ — Twilio cleanup not implemented; no test for the event |
| bill-05 | Cancel via Stripe Customer Portal | `/crm/settings/billing` → Manage | Portal session created, user redirected | ✅ | 🔬 `__tests__/billing-actions.test.ts` |
| bill-06 | In-app "Cancel subscription" button | (not implemented) | One-click cancel from inside Earlymark with confirmation dialog | ⬜ | ⛔ |
| bill-07 | "Are you sure?" confirmation before portal | Manage click | Confirmation dialog before leaving app | ⬜ | ⛔ |
| bill-08 | Post-cancel UI banner | Return from portal after cancelling | Banner: "Subscription ends on DD MMM YYYY" | ⬜ | ⛔ |
| bill-09 | Post-cancel data export offer | Cancel flow | One-click CSV/JSON export of contacts + deals before lockout | ⬜ | ⛔ |
| bill-10 | Grace period on cancellation | After cancel, before `current_period_end` | App still usable until period end (not immediate lockout) | 🟡 | 🔬 status check only checks `!== "active"` — needs revisit |
| bill-11 | Payment failure (`invoice.payment_failed`) | Stripe POST | Status flips, dunning email sent, banner shown | 🟡 | 🔬 webhook handler exists, banner not verified |
| bill-12 | Plan upgrade (monthly → yearly) | Portal | Webhook updates `stripePriceId`, billing reflects | 🟡 | 🔬 partial |
| bill-13 | Plan downgrade | Portal | Same as bill-12 in reverse | 🟡 | 🔬 partial |
| bill-14 | Referral discount applied | Referral code on checkout | Stripe coupon attached, reflected on invoice | 🟡 | 🔬 `__tests__/referral-actions.test.ts` |
| bill-15 | Stripe webhook signature invalid | Forged POST | 401, no DB write | ✅ | 🔬 `__tests__/stripe-webhook.test.ts` |
| bill-16 | Stripe webhook duplicate delivery | Same `event.id` twice | Idempotent — only one workspace update | 🟡 | 🔬 partial |
| bill-17 | Re-subscribe after cancellation | Cancelled workspace → /billing | New checkout reuses customer ID, workspace reactivates | 🟡 | 👁 |
| bill-18 | TEAM_MEMBER blocked from billing | `/crm/settings/billing` | Hidden / 403 | ✅ | 🧪 `e2e/team-member.spec.ts` |

### Known bill-* defects (this audit)

- **bill-04 / cpl-02 / Twilio cleanup leak.** `app/api/webhooks/stripe/route.ts:163-182` updates only `subscriptionStatus`, `stripePriceId`, `stripeCurrentPeriodEnd`. None of `twilioSubaccountId`, `twilioPhoneNumberSid`, or `twilioPhoneNumber` are released. We continue paying Twilio carrier rental on the orphaned number. Fix path: on `customer.subscription.deleted`, schedule a release job after `stripeCurrentPeriodEnd` that calls Twilio `incomingPhoneNumbers(sid).remove()` and clears the DB columns.
- **bill-06 / bill-07.** No in-app cancel surface. Tradies are bounced to a third-party portal with no warning, no save-the-customer step, no data-export offer.
- **bill-10 grace period.** `app/crm/layout.tsx:58` treats any non-`"active"` status as locked. A tradie who cancels at day 3 of a 30-day billing period loses access immediately even though they paid for the rest of the month. Should treat `"canceled"` + `stripeCurrentPeriodEnd > now` as still entitled.

## E. Lead capture (`lead`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| lead-01 | Inbound SMS to Tracey number → new lead | Twilio webhook | Contact + Deal(NEW) created, AI replies, auto-call scheduled | ✅ | 🔬 `__tests__/twilio-sms-webhook.test.ts` |
| lead-02 | Inbound SMS from existing contact | Twilio webhook | Appended to recent activity, no duplicate deal | ✅ | 🔬 same as lead-01 |
| lead-03 | Inbound SMS classified as spam | Twilio webhook | Activity logged as spam, no reply sent, no deal | ✅ | 🔬 spam-classifier.test.ts |
| lead-04 | Inbound SMS "CONFIRM" on pending booking | Twilio webhook | Pending deal flips to confirmed, activity logged | ✅ | 🔬 covered in twilio-sms-webhook |
| lead-05 | Inbound SMS "STOP" — opt-out | Twilio webhook | Contact flagged `smsOptedOut=true`, no AI reply, confirmation SMS sent, future sends blocked | 🔴 | ⛔ — currently AI still replies (see cpl-01) |
| lead-06 | Inbound voice call → Tracey answers | Twilio voice webhook | LiveKit/SIP bridge, AI handles, transcript saved | ✅ | 🔬 `__tests__/twilio-voice-*.test.ts` |
| lead-07 | Inbound voice call → after hours | Voice webhook outside business hours | Auto-call deferred, lead held, tradie notified | ✅ | 🔬 `__tests__/call-window.test.ts` |
| lead-08 | Inbound voice fallback (agent unavailable) | Voice webhook, fleet down | Voicemail recorded, callback scheduled | ✅ | 🔬 `__tests__/voice-fallback-route.test.ts` |
| lead-09 | Inbound email lead (Hipages/Airtasker/Oneflare) | `/api/webhooks/email` | Provider matched, contact + deal created, source tagged | 🟡 | 🔬 `__tests__/email-filters.test.ts` (lib only) |
| lead-10 | Inbound email lead (Gmail PubSub) | `/api/webhooks/email-received` | Gmail watch triggers sync, leads parsed | 🟡 | 🔬 partial |
| lead-11 | Inbound email lead (Resend forwarded) | `/api/webhooks/inbound-email` | Signature verified, lead created | 🟡 | 🔬 partial |
| lead-12 | Embeddable webform submission | `/api/webhooks/webform` | Deal created, source `webform` | 🟡 | 🔬 partial |
| lead-13 | Manual contact + deal create in CRM | `/crm/contacts` → New | Contact + (optional) deal saved, visible in list | ✅ | 🧪 `e2e/crm-core-journey.spec.ts` |
| lead-14 | Lead triage `HOLD_REVIEW` | Inbound lead, AI flags | Deal flagged, owner notified, no auto-call | ✅ | 🔬 `__tests__/triage.test.ts` |
| lead-15 | Inbound lead guard (recent duplicate phone) | Same phone retries within window | Held, owner shown reason | ✅ | 🔬 `__tests__/inbound-lead-guard.test.ts` |
| lead-16 | Duplicate contact dedup | Manual create with existing email/phone | Merge prompt, no silent duplicate | 🟡 | 🔬 `__tests__/dedup-actions.test.ts` (no UI prompt test) |
| lead-17 | Auto-call scheduled within call window | Eligible lead, business hours | Twilio call placed, `CallbackEvent` recorded | ✅ | 🔬 `__tests__/auto-call-eligibility.test.ts` + `lead-callback.test.ts` |
| lead-18 | Auto-call blocked after-hours | Eligible lead, outside window | Blocked event recorded, tradie sees deferred badge | ✅ | 🔬 same as lead-17 |

## F. Contact & deal management (`crm`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| crm-01 | Contacts list renders with stage + balance | `/crm/contacts` | Each row shows name, current job title, stage badge, balance, quick actions | ✅ | 🧪 `e2e/contact-journeys.spec.ts` |
| crm-02 | Contact detail page loads | `/crm/contacts/[id]` | Tabs (overview, deals, properties, activity) all populate | ✅ | 🧪 `e2e/contact-journeys.spec.ts` |
| crm-03 | Contact filter "Service Due" | Contacts list filter | Returns contacts past service interval | 🟡 | 👁 |
| crm-04 | Contact filter "Last Job" | Contacts list filter | (not implemented) | ⬜ | ⛔ (flagged in `use_case_walkthroughs.md` 9/15) |
| crm-05 | Multi-property contact | Sally (test fixture) | Properties tab lists portfolio | ✅ | 👁 |
| crm-06 | Edit contact form validation | Detail → Edit | Required fields enforced, phone format checked | 🟡 | 🔬 `__tests__/contact-actions.test.ts` (no UI test) |
| crm-07 | Deal create from contact page | Contact detail → New deal | Deal linked to contact, appears in pipeline | ✅ | 🧪 `e2e/crm-core-journey.spec.ts` |
| crm-08 | Deal detail page | `/crm/deals/[id]` | Stage, timeline, linked contact, action buttons all render | ✅ | 🧪 `e2e/crm-core-journey.spec.ts` |
| crm-09 | Kanban board renders columns | `/crm/deals` | Columns for each stage, deal counts, no console errors | ✅ | 🧪 `e2e/crm-core-journey.spec.ts` |
| crm-10 | Kanban drag-and-drop stage change | Drag deal between columns | Stage persists, automation fires once | 🔴 | 👁 — drag fails per `use_case_walkthroughs.md` |
| crm-11 | Drag stale deal → triggers follow-up modal | Stale → Quoted | Modal opens with template, schedules SMS | 🔴 | 👁 — modal does not open per UC7 |
| crm-12 | Stage transition fires automation exactly once | Update stage via UI | Automation log shows single execution | ✅ | 🔬 `__tests__/automation-actions.test.ts` |
| crm-13 | Health-score / "stale" / "rotting" badges | Pipeline | Badges appear on idle deals | ✅ | 🔬 `__tests__/deal-attention.test.ts` |
| crm-14 | Stale-deal follow-up modal (send now SMS) | Stale alert click | SMS sent via template, activity logged | ✅ | 🧪 `e2e/crm-follow-up-journey.spec.ts` |
| crm-15 | Stale-deal follow-up modal (schedule call) | Stale alert click | Task created with reminder | ✅ | 🧪 same as crm-14 |
| crm-16 | Follow-up modal recovery (no phone) | Contact without phone | UI surfaces "Add phone in CRM" CTA | ✅ | 🧪 same as crm-14 |
| crm-17 | Cross-entity search (Ctrl+K) | Top bar shortcut | Matches contacts, deals, tasks, activities | 🔴 | 👁 — returns no results per UC6 |
| crm-18 | Contact merge via duplicate prompt | Dedup detection on save | UI confirms merge, single contact remains | 🟡 | 🔬 only |

## G. Job & tradie workflow (`job`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| job-01 | Open Job Mode from schedule | `/crm/schedule` → Open Job Mode | Tradie view bottom sheet shows job, map, actions | ✅ | 👁 (Round 3 walkthrough) |
| job-02 | Start travel | Tradie view → Start Travel | ETA broadcast to customer, activity logged | ✅ | 👁 |
| job-03 | Mark on site | Tradie view → On Site | Status flips, customer SMS sent | 🟡 | 👁 |
| job-04 | Complete job | Tradie view → Complete | Deal moves to Complete, prompts invoice + photos | ✅ | 👁 |
| job-05 | Job photos add | Job detail → Photos tab | Upload works, thumbnails appear | ✅ | 👁 |
| job-06 | Digital handover (deliverables) | Job detail | Signed handover pack generated | ⬜ | ⛔ (UC10 partial) |
| job-07 | Uber-style customer arrival page | Customer link | Public ETA page renders | ⬜ | ⛔ (UC14 — depends job-02) |
| job-08 | Asset tracking on contact | Contact → Assets tab | Asset list visible | ⬜ | ⛔ (UC16) |
| job-09 | Post-job feedback request | Job complete | SMS with review link sent | 🟡 | 👁 |
| job-10 | Reputation building (UC8) | Job complete | Review link routes to feedback page | 🟡 | 👁 |

## H. Communication (`comm`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| comm-01 | Inbox loads conversations | `/crm/inbox` | Threads list, most recent first | ✅ | 🧪 `e2e/crm-communication-modes.spec.ts` |
| comm-02 | Inbox thread reveals SMS + voice mixed | Open thread | All channels stitched in timeline order | ✅ | 🧪 same as comm-01 |
| comm-03 | Direct SMS send | Inbox composer → Direct SMS | Twilio sent, activity logged, status shown | ✅ | 🧪 same as comm-01 |
| comm-04 | "Ask Tracey" mode in composer | Inbox composer → Ask Tracey | AI generates reply, user reviews before send | ✅ | 🧪 `e2e/crm-communication-recovery.spec.ts` |
| comm-05 | Draft preserved when toggling modes | Type → switch | Draft survives mode switch | ✅ | 🧪 same as comm-04 |
| comm-06 | Email-only contact: Direct SMS disabled | Inbox for email-only contact | UI explains why + adds "Add phone in CRM" CTA | ✅ | 🧪 same as comm-04 |
| comm-07 | Phone-only contact: email unavailable | Inbox for phone-only contact | UI explains, points to add-email | ✅ | 🧪 same as comm-04 |
| comm-08 | Template insert in composer | Composer → Template dropdown | Template merged with variables | 🟡 | 🔬 `__tests__/template-actions.test.ts` |
| comm-09 | WhatsApp send | Composer channel → WhatsApp | Sent via Twilio whatsapp:, status logged | 🟡 | 🔬 `__tests__/messaging-actions.test.ts` |
| comm-10 | Quote / invoice sent via email | Quote action → Send | Resend used, delivery webhook updates status | 🟡 | 🔬 partial |
| comm-11 | Bulk "rainy day blast" via chat | Sidebar chat "find me indoor work" | AI shortlists contacts, sends batch SMS | 🔴 | 👁 — chat fails per UC2 |
| comm-12 | Outbound SMS blocked to opted-out contact | Send to `smsOptedOut=true` contact | Blocked at app layer with clear error toast | ⬜ | ⛔ — opt-out flag does not exist |
| comm-13 | SMS delivery failure surfacing | Twilio status webhook reports `failed` | Activity marked failed, tradie sees red badge | 🟡 | 🔬 partial |

## I. Notifications (`notif`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| notif-01 | Toggle "Email deal updates" off | `/crm/settings/notifications` | Pref persists AND no email sent on next deal update | 🟡 | 🔬 save tested; **enforcement not tested or implemented** |
| notif-02 | Toggle "Email new contacts" off | Same | Pref persists AND no email on next contact create | 🟡 | 🔬 same |
| notif-03 | Toggle "Email weekly summary" off | Same | Pref persists AND digest job skips this workspace | 🟡 | 🔬 same |
| notif-04 | Toggle "Task reminders" off | Same | Pref persists AND daily briefings skip | ✅ | 🔬 `__tests__/notification-actions.test.ts` (read in `ensureDailyNotifications`) |
| notif-05 | Toggle "Stale deal alerts" off | Same | Pref persists AND no stale alert created | 🟡 | 🔬 saves but consumer not asserted |
| notif-06 | Enable browser push (subscribe) | Toggle on | `Notification.requestPermission`, VAPID subscribe, row in `PushSubscription` | ✅ | 🔬 `__tests__/push-subscribe-routes.test.ts` |
| notif-07 | Disable browser push (unsubscribe) | Toggle off | POST `/api/push/unsubscribe`, browser unsubscribe, row removed | ✅ | 🔬 `__tests__/push-subscribe-routes.test.ts` |
| notif-08 | Push payload sent only when pref on | Create notification | `webPushEnabled=false` → no `sendPushToUser` call | ✅ | 🔬 `notification-actions.ts:158` |
| notif-09 | Push token expired (410 from FCM) | `sendPushToUser` | Subscription auto-removed on 410 | ✅ | 🔬 `lib/push-notifications.ts:50-90` |
| notif-10 | WhatsApp notification toggles per type | `/crm/settings/notifications` WhatsApp card | Per-type prefs persist in `NotificationChannelPref` | ✅ | 🔬 `__tests__/notification-prefs-actions.test.ts` |
| notif-11 | WhatsApp dispatch respects type pref | Notification created with type | Skipped if user disabled that type | ✅ | 🔬 `lib/notifications/whatsapp-dispatch.ts` |
| notif-12 | Test notification button | Settings → Send test | In-app + push + WhatsApp all fire if enabled | ✅ | 🔬 covered in notif-04..11 |
| notif-13 | Morning briefing fires once / day | Cron-ish trigger at agenda time | Single notification created within window | ✅ | 🔬 `__tests__/notification-actions.test.ts` (`ensureDailyNotifications`) |
| notif-14 | Evening wrap-up fires once / day | Same at wrap-up time | Single notification | ✅ | 🔬 same |
| notif-15 | Daily briefings disabled if `inAppTaskReminders=false` | Toggle off | Both briefings skip | ✅ | 🔬 same |

### Known notif-* defects (this audit)

- **notif-01..03 / cpl-3..5.** Preference keys `emailDealUpdates`, `emailNewContacts`, `emailWeeklySummary` are written to `workspace.settings` but never read by email-sending code. `grep` confirms only two references: the settings page itself and `notification-actions.ts` where the type is defined. Fix path: add a `shouldSendEmail(workspaceId, key)` helper, call it from every email sender (deal update, contact-created notifier, weekly digest job).

## J. Calendar & scheduling (`cal`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| cal-01 | Google Calendar OAuth connect | Settings → Calendar | Token saved, watch channel created | 🟡 | 🔬 `__tests__/calendar-actions.test.ts` |
| cal-02 | New deal with scheduledAt → calendar event | Schedule job for a date | Event appears in linked Google Calendar | 🟡 | 🔬 only |
| cal-03 | Calendar event update → deal reschedule | Edit event in Google | App reflects new time | 🟡 | 👁 |
| cal-04 | Visual confirmation status on calendar | `/crm/schedule` | Confirmed vs pending events visually distinct | 🔴 | 👁 — UC5 missing |
| cal-05 | Click calendar event → popover with quick actions | Schedule click | Popover with call/SMS/edit | 🔴 | 👁 — navigates to deal instead per UC5 |
| cal-06 | Booking-confirmation SMS pending → CONFIRM | Customer replies CONFIRM | Deal `confirmationStatus=confirmed`, activity logged | ✅ | 🔬 covered in twilio-sms-webhook |
| cal-07 | Business hours / call window enforcement | Inbound lead outside hours | Auto-call deferred, friendly defer activity | ✅ | 🔬 `__tests__/call-window.test.ts` |

## K. Quotes & invoices (`quote`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| quote-01 | Create quote from deal | Deal → New quote | Line items, GST 10%, totals correct | ✅ | 🔬 `__tests__/tradie-actions.test.ts` |
| quote-02 | Send quote via email | Quote → Send | PDF attached, status `sent` | 🟡 | 🔬 partial |
| quote-03 | Quote accepted | Customer accept link | Quote → invoice, deal stage advances | 🟡 | 🔬 partial |
| quote-04 | Invoice number sequential | Multiple invoices same workspace | Monotonic, no gaps/duplicates | ✅ | 🔬 `__tests__/invoice-number.test.ts` |
| quote-05 | GST calculation edge cases | Quote with discount + multi-item | GST sums correctly to 10% of taxable | ✅ | 🔬 included in quote-01 |
| quote-06 | Xero/MYOB sync | Settings → Accounting | Invoice pushed to external | 🟡 | 🔬 `__tests__/accounting-actions.test.ts` |
| quote-07 | Stripe-hosted payment link on invoice | Customer pays | Payment webhook marks invoice paid | 🟡 | 🔬 partial |

## L. Team & workspace (`team`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| team-01 | Owner invites teammate | Settings → Team → Invite | Invite email sent, magic link works | ✅ | 🧪 `e2e/team-member.spec.ts` |
| team-02 | Teammate accepts invite | Click email link | Lands in shared workspace as MANAGER / TEAM_MEMBER | ✅ | 🧪 same |
| team-03 | Teammate sees CRM but not billing | `/crm/settings/billing` as TEAM_MEMBER | 403 / hidden nav item | ✅ | 🧪 same |
| team-04 | Teammate sees CRM but not phone provisioning | Settings → My number | Hidden — owner-only per product principle | ✅ | 🧪 same |
| team-05 | Owner removes teammate | Settings → Team → Remove | Teammate's next request lands on friendly screen | 🟡 | 🔬 only |
| team-06 | Role change live | Owner promotes TEAM_MEMBER → MANAGER | Next page load reflects new permissions | 🟡 | ⛔ |
| team-07 | Workspace switch | User in multiple workspaces | Switcher renders, context updates | 🟡 | 👁 |

## M. Search, navigation, dashboard (`crm` cont'd)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| crm-19 | Sidebar nav renders | Any `/crm/*` | Icons, active state, badges | ✅ | 🧪 `e2e/crm-core-journey.spec.ts` |
| crm-20 | Dashboard loads with KPIs | `/crm/dashboard` | KPI cards, today's jobs, urgent followups | ✅ | 🧪 same |
| crm-21 | Chat-mode dashboard | `/crm/dashboard` (default) | Tracey chat surface as primary | ✅ | 🧪 `e2e/crm-core-journey.spec.ts` |
| crm-22 | Advanced-mode dashboard toggle | Dashboard mode switch | Switches to advanced, layout persists | ✅ | 🧪 same |
| crm-23 | Reports page | `/crm/analytics` (was /reports) | Charts render with workspace data | 🟡 | 👁 — mock data per Round 3 |
| crm-24 | Feedback page | `/crm/feedback` | Loads without crash | ✅ | 👁 — fixed Round 3 |
| crm-25 | Mobile bottom nav single Tracey entry | Mobile viewport | Exactly one Tracey center button, no duplicates | ✅ | 🧪 visual specs |

## N. Settings (`set`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| set-01 | Business profile edit | `/crm/settings/my-business` | Save persists, used in AI prompts | ✅ | 🔬 `__tests__/settings-actions.test.ts` |
| set-02 | Refusal rules / scope | `/crm/settings/my-business` | Updates surface in voice/SMS agent behaviour | ✅ | 🔬 included in set-01 |
| set-03 | Agent mode (EXECUTION vs DRAFT) | Settings → Agent | Toggle persists, auto-call eligibility flips | ✅ | 🔬 `__tests__/auto-call-eligibility.test.ts` |
| set-04 | Voice fleet config | Settings → Voice | Save persists, fleet probe still healthy | ✅ | 🔬 `__tests__/voice-fleet.test.ts` |
| set-05 | Lead capture email alias | Settings → Lead capture | Alias generated, inbound emails routed correctly | ✅ | 🔬 `__tests__/lead-capture-email.test.ts` |
| set-06 | After-hours / voice agent window | Settings | (per UC11 — verify exists post Round 3) | 🟡 | 👁 |
| set-07 | Phone forwarding instructions | Settings → My number | Carrier-specific code shown copy-paste | ✅ | 🔬 `__tests__/call-forwarding.test.ts` |
| set-08 | Twilio number visible only to owner | `/crm/settings` as owner vs teammate | Owner sees, teammate hidden | ✅ | 🧪 covered in team-04 |
| set-09 | Cost-ceiling circuit breaker triggers | Twilio usage > $50 | Voice disabled, banner shown | ✅ | 🔬 `__tests__/cost-ceiling.test.ts` |

## O. AI / Tracey chat (`ai`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| ai-01 | Send chat message | Sidebar chat | Tool calls run, streamed response | ✅ | 🔬 `__tests__/chat-actions.test.ts` |
| ai-02 | AI creates job from natural language | "New repair for Frank at 300 George" | Job created, parsed correctly | ✅ | 👁 Round 5 |
| ai-03 | AI books appointment | "Book Sally for Thursday 10am" | Deal scheduled, calendar synced | 🟡 | 🔬 partial |
| ai-04 | AI looks up contact | "What did I quote Frank?" | Returns recent quote total | ✅ | 🔬 `__tests__/agent-tools.test.ts` |
| ai-05 | AI handles ambiguous request | "Find me indoor work" | Sensible answer or graceful fallback | 🔴 | 👁 — UC2 fails |
| ai-06 | AI tool-call error recovery | Tool throws | User-facing graceful message, no crash | 🟡 | 🔬 partial |
| ai-07 | AI context windows respected | Long conversation | No silent truncation, summarisation works | 🟡 | 🔬 partial |

## P. Compliance & data rights (`cpl`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| cpl-01 | Customer SMS STOP → opt-out enforced | Twilio webhook | Contact flagged, no AI reply, single confirmation SMS, outbound blocked | 🔴 | ⛔ |
| cpl-02 | Subscription cancel releases Twilio number | Stripe `subscription.deleted` | Twilio number released after `current_period_end`, DB cleared | 🔴 | ⛔ |
| cpl-03..05 | Email pref toggles enforced end-to-end | Toggle off → send action runs | Email is **not** sent | 🟡 | ⛔ enforcement side |
| cpl-06 | Customer data export | Settings → Export my data | One-click JSON/CSV of contacts, deals, activities | ⬜ | ⛔ |
| cpl-07 | Customer data deletion request | Settings → Delete workspace | Hard-delete workflow with confirmation + cooling-off | ⬜ | ⛔ |
| cpl-08 | Outbound email has visible unsubscribe link | Any tradie→customer marketing email | Mandatory footer with one-click unsubscribe | ⬜ | ⛔ (legal-mentioned in `app/(legal)/privacy/page.tsx`, not enforced) |
| cpl-09 | Privacy policy & terms reachable from app | Any page | Footer link works | ✅ | 🧪 visual specs |

## Q. Admin / internal (`adm`)

| ID | Flow | Entry | Success outcome | State | Verification |
|----|------|-------|-----------------|-------|--------------|
| adm-01 | Internal health page | `/health` | 200 with JSON status | ✅ | 🔬 `__tests__/health-route.test.ts` |
| adm-02 | Voice fleet health | `/api/voice-fleet/health` | 200 with probe data | ✅ | 🔬 `__tests__/voice-fleet-health-route.test.ts` |
| adm-03 | Launch readiness | `/api/launch-readiness` | 200 if all gates pass | ✅ | 🔬 `__tests__/launch-readiness.test.ts` |
| adm-04 | Synthetic voice probe | Probe endpoint | Probe outcome recorded | ✅ | 🔬 `__tests__/voice-synthetic-probe-route.test.ts` |
| adm-05 | Internal admin routes blocked in prod | `/admin/*` non-staff | 404 | ✅ | 🔬 `__tests__/admin-internal-route-redirects.test.ts` |
| adm-06 | Passive communications health | Endpoint | 200 with summary | ✅ | 🔬 `__tests__/passive-communications-health-route.test.ts` |

---

## Action items from this audit

1. **cpl-01 / lead-05** — implement SMS STOP / UNSUBSCRIBE / CANCEL handling in `app/api/twilio/webhook/route.ts`. Set `Contact.smsOptedOut`, short-circuit before AI reply, send one confirmation, block outbound at `lib/messaging/safe-recipient.ts`.
2. **cpl-02 / bill-04** — on `customer.subscription.deleted`, schedule a Twilio release job for `stripeCurrentPeriodEnd`. Clear `twilioPhoneNumber`, `twilioPhoneNumberSid`, `twilioSubaccountId`. Add `__tests__/stripe-webhook-cancellation.test.ts`.
3. **cpl-03..05 / notif-01..03** — gate every email sender behind `shouldSendEmail(workspaceId, prefKey)`. Wire enforcement test per pref.
4. **bill-06..09** — add in-app cancel surface with confirmation, post-cancel banner, and data-export offer.
5. **bill-10** — relax `app/crm/layout.tsx:58` to grant access through `stripeCurrentPeriodEnd`.
6. **crm-10, crm-11, crm-17, comm-11, ai-05** — these are flagged 🔴 in the existing manual walkthroughs and have no automated coverage. Each needs a Playwright spec, then a fix.

## Execution rules (do not skip)

1. **Every PR updates this matrix.** If you touch code in a row's area,
   either keep its state, improve it, or explicitly flip it to 🔴 with a
   note. Reviewers reject PRs that silently degrade rows.
2. **Every bug fix lands with the test that would have caught it.** No
   exceptions. The test goes in the matrix.
3. **Pre-release smoke pass.** The release manager walks every 👁 row in
   the scope of the release. Anything 🔴 is a release blocker.
4. **Quarterly cull.** Once a quarter, walk every ⬜ row and decide:
   build it, or delete it from the matrix. Backlog rot is worse than
   gaps.

