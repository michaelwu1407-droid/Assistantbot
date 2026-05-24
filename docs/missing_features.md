# Missing Features

Updated: 2026-05-11 AEST

This is the short, current list of product gaps that still look real.
It intentionally excludes old fixed history and avoids re-listing archived work.

For the full live backlog, use:
- `docs/master_outstanding_checklist.md`

For historical changes and proof, use:
- `docs/agent_change_log.md`

## Current Open Product Gaps

### Compliance & opt-out (added 2026-05-24 audit)

Tracked exhaustively in `docs/USE_CASE_TEST_MATRIX.md` under the `cpl-*`
and `bill-*` rows. The blockers are:

- **Customer SMS STOP is not honoured** (`cpl-01` / `lead-05`). The
  Twilio webhook silently filters STOP out of the new-lead heuristic but
  the AI still generates and sends a reply, and there is no
  contact-level opt-out flag. Twilio carrier-level blocks save us from
  spamming, but we have zero in-app visibility and our own legal copy
  promises enforcement.

- **Subscription cancellation leaks a Twilio number** (`cpl-02` /
  `bill-04`). On `customer.subscription.deleted` only
  `subscriptionStatus` flips. The Twilio subaccount and phone number SID
  remain on the workspace and we keep paying carrier rental.

- **Email-notification preferences are decorative** (`cpl-03..05` /
  `notif-01..03`). The toggles in `/crm/settings/notifications` save to
  `workspace.settings.notificationPreferences` but no email-sending code
  reads them. `grep` confirms two references only: the settings page
  itself and the actions file where the type is defined.

- **No in-app subscription-cancel surface** (`bill-06..09`). Tradies are
  bounced to Stripe's hosted portal with no warning dialog, no
  save-the-customer step, no data-export offer, and no post-cancel
  banner on return.

- **Immediate lockout on cancellation** (`bill-10`). `app/crm/layout.tsx`
  treats any non-`active` status as locked, even if the customer has
  paid through end of period.

- **No customer data export / deletion surface** (`cpl-06..07`). Legal
  page implies we honour these, but there's no UI or workflow.

- **Outbound emails to end-customers have no unsubscribe footer**
  (`cpl-08`). Required by `app/(legal)/privacy/page.tsx` copy.

### High-confidence gaps

- **Real voice signoff is not finished**
  - The infrastructure is much healthier, but the last step still needs real handset/provider validation for homepage demo callback, `inbound_demo`, and the real customer `normal` path.

- **WhatsApp is still provider-blocked**
  - The app-side assistant and notification plumbing are mostly there, but live production still depends on Twilio/Meta channel readiness.

- **Google Calendar inbound readback is intentionally parked**
  - Keep Google Calendar outbound-only for now; Earlymark should not read users' calendars into the CRM unless that product decision changes later.

- **Support tickets are still lightweight**
  - Support requests are captured, but they still behave more like activity logging than a complete ticket ownership/assignment/SLA workflow.

### Medium-confidence gaps

- **Email OAuth persistence/refresh confidence**
  - The connection UI and flow exist, but callback storage/refresh handling still needs either proof or cleanup documentation.

- **Xero automation depth**
  - Draft invoice creation exists, but true automatic sync through later invoice lifecycle steps still looks incomplete.

- **Email review-request parity**
  - SMS review requests are stronger than email review-request support.

## Not Missing Anymore

Do not re-open these without fresh evidence:

- AI voice agent for inbound calls
- AI SMS agent for inbound SMS
- CRM chat assistant
- Voice settings UI
- After-hours voice configuration
- Follow-up scheduling and reminder cron
- Real job completion modal actions
- Notification action buttons that used to be nav-only

## Archived / Intentionally Out Of Scope

- Real-estate-arm features such as Digital Handover / Asset DNA
- Retell / Vapi voice paths
