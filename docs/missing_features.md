# Missing Features & Gap Analysis

This document tracks discrepancies between documented intent and the actual codebase.

Last audited: 2026-04-01

---

## Open Items

### Medium Priority

- **Notification action buttons** (`components/dashboard/notifications-btn.tsx`): CONFIRM_JOB, CALL_CLIENT, SEND_INVOICE, APPROVE_COMPLETION buttons render and navigate but do not execute their named action server-side. Currently nav-only.
- **Google Calendar auto-sync**: `actions/calendar-actions.ts` has real API code but no webhook subscription or scheduled trigger — sync only fires on manual invocation.
- **Email OAuth token storage** (Gmail/Outlook onboarding step 3): Connection UI and OAuth flow exist; backend handler for storing/refreshing tokens after callback is not confirmed wired.

### Low Priority (Polish/Edge Cases)

- **Xero auto-sync after invoice creation**: `createXeroDraftInvoice` works on-demand but is not automatically called when an invoice is issued or paid.
- **Email variant of review request**: SMS review request (`sendReviewRequestSMS`) works; email equivalent is not implemented.
- **Support ticket system**: Tickets are logged as `Activity` records — no status, assignment, or SLA fields. Not a full ticketing workflow.

### Archived

- **Asset DNA / Digital Handover**: Part of the real estate agent arm. Feature archived and route removed (2026-03-28). Prisma `Key` model retained in schema for data preservation.

---

## Resolved (No Longer Missing)

| Feature | Resolution |
|---|---|
| AI Voice Agent (inbound call → CRM) | Implemented — Twilio gateway + LiveKit + `VoiceCall` logging |
| AI SMS Agent (inbound SMS → AI reply) | Implemented — `/api/twilio/webhook` + `sms-agent.ts` |
| CRM Chat Assistant (internal queries) | Implemented — Gemini 2.0 Flash Lite via `/api/chat` |
| Global Search | Fixed — no `useIndustry` hook dependency in search path |
| Deal Photos | Implemented — gallery section in deal detail modal |
| Kanban Stale Deal modals | Implemented — `kanban-automation-modal.tsx`, `stale-deal-follow-up-modal.tsx` |
| AI Voice Agent settings UI | Implemented — `call-settings-client.tsx`, `ai-receptionist-settings.tsx` |
| After Hours Mode settings | Implemented — voice after-hours message textarea in call settings |
| Digital Handover UI | Archived — part of real estate agent arm, route removed |
| Job Workflow (Start Travel / Complete Job) | Fixed in Round 3 |
| AI Parsing / Pricing accuracy | Fixed — rebuilt to tool-use architecture (Sprint 21) |
| Kanban drag to Lost column | Fixed — `updateDealStage` persists correctly |
| Tradie deep-link "All Caught Up" bug | Fixed |
| Stale deal follow-up modal (was setTimeout stub) | Fixed 2026-04-01 — now calls `sendFollowUpMessage` (real Twilio SMS / Resend email) |
| Follow-up scheduling on deals | Built 2026-04-01 — `followUpAt/Note/Channel/CompletedAt` fields on Deal; schedule/complete/cancel actions; UI in deal detail modal |
| Post-job "Follow Up After Job" rule never fired | Fixed 2026-04-01 — `processPostJobFollowUps` cron runs hourly via `/api/cron/followup-reminders` |
| No proactive follow-up reminders to user | Fixed 2026-04-01 — `processFollowUpReminders` cron notifies workspace users when follow-ups are due/overdue |
| CRM job completion modal (was setTimeout stub) | Fixed 2026-04-01 — checkboxes now trigger real actions (Request Payment → invoice email, Request Review → review SMS) |
| Notification action buttons nav-only | Fixed 2026-04-01 — CONFIRM_JOB, APPROVE_COMPLETION execute server actions; SEND_INVOICE opens invoice; CALL_CLIENT opens tel: link |
