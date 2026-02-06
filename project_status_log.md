# Project Status Log

**Purpose**: Usage by Google Antigravity (Frontend), Claude Code (Backend), and Aider (Backend) to stay synchronized on the "Pj Buddy" project.

## Project Summary
**Pj Buddy** is a high-velocity CRM platform for SMEs featuring a "Hub and Spoke" architecture.
*   **The Core (Hub)**: Universal CRM (Contacts, Pipeline, Activity Feed).
*   **The Modules (Spokes)**:
    *   *Tradie Mode*: Map-based, Quick Invoicing.
    *   *Agent Mode*: Speed-to-lead, Open House Kiosk.
*   **Tech Stack**:
    *   **Frontend**: Next.js 15, Tailwind CSS (v4), Shadcn UI, Framer Motion.
    *   **Backend**: Supabase, Prisma ORM, Server Actions.

---

## 🚀 HANDOVER: REQUIREMENTS FOR BACKEND TEAM (CLAUDE CODE & AIDER)

### 1. What We Need to Add / What Is Flagged
The Frontend (Antigravity) has built the **Visual Shell** for the Core CRM, but it currently runs on **Mock Data**. To make this "Real", we need the backend to support:
*   **The "Invisible" Data Entry**: Automatic capture of emails/meetings into the CRM.
*   **Kanban Logic**: Persisting deal stages and drag-and-drop state.
*   **Enrichment**: The "Magic" lookup of company data.
*   **Stale Logic**: Calculation of "Last Activity Date" on the server.

### 2. What I (Gemini/Antigravity) Am Doing
*   ✅ **Built the UI**: Created the Dashboard Layout, Kanban Board, Deal Cards (with visual alerts), and Activity Feed.
*   ✅ **State Management**: Implemented a Mock Context to toggle between "Chat Mode" and "CRM Mode".
*   ✅ **Interaction**: Added `framer-motion` physics for drag-and-drop and hover effects.
*   **Next**: I am ready to wire up `actions/deal-actions.ts` and `actions/activity-actions.ts` once the Schema exists.

### 3. What Claude Code & Aider (Backend) Are Required To Do
*   **Database Schema**: Create the Prisma Schema for `Contact`, `Deal`, `Activity`, and `PipelineStage`.
*   **Server Actions**:
    *   `getDeals()`: Fetch deals with their status and computed `daysSinceActivity`.
    *   `updateDealStage(dealId, stageId)`: server action to persist drag-and-drop.
    *   `logActivity(type, payload)`: Polymorphic handling of emails, calls, and meetings.
*   **Integrations (The "Magic")**:
    *   Implement the logic to "watch" a mock email inbox or calendar (webhooks or polling) to auto-create Activities.
    *   Implement a mock `enrichContact(email)` function that returns company logo/domain.

### 4. How The Backend Team Should Do It
*   **Schema First**: Define `schema.prisma` with a focus on valid relations (One Deal has Many Activities).
*   **Seed Script**: Please write a `seed.ts` that populates the DB with the *exact* mock scenarios I used (e.g., "Legacy Migration" deal in "Negotiation" stage with a date 15 days ago so I can see the "Rotting" alert).
*   **Server Actions**: Expose these in `@/actions/...` so I can import them directly into my client components.

---

## Change Log

### 2026-02-06 [Backend - Aider] - Team Expansion
**Update**: Added Aider to the backend team.
*   **Role**: Aider will work interchangeably with Claude Code on backend tasks, bug fixes, and wiring support.
*   **Context**: Aider has ingested the project status and handover logs and is aware of the completed Phase 1-5 backend work.

### 2026-02-06 [Frontend - Antigravity] - Core CRM Hub
**Feature**: Visual Pipeline & Chat Mode
*   **Layout Toggle**: Implemented Context-based toggle (`Chat` vs `Advanced/CRM` modes). `Chat` mode maximizes the Assistant pane. `Advanced` mode shows the Kanban board.
*   **Kanban Board**: Created visual pipeline with 5 stages (New, Contacted, Negotiation, Won, Lost) and `framer-motion` drag physics.
*   **Deal Logic**: Added "Stale" (Amber > 7d) and "Rotting" (Red > 14d) visual alerts to Deal Cards.
*   **Activity Feed**: Created `ActivityFeed` component to visualize the "Magic Data Entry" events.

