# Earlymark

AI assistant + CRM for Australian service businesses.

## What the app does

Earlymark combines 4 main surfaces:

- `Tracey interview form`
  Earlymark demo assistant launched from the homepage interview form.
- `Tracey inbound call`
  Earlymark inbound sales assistant for calls to Earlymark AI.
- `Tracey for users`
  Customer-facing assistant for Earlymark customers across calls and texts.
- `CRM chatbot`
  Internal operator assistant inside the CRM for jobs, contacts, invoices, and workflow actions.

The current product focus is:

- win and convert leads faster
- automate inbound calls, texts, and customer admin
- run the CRM through chat instead of manual clicking

## Core product areas

### Homepage + demo flow

- marketing homepage with demo/interview form
- Earlymark sales/demo Tracey behavior
- Vercel-hosted web app

### Billing + onboarding

- auth -> billing -> setup -> dashboard
- beta billing toggle for `Provision mobile business number`
- if toggle is off before Stripe payment:
  - user can still pay
  - user can still complete onboarding
  - Twilio number is not provisioned later from that paid flow
- if toggle is on before Stripe payment:
  - workspace becomes eligible for Twilio mobile-number provisioning

### Twilio provisioning model

- one Twilio subaccount per workspace
- one business number per workspace
- team members in the same workspace share that same number
- provisioning is mobile-only for new AU number purchases
- provisioning is centrally gated to avoid duplicate reprovisioning

### CRM

- kanban jobs/deals pipeline
- contacts
- inbox
- schedule/calendar
- dashboard map
- invoice actions
- AI-driven CRM actions via chat tools

### Voice + messaging

- LiveKit-based voice agent
- Groq primary with explicit fallback routing for voice
- Cartesia `sonic-3` pinned for TTS
- Twilio for messaging and phone infrastructure
- persisted voice call logs, transcripts, and latency metrics

## Current architecture

### Frontend

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend

- Prisma
- Supabase Postgres
- Supabase Auth
- Supabase Storage

### AI + communications

- Google Gemini for main app chat flows
- Groq primary plus DeepInfra fallback for voice-agent inference
- LiveKit for realtime voice orchestration
- Cartesia for TTS
- Deepgram for STT
- Twilio for SMS/phone/subaccounts
- Mem0 for memory where enabled

## Important current behavior

### Customer-contact modes

These exact terms are the current source of truth for `Tracey for users`:

- `execute`
- `review & approve`
- `info only`

Rules:

- these modes apply to `Tracey for users` on both calls and texts
- `CRM chatbot` internal CRM operations are not governed by these 3 modes
- when the chatbot is asked to contact customers, it is effectively acting as `Tracey for users`, so the mode rules apply

### Voice knowledge model

For `Tracey for users`, voice grounding is moving toward the same workspace truth model as the CRM chatbot:

- business identity
- services
- pricing
- no-go rules
- contact details
- availability

Changing facts should come from retrieval/tools and DB state, not giant prompts.

## Running locally

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

## Key environment variables

See [.env.example](C:/Users/micha/Assistantbot/.env.example) for the full list. The most important groups are:

- Supabase
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`
- Stripe
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRO_MONTHLY_PRICE_ID`
  - `STRIPE_PRO_YEARLY_PRICE_ID`
  - `STRIPE_WEBHOOK_SECRET`
- Twilio
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
- Voice / AI
  - `GEMINI_API_KEY`
  - `GROQ_API_KEY`
  - `DEEPGRAM_API_KEY`
  - `CARTESIA_API_KEY`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
- App / internal
  - `NEXT_PUBLIC_APP_URL`
  - `VOICE_AGENT_WEBHOOK_SECRET`
  - `TELEMETRY_ADMIN_KEY`
  - `TRACEY_HANDBOOK_URL`

## Deployment notes

- web app deploys separately from the LiveKit worker
- GitHub Actions now auto-deploys `livekit-agent/**` changes to the OCI worker
- the worker logs its deployed git SHA on startup for verification
- AU Twilio number purchases require Twilio regulatory compliance approval

## Docs worth reading next

- [DEPLOYMENT_CHECKLIST.md](C:/Users/micha/Assistantbot/DEPLOYMENT_CHECKLIST.md)
- [LIVEKIT_SETUP.md](C:/Users/micha/Assistantbot/LIVEKIT_SETUP.md)
- [APP_MANUAL.md](C:/Users/micha/Assistantbot/APP_MANUAL.md)
- [AGENTS.md](C:/Users/micha/Assistantbot/AGENTS.md)
