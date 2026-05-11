# Missing Features

Updated: 2026-05-11 AEST

This is the short, current list of product gaps that still look real.
It intentionally excludes old fixed history and avoids re-listing archived work.

For the full live backlog, use:
- `docs/master_outstanding_checklist.md`

For historical changes and proof, use:
- `docs/agent_change_log.md`

## Current Open Product Gaps

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