### 2026-02-06 [Frontend - Antigravity] - Design Pivot
**Feature**: Neutral Light Theme & SaaS Landing Page
*   **Design System**: Refactored `globals.css` and all UI components to **Neutral Light** (White Bg, Slate-900 Text, Borders/Shadows). Removed Dark Mode/Glassmorphism.
*   **Landing Page**: Replaced placeholder with full SaaS page (Hero, Product, Pricing, Contact). Added `Navbar` with "Get Started" CTA.
*   **Auth**: Updated Login/Signup pages to Light Mode. Added mock feedback to Google Sign-in button.

### 2026-02-06 [Backend - Claude Code] - Full Backend Implementation
**Feature**: Complete CRM Backend — Schema, Server Actions, Utilities, Seed Data

**Prisma Schema** (`prisma/schema.prisma`):
*   Aligned `DealStage` enum with frontend kanban: `NEW`, `CONTACTED`, `NEGOTIATION`, `WON`, `LOST` (+ `INVOICED` for Tradie).
*   Added `MEETING` and `TASK` to `ActivityType` enum (frontend uses these).
*   Added `company`, `avatarUrl` to Contact model; `company` to Deal model.
*   Added `title`, `description` fields to Activity model.
*   New models: `Task` (reminders/follow-ups), `Automation` (IFTTT triggers), `ChatMessage` (chatbot CRM interface).
*   All models properly indexed with cascade deletes.

**Server Actions** (all in `actions/` directory — import via `@/actions/...`):
*   `actions/deal-actions.ts`:
    *   `getDeals(workspaceId)` → Returns `DealView[]` matching frontend `Deal` type exactly (includes computed `lastActivityDate`, `health` status, `contactName`).
    *   `createDeal(input)` → Creates deal + auto-logs creation activity.
    *   `updateDealStage(dealId, stage)` → Persists Kanban drag-and-drop. Maps lowercase frontend stages to Prisma enum.
    *   `updateDealMetadata(dealId, metadata)` → Merges polymorphic JSON data.
    *   `deleteDeal(dealId)` → Cascade delete.
*   `actions/activity-actions.ts`:
    *   `getActivities(options)` → Fetch with optional deal/contact/workspace filter, returns relative time strings.
    *   `logActivity(input)` → Polymorphic: CALL, EMAIL, NOTE, MEETING, TASK.
    *   `autoLogActivity(payload)` → **"Invisible Data Entry"**: auto-creates contacts from email, auto-logs meetings/emails, attaches to most active deal.
*   `actions/contact-actions.ts`:
    *   `getContacts(workspaceId)` → With deal count and last activity date.
    *   `createContact(input)` → **Auto-enriches** from email domain (company logo, industry, size, LinkedIn).
    *   `enrichContact(contactId)` → On-demand enrichment.
    *   `searchContacts(workspaceId, query, filters?)` → **Fuzzy search** (Levenshtein distance) — finds "Jhon" for "John". Supports filters: `hasDeals`, `lastContactedWithin`.
    *   `updateContact()`, `deleteContact()`.
*   `actions/task-actions.ts`:
    *   `getTasks(options)` → With overdue flag, deal title, contact name.
    *   `createTask(input)` → "Remind me to call John next Tuesday".
    *   `completeTask(taskId)`, `getOverdueCount(workspaceId)`, `deleteTask()`.
*   `actions/automation-actions.ts`:
    *   `getAutomations()`, `createAutomation()`, `toggleAutomation()`.
    *   `evaluateAutomations(workspaceId, event)` → Evaluates IFTTT rules: deal_stale, deal_stage_change, new_lead, task_overdue.
    *   `PRESET_AUTOMATIONS` — 4 ready-made recipes (stale deal alert, auto-welcome, follow-up task, overdue escalation).
*   `actions/chat-actions.ts`:
    *   `processChat(message, workspaceId)` → **Primary CRM interface**. Natural language parser handles: "show deals", "show stale deals", "new deal X for Y worth Z", "move X to negotiation", "log call with John", "find Jhon", "add contact X email", "remind me to ...", "morning digest", "help".
    *   `getChatHistory(limit)` → Retrieves persisted chat messages.

