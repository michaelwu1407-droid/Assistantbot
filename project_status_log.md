# Project Status Log

**Purpose**: Usage by Google Antigravity (Frontend) and Claude Code (Backend) to stay synchronized on the "Pj Buddy" project.

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

## 🚀 HANDOVER: REQUIREMENTS FOR CLAUDE CODE (BACKEND)

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

### 3. What Claude Code (Backend) Is Required To Do
*   **Database Schema**: Create the Prisma Schema for `Contact`, `Deal`, `Activity`, and `PipelineStage`.
*   **Server Actions**:
    *   `getDeals()`: Fetch deals with their status and computed `daysSinceActivity`.
    *   `updateDealStage(dealId, stageId)`: server action to persist drag-and-drop.
    *   `logActivity(type, payload)`: Polymorphic handling of emails, calls, and meetings.
*   **Integrations (The "Magic")**:
    *   Implement the logic to "watch" a mock email inbox or calendar (webhooks or polling) to auto-create Activities.
    *   Implement a mock `enrichContact(email)` function that returns company logo/domain.

### 4. How Claude Should Do It
*   **Schema First**: Define `schema.prisma` with a focus on valid relations (One Deal has Many Activities).
*   **Seed Script**: Please write a `seed.ts` that populates the DB with the *exact* mock scenarios I used (e.g., "Legacy Migration" deal in "Negotiation" stage with a date 15 days ago so I can see the "Rotting" alert).
*   **Server Actions**: Expose these in `@/actions/...` so I can import them directly into my client components.

---

## Change Log

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
