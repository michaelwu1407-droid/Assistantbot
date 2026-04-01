# Missing Features & Gap Analysis

This document tracks discrepancies between documented intent and the actual codebase.

Last audited: 2026-03-28

---

## Open Items

### Low Priority (Polish/Edge Cases)

_No open items._

### Archived

- **Asset DNA / Digital Handover**: Part of the real estate agent arm. Feature archived and route removed (2026-03-28). Prisma `Key` model retained in schema for data preservation.

---

## Resolved (No Longer Missing)

All previously reported high and medium priority gaps have been addressed:

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