**Lib Utilities** (all in `lib/` directory):
*   `lib/db.ts` — PrismaClient singleton (exports `db`).
*   `lib/pipeline.ts` — `getDealHealth(lastActivity)`: HEALTHY (<=7d, green), STALE (8-14d, amber), ROTTING (>14d, red).
*   `lib/enrichment.ts` — `enrichFromEmail(email)`: domain → company name, logo (Clearbit URL), industry, size, LinkedIn. Known domain lookup table + fallback.
*   `lib/search.ts` — `fuzzySearch(items, query)`: Levenshtein distance-based fuzzy matching across multiple searchable fields.
*   `lib/digest.ts` — `generateMorningDigest(workspaceId)`: "Here are the 3 people you need to call today to make money." Prioritizes rotting deals, overdue tasks, today's follow-ups.

**Seed Script** (`prisma/seed.ts`):
*   Matches frontend `MOCK_DEALS` exactly: 5 deals, 5 contacts, 5 activities with correct stale/rotting dates.
*   "Consulting Retainer" (Wayne Ent) = 8 days ago → Stale/Amber.
*   "Legacy Migration" (Cyberdyne) = 15 days ago → Rotting/Red.
*   3 tasks (1 tomorrow, 2 overdue), 2 preset automations.
*   Run: `npm run db:seed`.

**How Antigravity Should Wire Up**:
1.  Replace `MOCK_DEALS` in `app/dashboard/page.tsx` with `getDeals(workspaceId)`.
2.  Replace mock `activities` in `components/crm/activity-feed.tsx` with `getActivities({ workspaceId })`.
3.  On Kanban drag-drop, call `updateDealStage(dealId, newStage)`.
4.  Wire `AssistantPane` input to `processChat(message, workspaceId)`.
5.  Add enrichment on contact creation: already built into `createContact()`.

### 2026-02-06 [Backend - Claude Code] - Build Fixes, Vertical Actions, Cleanup
**Feature**: Tradie/Agent Actions + Build Passing + Legacy Cleanup

*   **Removed `src/` legacy directory**: All code consolidated into root `lib/`, `actions/`. No more duplicate files.
*   **New Vertical Actions**:
    *   `actions/tradie-actions.ts` — `generateQuote()` (line items → subtotal + 10% GST, creates Invoice, moves deal to INVOICED), `getDealInvoices()`, `issueInvoice()`, `markInvoicePaid()` (auto-moves deal to WON).
    *   `actions/agent-actions.ts` — `findMatches()` (buyer matchmaker: filters contacts by budget + bedrooms), `logOpenHouseAttendee()` (auto-creates contacts from open house visitors), `getOpenHouseLog()`.
*   **Build Fixes**:
    *   Replaced Google Fonts (Geist) in `app/layout.tsx` with system fonts (build fails without internet).
    *   Fixed Prisma `InputJsonValue` type errors in all action files — wrapped Json field writes with `JSON.parse(JSON.stringify(...))`.
*   **Build Status**: **PASSING** — all 9 routes compile cleanly with `npm run build`.
*   **Server Action Summary (8 files, all at `actions/`)**:
    *   `deal-actions.ts`, `activity-actions.ts`, `contact-actions.ts`, `task-actions.ts`
    *   `automation-actions.ts`, `chat-actions.ts`, `tradie-actions.ts`, `agent-actions.ts`

### 2026-02-06 [Backend - Claude Code] - All 14 Backend Tasks Complete
**Feature**: Full backend implementation across all 5 phases

**Phase 1 — Wire-up**:
*   `.env.example` with Supabase, Twilio, Google, Azure, Xero configs
*   `actions/workspace-actions.ts` — `getOrCreateWorkspace()`, `getWorkspace()`, `updateWorkspace()`, `listWorkspaces()`
*   Prisma `directUrl` configured for Supabase connection pooling

**Phase 2 — Core Gaps**:
*   `stageChangedAt` field on Deal + computed `daysInStage` in `getDeals()`
*   `actions/dedup-actions.ts` — `findDuplicateContacts()`, `mergeContacts()` (email, phone, fuzzy name matching)
*   `MessageTemplate` model + `actions/template-actions.ts` — CRUD, `renderTemplate()` with `{{var}}`, 7 presets seeded
*   Chat commands: "show templates", "use template X for Y", "find duplicates"

