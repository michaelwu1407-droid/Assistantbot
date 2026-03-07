# Earlymark - Operational Manual

**Version**: 2.3 (Mar 2026)  
**Audience**: Product, engineering, support, and power users

---

## 1. Product summary

Earlymark is an AI assistant + CRM for Australian service businesses.

It combines:

- a CRM hub for jobs, contacts, inbox, schedule, map, invoices, and settings
- customer-facing assistants for calls and texts
- an internal CRM chatbot for operators

The main assistant surfaces are:

- `Tracey interview form`
- `Tracey inbound call`
- `Tracey for users`
- `CRM chatbot`

---

## 2. Main user flow

Current default flow:

1. auth
2. billing
3. setup / onboarding
4. dashboard

### Beta billing rule

Billing has a temporary toggle:

- `Provision mobile business number`

Behavior:

- toggle on before Stripe payment:
  - paid workspace becomes eligible for Twilio mobile-number provisioning
- toggle off before Stripe payment:
  - user can still pay
  - user can still complete onboarding
  - no Twilio number is provisioned later from that paid flow

---

## 3. Twilio + phone model

The app uses a dual-number model:

### Personal user number

- used for verification and internal user communication
- managed in settings

### Workspace business number

- one Twilio subaccount per workspace
- one business number per workspace
- shared across team members in that workspace
- used for customer-facing SMS/calls by Tracey

Important current rules:

- provisioning is centrally gated
- successful workspaces should not auto-reprovision
- AU number purchase requires Twilio regulatory approval
- new AU purchases are mobile-only

---

## 4. Assistant behavior model

### Tracey interview form

- Earlymark outbound demo/interview assistant
- used from the homepage demo flow
- optimized for pain-point discovery and conversion to demo/manager follow-up

### Tracey inbound call

- Earlymark inbound sales assistant
- answers product questions
- captures lead details
- steers callers toward sign-up, website, or manager follow-up

### Tracey for users

- assistant for customer businesses
- handles customer calls and texts using workspace context

Current customer-contact modes for `Tracey for users`:

- `execute`
- `review & approve`
- `info only`

These modes apply across:

- calls
- texts
- outbound customer communication

### CRM chatbot

- internal operator assistant in the app
- can answer questions and operate the CRM through explicit tools
- internal CRM operations are not governed by the 3 customer-contact modes
- if asked to contact customers, it is effectively acting as `Tracey for users`, so those mode rules apply

---

## 5. CRM areas

### Dashboard

- KPI row
- header actions
- recent activity modal
- kanban board

### Kanban

- drag-and-drop jobs/deals
- explicit long-press selection mode for bulk actions
- AI-enabled bulk actions via chat context

### Inbox

- contact list on the left
- conversations / system activity on the right
- direct message mode
- `Ask Tracey` mode for either CRM updates or customer comms
- customer-type and date filters

### Contacts

- customer records
- contact history
- edit/update contact details

### Invoices

- draft
- issue
- mark paid
- reminders
- status lookups
- current schema supports edit/void actions through chatbot tools

---

## 6. Voice stack

Current voice architecture:

- LiveKit for realtime orchestration
- Deepgram for STT
- Cartesia `sonic-3` for TTS
- Groq preferred directly for voice inference when configured

Voice call persistence now includes:

- transcript capture
- call metadata
- turn-level latency
- bottleneck summaries

---

## 7. Knowledge model

The assistant should use retrieval and tool-backed business truth rather than giant prompts.

Important knowledge sources:

- workspace settings
- business profile
- approved pricing
- service rules
- no-go rules
- business documents
- CRM records

The intended direction is:

- `CRM chatbot` and `Tracey for users` share the same workspace truth model
- changing facts like pricing should come from live data/tools, not stale prompt text

---

## 8. Operational notes

- web app deploys separately from the voice worker
- Vercel success does not imply voice-worker success
- `livekit-agent/**` changes deploy through the worker GitHub Action / OCI path
- worker startup logs deployed git SHA for verification

---

## 9. Local development

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Typecheck:

```bash
npx tsc --noEmit
```

---

## 10. Where to look next

- [README.md](C:/Users/micha/Assistantbot/README.md)
- [DEPLOYMENT_CHECKLIST.md](C:/Users/micha/Assistantbot/DEPLOYMENT_CHECKLIST.md)
- [LIVEKIT_SETUP.md](C:/Users/micha/Assistantbot/LIVEKIT_SETUP.md)
- [AGENTS.md](C:/Users/micha/Assistantbot/AGENTS.md)