**Phase 3 — Tradie Stream**:
*   `generateQuotePDF(invoiceId)` — returns structured data + printable HTML
*   `actions/geo-actions.ts` — `geocodeDeal()`, `getDealsWithLocation()`, `batchGeocode()` (Nominatim API)
*   `actions/accounting-actions.ts` — Xero/MYOB sync stubs

**Phase 4 — Agent Stream**:
*   `lib/qrcode.ts` — pure SVG QR generator, `generateOpenHouseQR()` in agent-actions
*   `actions/portal-actions.ts` — `importFromPortal()` for REA/Domain listings

**Phase 5 — Communications**:
*   `actions/messaging-actions.ts` — `sendSMS()`, `sendWhatsApp()`, `sendBulkSMS()` (Twilio API)
*   `actions/email-actions.ts` — Gmail/Outlook sync stubs, OAuth URLs, webhook processor
*   `actions/calendar-actions.ts` — Google/Outlook Calendar stubs, `createCalendarEvent()`
*   `extension/` — Chrome MV3 browser extension (manifest, content scripts for LinkedIn/REA/Domain, popup, background worker)
*   `app/api/extension/import/route.ts` — API route for extension data push

**Build Status**: **PASSING** — 10 routes (9 static + 1 dynamic API)
**Server Actions**: 14 files | **Lib Utilities**: 6 files | **Models**: 10 | **API Routes**: 1

**How Antigravity Should Wire Up** (Phase 1 frontend tasks):
1.  Replace `MOCK_DEALS` in `app/dashboard/page.tsx` with `getDeals(workspaceId)` — returns `DealView[]` (now includes `daysInStage`, `stageChangedAt`)
2.  Replace mock activities in `components/crm/activity-feed.tsx` with `getActivities({ workspaceId })`
3.  Wire `AssistantPane` chat input to `processChat(message, workspaceId)` — now supports templates + dedup commands
4.  Wire Kanban drag-drop to `updateDealStage(dealId, newStage)` — now also sets `stageChangedAt`
5.  Call `getOrCreateWorkspace(userId)` on app load to get `workspaceId`

---

## 🗺️ ACTION PLAN — Backend Team (Claude Code & Aider) + Antigravity (Frontend)

**Created**: 2026-02-06 | **Status**: BACKEND COMPLETE — awaiting frontend wiring

### Current State

| Layer | Status |
|-------|--------|
| Prisma Schema | 10 models, 3 enums — DONE |
| Server Actions | 14 files — DONE |
| Lib Utilities | 6 files — DONE |
| Seed Data | Matches MOCK_DEALS + templates — DONE |
| API Routes | 1 (extension import) — DONE |
| Browser Extension | Chrome MV3 scaffold — DONE |
| Frontend Shell | Dashboard, Kanban, Cards, Feed, Chat, Auth, Landing — DONE |
| **Frontend ↔ Backend Wiring** | **NOT STARTED — Antigravity's turn** |

---

### PHASE 1 — Wire Up (Make What Exists Real)
**Priority: CRITICAL — everything else depends on this**
**Do first. Both agents work in parallel.**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 1.1 | Replace `MOCK_DEALS` with `getDeals()` | **Antigravity** | In `app/dashboard/page.tsx`, call `getDeals(workspaceId)`. Returns `DealView[]` matching existing `Deal` type exactly (id, title, company, value, stage as lowercase, lastActivityDate, contactName, contactAvatar). | ⬜ |
| 1.2 | Replace mock activities with `getActivities()` | **Antigravity** | In `components/crm/activity-feed.tsx`, replace hardcoded array with `getActivities({ workspaceId })`. Already returns relative time strings. | ⬜ |
| 1.3 | Wire chat input to `processChat()` | **Antigravity** | In `components/core/assistant-pane.tsx`, call `processChat(message, workspaceId)`. Returns `{ response: string, data?: any }`. Display `response` as assistant message. | ⬜ |
| 1.4 | Wire Kanban drag-drop to `updateDealStage()` | **Antigravity** | On drop, call `updateDealStage(dealId, newStage)` where newStage is lowercase (`"new"`, `"contacted"`, `"negotiation"`, `"won"`, `"lost"`). Backend maps to Prisma enum. | ⬜ |
| 1.5 | Supabase setup + schema push | **Backend** | `.env.example` with `DATABASE_URL` + `DIRECT_URL`. Prisma configured with `directUrl` for Supabase pooling. | ✅ |
| 1.6 | Workspace/auth context | **Backend** | `actions/workspace-actions.ts`: `getOrCreateWorkspace()`, `getWorkspace()`, `updateWorkspace()`, `listWorkspaces()`. Workspace model has `ownerId` for auth binding. | ✅ |

---

### PHASE 2 — Core Feature Gaps
**Priority: HIGH — needed for MVP**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 2.1 | Real drag-and-drop (dnd-kit) | **Antigravity** | Install `@dnd-kit/core` + `@dnd-kit/sortable`. Replace framer-motion drag with real reorder/drop persistence. On drop, call `updateDealStage()`. | ⬜ |
| 2.2 | Contact detail page + timeline | **Antigravity** | New route `app/contacts/[id]/page.tsx`. Show contact info, all deals, all activities in a unified timeline. Backend already has `getActivities({ contactId })`. | ⬜ |
| 2.3 | `days_in_stage` tracking | **Backend** | `stageChangedAt` field on Deal. `updateDealStage()` sets it. `getDeals()` returns computed `daysInStage`. | ✅ |
| 2.4 | CMD+K command palette | **Antigravity** | Install `cmdk`. Wire to `searchContacts()` + `fuzzySearch()`. Show deals, contacts, commands in palette. | ⬜ |
| 2.5 | Smart contact deduplication | **Backend** | `actions/dedup-actions.ts`: `findDuplicateContacts()` + `mergeContacts()`. Matches email, phone, fuzzy name (>85%). Chat: "find duplicates". | ✅ |
| 2.6 | Template library | **Backend** | `MessageTemplate` model + `actions/template-actions.ts`: CRUD + `renderTemplate()` with `{{var}}` syntax. 7 presets seeded. Chat: "show templates", "use template X for Y". | ✅ |

---

### PHASE 3 — Tradie Stream
**Priority: MEDIUM — vertical differentiation**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 3.1 | PDF quote/invoice generation | **Backend** | `generateQuotePDF(invoiceId)` returns `QuotePDFData` + printable HTML with GST, line items, contact details. Frontend uses `window.print()` or any PDF lib. | ✅ |
| 3.2 | Pocket Estimator UI | **Antigravity** | Form: material + quantity + rate → line items. "Generate Quote" button calls `generateQuote()`. Preview total with GST. | ⬜ |
| 3.3 | Map / geo-scheduling view | **Antigravity** | Integrate Mapbox or Google Maps. Plot deals by address. Route optimization for today's jobs. | ⬜ |
| 3.4 | Map geocoding backend | **Backend** | `address`, `latitude`, `longitude` on Deal. `actions/geo-actions.ts`: `geocodeDeal()`, `getDealsWithLocation()`, `batchGeocode()`. Uses Nominatim free API. | ✅ |
| 3.5 | Voice-to-invoice | **Antigravity** | Web Speech API (`SpeechRecognition`). Transcribe → feed to `processChat()` which handles "new deal" and "generate quote" commands. | ⬜ |
| 3.6 | Offline support | **Antigravity** | Service worker for offline cache. Queue mutations in IndexedDB. Sync when online. | ⬜ |
| 3.7 | Xero/MYOB accounting sync | **Backend** | `actions/accounting-actions.ts`: `syncInvoiceToXero()`, `syncInvoiceToMYOB()`, `getInvoiceSyncStatus()`. Stub — ready for OAuth integration. | ✅ |

---

### PHASE 4 — Agent Stream
**Priority: MEDIUM — vertical differentiation**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 4.1 | Open House Kiosk UI | **Antigravity** | Tablet-optimized form: name, email, phone, buyer status. Calls `logOpenHouseAttendee()`. Show QR to self-register. | ⬜ |
| 4.2 | QR code generation | **Backend** | `lib/qrcode.ts`: pure SVG QR generator (no deps). `generateOpenHouseQR(dealId)` in agent-actions returns SVG + data URL. | ✅ |
| 4.3 | Buyer matchmaker UI | **Antigravity** | When viewing listing deal, show "Matched Buyers" panel. Call `findMatches(listingId)`. Display match score, budget fit, bedroom fit. | ⬜ |
| 4.4 | Portal integration stubs | **Backend** | `actions/portal-actions.ts`: `importFromPortal(url, workspaceId)`. Detects REA/Domain, creates Deal + Contact, stores portal metadata. | ✅ |
| 4.5 | Rotting deal alerts widget | **Antigravity** | Dashboard widget showing stale + rotting counts. Click through to filtered Kanban. Backend `getDeals()` already returns health. | ⬜ |

---

### PHASE 5 — Communications & Integrations
**Priority: LOWER — post-MVP polish**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 5.1 | SMS/WhatsApp via Twilio | **Backend** | `actions/messaging-actions.ts`: `sendSMS()`, `sendWhatsApp()`, `sendBulkSMS()`. Uses Twilio REST API. Auto-logs activities. | ✅ |
| 5.2 | Unified messaging inbox UI | **Antigravity** | New `app/inbox/page.tsx`. SMS/WhatsApp/email threads grouped by contact. Chat bubble format. | ⬜ |
| 5.3 | Email sync (Gmail/Outlook) | **Backend** | `actions/email-actions.ts`: `syncGmail()`, `syncOutlook()`, `getGmailAuthUrl()`, `getOutlookAuthUrl()`, `processEmailWebhook()`. Stub — ready for OAuth. | ✅ |
| 5.4 | Calendar integration | **Backend** | `actions/calendar-actions.ts`: `syncGoogleCalendar()`, `syncOutlookCalendar()`, `createCalendarEvent()`, `processCalendarWebhook()`. Stub — ready for OAuth. | ✅ |
| 5.5 | Bulk SMS/blast | **Backend** | Included in `messaging-actions.ts`: `sendBulkSMS(contactIds[], message)`. Rate-limited (1/sec). Template `{{var}}` substitution. | ✅ |
| 5.6 | Browser extension | **Backend** | Chrome MV3 extension in `extension/`: manifest, background worker, LinkedIn + portal content scripts, popup UI, API route at `/api/extension/import`. | ✅ |

---

### Execution Order

```
PHASE 1 (Wire-up) ← BOTH START HERE IN PARALLEL
  Backend (Claude/Aider): 1.5, 1.6
  Antigravity: 1.1, 1.2, 1.3, 1.4

PHASE 2 (Core gaps) ← THEN THIS
  Backend (Claude/Aider): 2.3, 2.5, 2.6
  Antigravity: 2.1, 2.2, 2.4

PHASE 3 + 4 (Verticals) ← IN PARALLEL
  Backend (Claude/Aider): 3.1, 3.4, 3.7, 4.2, 4.4
  Antigravity: 3.2, 3.3, 3.5, 3.6, 4.1, 4.3, 4.5

PHASE 5 (Comms) ← LAST
  Backend (Claude/Aider): 5.1, 5.3, 5.4, 5.5, 5.6
  Antigravity: 5.2
```

### Key Dependencies
- **Everything** depends on Phase 1 (Supabase setup + wiring)
- **3.2** (Estimator UI) depends on **3.1** (PDF backend)
- **3.3** (Map view) depends on **3.4** (Geocoding backend)
- **4.1** (Kiosk UI) depends on **4.2** (QR generation)
- **5.2** (Inbox UI) depends on **5.1** (Twilio) + **5.3** (Email sync)
- **5.5** (Bulk SMS) depends on **5.1** (Twilio) + **2.6** (Templates)

### Task Count Summary
| Owner | Ph1 | Ph2 | Ph3 | Ph4 | Ph5 | Total | Done |
|-------|-----|-----|-----|-----|-----|-------|------|
| Backend (Claude/Aider) | 2 | 3 | 3 | 2 | 4 | **14** | **14 ✅** |
| Antigravity | 4 | 3 | 4 | 3 | 1 | **15** | **0 ⬜** |
