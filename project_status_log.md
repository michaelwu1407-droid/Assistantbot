# Project Status Log

**Purpose**: Usage by Google Antigravity (Frontend), Claude Code (Backend), and Aider (Backend) to stay synchronized on the "Pj Buddy" project.

## Project Summary
**Pj Buddy** is a high-velocity CRM platform for SMEs featuring a "Hub and Spoke" architecture.
*   **The Core (Hub)**: Universal CRM (Contacts, Pipeline, Activity Feed).
*   **The Modules (Spokes)**:
    *   *Tradie Mode*: Map-based, Quick Invoicing.
    *   *Agent Mode*: Speed-to-lead, Open House Kiosk.
*   **Tech Stack**:
    *   **Frontend**: Next.js 16, Tailwind CSS (v4), Shadcn UI, Framer Motion.
    *   **Backend**: Supabase (PostgreSQL), Prisma 6 ORM, Server Actions.
    *   **Dev DB**: SQLite (`file:./dev.db`) — switch to PostgreSQL for production.

---

## CONTRIBUTOR REQUIREMENTS — ALL AI AGENTS MUST FOLLOW

> [!IMPORTANT]
> **Every AI contributor** (Antigravity/Gemini, Claude Code, Aider) **MUST** update this status log when making changes.

### How to Log Your Changes
1. Add a new entry under **Change Log** with the format:
   ```
   ### YYYY-MM-DD [Role - Agent Name] - Category
   **Feature/Fix**: Short description
   *   **Detail 1**: What was done
   *   **Status**: Which task(s) this completes
   ```
2. Update the **task table** status (change `⬜`→`🚧`→`✅`) when starting/finishing tasks.
3. If you create new files, list them so other agents know they exist.
4. If you change existing APIs or component props, note the breaking change.

### Why This Matters
- We have 3 AI agents working in parallel. Without status updates, agents duplicate work or break each other's code.
- This file is the **single source of truth** for project state.

---

## 🚀 HANDOVER: REQUIREMENTS FOR BACKEND TEAM (CLAUDE CODE & AIDER)

> [!NOTE]
> **DATABASE CONNECTED**: Credentials have been added to `.env`.
> **NEXT ACTION**: Run `npx prisma db push` and `npm run db:seed` to initialize the database.

### 1. What We Need to Add / What Is Flagged
The Frontend (Antigravity) has built the **Visual Shell** for the Core CRM. We are now connecting it to the real Supabase backend.
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

### 2026-02-07 [Backend - Aider] - Schema Restoration
**Fix**: Restored full Prisma Schema
*   **Schema**: Re-applied the full schema definition (Tasks, Invoices, Automations, ViewMode, IndustryType) which appeared to be missing/reverted in the latest file sync.
*   **Status**: Schema now matches the codebase expectations.

### 2026-02-07 [Backend - Aider] - Assistant Logic Refinement
**Feature**: Enhanced Chat Parser for Industry Context
*   **Chat Actions**: Updated `actions/chat-actions.ts` to support synonyms for "deal" (job, listing, lead) in commands.
*   **Status**: Assistant now understands "New job..." and "Show listings..." natively.

### 2026-02-07 [Backend - Aider] - Assistant-First Logic & Schema
**Feature**: Implemented backend support for "Start Day" and View Modes
*   **Schema**: Added `ViewMode` enum and `viewMode` field to `User` model in `prisma/schema.prisma`.
*   **Chat Logic**: Updated `actions/chat-actions.ts` to handle `start_day` (Tradie) and `start_open_house` (Agent) commands.
*   **Status**: Backend is ready to support the frontend view switching logic.

### 2026-02-07 [Backend - Aider] - Assistant-First Pivot Implementation
**Feature**: Implemented the "Extreme Granular Walkthrough" UI and Logic
*   **Store**: Updated `lib/store.ts` to handle `viewMode` (BASIC/ADVANCED) and `isTutorialActive`.
*   **Shell**: Updated `components/layout/Shell.tsx` to implement the Split Pane logic (Canvas vs Chatbot) with transitions.
*   **Tradie UI**: Updated `app/dashboard/tradie/page.tsx` with Dark Mode, Pulse Widget, Bottom Sheet, Sticky Footer, and Safety Check modal.
*   **Agent UI**: Updated `app/dashboard/agent/page.tsx` with Light Mode, Speed-to-Lead widget, Rotting Pipeline placeholder, and Magic Keys footer.
*   **Actions**: Updated `actions/tradie-actions.ts` and `actions/agent-actions.ts` to include specific logic for job status updates, quoting, and key logging.
*   **Status**: Core UI and Logic for the Assistant-First Pivot is now implemented.

### 2026-02-07 [Backend - Aider] - Assistant-First Pivot
**Feature**: Implemented Core Architecture for Assistant-First UX
*   **Schema**: Updated `prisma/schema.prisma` with `WorkspaceType` enum and polymorphic `metadata` for Deals.
*   **Store**: Created `lib/store.ts` with Zustand for `viewMode` (Basic/Advanced) and `isTutorialActive`.
*   **Shell**: Created `components/layout/Shell.tsx` implementing the Split Pane logic (Canvas vs Chatbot).
*   **Actions**:
    *   Created `actions/tradie.ts` for Job Status and Quoting.
    *   Created `actions/agent.ts` for Buyer Matching and Key Logging.
*   **Logic**: Created `lib/pipeline.ts` for "Rotting" status calculation.
*   **Status**: Core plumbing for the "Extreme Granular Walkthrough" is in place.

### 2026-02-07 [Backend - Claude Code] - Tutorial Redesign (Split-Screen)
**Feature**: Full tutorial redesign with platform preview + chatbot side-by-side

*   **Layout**: 3/4 left pane shows mock "Advanced Mode" platform (kanban pipeline, deal cards, health stats), 1/4 right pane shows chatbot with equivalent commands.
*   **Mock UI**: Built `MockPipelinePreview` (kanban columns, deal health widget, stats row) and `MockDealCard` (matching real `DealCard` visuals — stale/rotting badges, dollar values, initials, day counters).
*   **Interactive highlights**: "Stale" step highlights rotting/stale cards with blue ring + amber/red stat badges. "Add" step highlights the "+ New Deal" button.
*   **Industry-aware**: 3 variants (TRADES: 4 steps with job pipeline + quoting; REAL_ESTATE: 4 steps with listings + buyer search; Default: 3 steps with generic deals).
*   **Chat pane**: Animated message bubbles show exact user→assistant conversations for each feature.
*   **Routing**: Every sign-in now triggers tutorial (setup page redirects onboarded users to /tutorial instead of /dashboard, for troubleshooting).
*   **Status**: Tutorial completely rebuilt from scratch.

### 2026-02-07 [Backend - Claude Code] - Onboarding Flow Wiring
**Feature**: End-to-end onboarding: signup → setup → tutorial → dashboard

*   **Schema**: Added `onboardingComplete` Boolean field to Workspace model.
*   **Server Action**: Added `completeOnboarding()` in `workspace-actions.ts` — persists business name, industry type, and location to workspace, sets `onboardingComplete = true`.
*   **Setup Chat** (`components/onboarding/setup-chat.tsx`): Now calls `completeOnboarding` server action at final step. Previously only saved industry to localStorage — now persists all 3 fields to DB.
*   **Routing**:
    *   Signup and Login now route to `/setup` (not `/dashboard`).
    *   `/setup` checks `onboardingComplete` — redirects to `/dashboard` if already done.
    *   `/dashboard` checks `onboardingComplete` — redirects to `/setup` if not done.
*   **Critical Fix**: Moved `redirect()` calls outside try/catch blocks. Next.js `redirect()` throws internally and was being swallowed by catch blocks, causing "Database Not Initialized" to show instead of redirecting.
*   **Tutorial** (`components/onboarding/tutorial-view.tsx`): Now industry-aware — trades users see "Add a new client" / "Create a quote" / "Show stale jobs"; real estate users see "Add a new buyer" / "Manage listings" / "Show stale listings". Added 3rd tutorial step for both verticals.
*   **Status**: Completes onboarding wiring from Master Specification section 2.C (Zero-Dashboard Onboarding Flow).

### 2026-02-06 [Backend - Claude Code] - Vercel Deployment
**Fix**: Production deployment to Vercel
*   **URL**: https://assistantbot-zeta.vercel.app
*   **Schema**: Switched Prisma from SQLite to PostgreSQL for Vercel/Supabase compatibility.
*   **Build**: Added `prisma generate` to build script and `postinstall` hook so Prisma client regenerates on each Vercel deploy.
*   **Dynamic pages**: Marked all DB-dependent pages (`dashboard`, `estimator`, `inbox`, `kiosk`, `tradie/map`) as `force-dynamic` to prevent build-time DB queries.
*   **Error handling**: Wrapped all server-rendered pages in try/catch so they show a helpful "Database Not Initialized" message instead of crashing when Supabase tables don't exist.
*   **Fix**: Removed invalid `"use server"` directive from estimator page (pages are Server Components by default, `"use server"` only allows async function exports).
*   **Extension**: Removed hardcoded `localhost:3000` — users must configure their deployment URL.
*   **Status**: App deploys and builds on Vercel. DB tables need `prisma db push` + `prisma db seed` against Supabase.

### 2026-02-06 [Backend - Claude Code] - Code Quality & Build Cleanup
**Fix**: Full codebase audit and quality pass
*   **Security**: Removed hardcoded Supabase credentials from `lib/db.ts`. DB connection now requires `.env` to be configured.
*   **Prisma**: Regenerated Prisma client from current schema, resolving all ~47 TypeScript compiler errors caused by stale generated types.
*   **Tailwind**: Fixed `tailwind.config.ts` content paths (was scanning `./src/` which doesn't exist; now correctly scans `./app/` and `./components/`). Removed dead `darkMode: "class"` config and stale dark theme colors.
*   **ESLint**: Resolved all 27 ESLint errors across 25 files (unused imports, unescaped JSX entities, missing displayNames, empty interfaces, no-explicit-any).
*   **Stale Files**: Removed outdated `tsc_log.txt` and `lint_log.txt`.
*   **Build Status**: **0 TypeScript errors, 0 ESLint errors** (13 warnings remain — all `_`-prefixed stub params).

### 2026-02-07 [Backend - Claude Code] - Assistant-Pivot Backend Support
**Feature**: Industry-context-aware schema & chat intelligence

*   **Package**: Installed missing `@radix-ui/react-dropdown-menu` (required by Antigravity's new dropdown-menu component).
*   **ESLint**: Fixed 63 new ESLint errors introduced by assistant-pivot merge (JSX in try/catch, Date.now() purity, unescaped entities, unused imports, setState in useEffect). Result: **0 errors, 13 warnings**.
*   **Schema** (`prisma/schema.prisma`):
    *   Added `IndustryType` enum (`TRADES`, `REAL_ESTATE`).
    *   Added `industryType` and `location` fields to `Workspace` model.
*   **Workspace Actions** (`actions/workspace-actions.ts`):
    *   Updated `WorkspaceView` interface with `industryType` and `location`.
    *   Added `toWorkspaceView()` helper to DRY up mapping across all functions.
    *   `getOrCreateWorkspace()` and `updateWorkspace()` now accept `industryType` and `location`.
*   **Chat Intelligence** (`actions/chat-actions.ts`):
    *   Added `getIndustryContext()` — returns industry-specific labels based on workspace.industryType.
    *   **TRADES**: "jobs"/"clients", stage labels (New Lead → Quoted → In Progress → Invoiced → Paid → Lost), G'day greeting.
    *   **REAL_ESTATE**: "listings"/"buyers", stage labels (New Listing → Appraised → Under Offer → Exchanged → Settled → Withdrawn).
    *   **Default**: "deals"/"contacts" with generic labels.
    *   All case handlers (`show_deals`, `show_stale`, `create_deal`, `help`, `default`) now use context-specific terminology.
*   **Status**: Completes backend tasks 3.A (Schema Updates) and 3.B (Assistant Logic Engine — context awareness) from the Master Specification.
*   **Next**: Run `npx prisma@6 db push` against Supabase to apply schema changes.

### 2026-02-07 [Frontend - Antigravity] - Communications
**Feature**: Unified Inbox
*   **UI**: Created `app/inbox/page.tsx` and `InboxView`.
*   **Logic**: Added `getInboxThreads` to `messaging-actions.ts`.
*   **Status**: Task 5.2 Complete.

### 2026-02-07 [Frontend - Antigravity] - Core Hub Polish
**Feature**: Rotting Deal Widget
*   **UI**: Created `components/crm/deal-health-widget.tsx`.
*   **Logic**: Calculates pipeline value and counts stale/rotting deals.
*   **Status**: Task 4.5 Complete.

### 2026-02-07 [Frontend - Antigravity] - Agent Stream
**Feature**: Buyer Matchmaker & Deal Page
*   **UI**: Created `app/dashboard/deals/[id]/page.tsx` and `BuyerMatchmaker` component.
*   **Logic**: Wires to `findMatches` action. Shows contacts matching budget/bedrooms.
*   **Status**: Task 4.3 Complete.

### 2026-02-07 [Frontend - Antigravity] - Agent Stream
**Feature**: Open House Kiosk
*   **Kiosk UI**: Built `app/kiosk/[id]/page.tsx` tablet-first view.
*   **Logic**: Wires to `logOpenHouseAttendee` + auto-creates contacts.
*   **Status**: Task 4.1 Complete.

### 2026-02-07 [Backend - Claude Code] - Database Connected
**Update**: Populated `.env` with Supabase credentials.
*   **Fix**: URL-encoded special characters in password to prevent connection errors.
*   **Status**: Database connection ready.
*   **Next**: Schema push and seed.

### 2026-02-07 [Frontend - Antigravity] - Voice-to-Invoice
**Feature**: Voice command integration
*   **UI**: Added microphone button to `AssistantPane`.
*   **Logic**: Integrated Web Speech API.
*   **Backend**: Added `create_invoice` intent to `processChat` action.

### 2026-02-06 [Backend - Aider] - Team Expansion
**Update**: Added Aider to the backend team.
*   **Role**: Aider will work interchangeably with Claude Code on backend tasks, bug fixes, and wiring support.
*   **Context**: Aider has ingested the project status and handover logs and is aware of the completed Phase 1-5 backend work.

### 2026-02-06 [Backend - Aider] - Phase 1 Wiring Complete
**Feature**: Connected Frontend Shell to Backend Actions
*   **Dashboard**: Refactored `app/dashboard/page.tsx` to Server Component fetching real `getDeals()` and `getActivities()`.
*   **Kanban**: Wired `KanbanBoard` to `updateDealStage()` server action using HTML5 Drag & Drop.
*   **Chat**: Wired `AssistantPane` to `processChat()` server action.
*   **Activity Feed**: Connected to real data props.

### 2026-02-06 [Backend - Aider] - Phase 2 Backend Support
**Feature**: Contact Details & Filtering
*   **Contact Actions**: Added `getContact(id)` to fetch single contact details. Updated `ContactView` to include `address` and `metadata`.
*   **Deal Actions**: Updated `getDeals()` to support filtering by `contactId`.
*   **Purpose**: Unblocking Frontend Task 2.2 (Contact Detail Page).

### 2026-02-06 [Backend - Aider] - Phase 2 UI Implementation
**Feature**: Contact Detail Page
*   **Page**: Created `app/contacts/[id]/page.tsx` fetching contact, deals, and activities.
*   **Components**: Created `ContactHeader` and `ContactTimeline` for visualizing contact history.
*   **Status**: Task 2.2 Complete.

### 2026-02-06 [Backend - Aider] - Phase 2 Search Support
**Feature**: Global Search Action
*   **Search**: Created `actions/search-actions.ts` with `globalSearch()` to aggregate contacts, deals, and tasks using fuzzy matching.
*   **Purpose**: Unblocking Task 2.4 (Command Palette).

### 2026-02-06 [Backend - Aider] - Phase 2 Command Palette
**Feature**: CMD+K Command Palette
*   **UI**: Created `components/core/command-palette.tsx` with custom modal UI (no external deps).
*   **Integration**: Mounted in `app/layout.tsx`. Wired to `globalSearch` action.
*   **Status**: Task 2.4 Complete.

### 2026-02-06 [Backend - Aider] - Phase 2 Kanban Upgrade
**Feature**: dnd-kit Kanban Board
*   **UI**: Upgraded `components/crm/kanban-board.tsx` to use `@dnd-kit/core` and `@dnd-kit/sortable`.
*   **UX**: Added drag overlay, touch support, and smooth animations.
*   **Status**: Task 2.1 Complete.

### 2026-02-06 [Frontend - Antigravity] - Core CRM Hub
**Feature**: Visual Pipeline & Chat Mode
*   **Layout Toggle**: Implemented Context-based toggle (`Chat` vs `Advanced/CRM` modes). `Chat` mode maximizes the Assistant pane. `Advanced` mode shows the Kanban board.
*   **Kanban Board**: Created visual pipeline with 5 stages (New, Contacted, Negotiation, Won, Lost) and `framer-motion` drag physics.
*   **Deal Logic**: Added "Stale" (Amber > 7d) and "Rotting" (Red > 14d) visual alerts to Deal Cards.
*   **Activity Feed**: Created `ActivityFeed` component to visualize the "Magic Data Entry" events.

### 2026-02-07 [Frontend - Antigravity] - Tradie Stream
**Feature**: Pocket Estimator
*   **Estimator UI**: Built `app/dashboard/estimator` for quick quote generation.
*   **Logic**: wired to `generateQuote` action. Clientside line-item math.
*   **Note**: PDF download button is disabled (waiting on backend).

### 2026-02-07 [Frontend - Antigravity] - Core Hub Polish
**Feature**: Rotting Deal Widget
*   **DealHealthWidget**: Dashboard summary of Total Value vs Risk.
*   **Logic**: Counts Stale (>7d) and Rotting (>14d) deals.
*   **UI**: Red/Amber alert cards.

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
4.  Wire `AssistantPane` chat input to `processChat(message, workspaceId)`.
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
| **Frontend ↔ Backend Wiring** | **PHASE 1 & 2 COMPLETE — Wired to root actions** |

---

### PHASE 1 — Wire Up (Make What Exists Real)
**Priority: CRITICAL — everything else depends on this**
**Do first. Both agents work in parallel.**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 1.1 | Replace `MOCK_DEALS` with `getDeals()` | **Antigravity/Aider** | In `app/dashboard/page.tsx`, call `getDeals(workspaceId)`. Returns `DealView[]` matching existing `Deal` type exactly (id, title, company, value, stage as lowercase, lastActivityDate, contactName, contactAvatar). | ✅ |
| 1.2 | Replace mock activities with `getActivities()` | **Antigravity/Aider** | In `components/crm/activity-feed.tsx`, replace hardcoded array with `getActivities({ workspaceId })`. Already returns relative time strings. | ✅ |
| 1.3 | Wire chat input to `processChat()` | **Antigravity/Aider** | In `components/core/assistant-pane.tsx`, call `processChat(message, workspaceId)`. Returns `{ response: string, data?: any }`. Display `response` as assistant message. | ✅ |
| 1.4 | Wire Kanban drag-drop to `updateDealStage()` | **Antigravity/Aider** | On drop, call `updateDealStage(dealId, newStage)` where newStage is lowercase (`"new"`, `"contacted"`, `"negotiation"`, `"won"`, `"lost"`). Backend maps to Prisma enum. | ✅ |
| 1.5 | Supabase setup + schema push | **Backend** | `.env.example` with `DATABASE_URL` + `DIRECT_URL`. Prisma configured with `directUrl` for Supabase pooling. | ✅ |
| 1.6 | Workspace/auth context | **Backend** | `actions/workspace-actions.ts`: `getOrCreateWorkspace()`, `getWorkspace()`, `updateWorkspace()`, `listWorkspaces()`. Workspace model has `ownerId` for auth binding. | ✅ |

---

### PHASE 2 — Core Feature Gaps
**Priority: HIGH — needed for MVP**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 2.1 | Real drag-and-drop (dnd-kit) | **Aider** | Install `@dnd-kit/core` + `@dnd-kit/sortable`. Replace framer-motion drag with real reorder/drop persistence. On drop, call `updateDealStage()`. | ✅ |
| 2.2 | Contact detail page + timeline | **Antigravity/Aider** | New route `app/contacts/[id]/page.tsx`. Show contact info, all deals, all activities in a unified timeline. Backend already has `getActivities({ contactId })`. | ✅ |
| 2.3 | `days_in_stage` tracking | **Backend** | `stageChangedAt` field on Deal. `updateDealStage()` sets it. `getDeals()` returns computed `daysInStage`. | ✅ |
| 2.4 | CMD+K command palette | **Aider** | Install `cmdk`. Wire to `searchContacts()` + `fuzzySearch()`. Show deals, contacts, commands in palette. | ✅ |
| 2.5 | Smart contact deduplication | **Backend** | `actions/dedup-actions.ts`: `findDuplicateContacts()` + `mergeContacts()`. Matches email, phone, fuzzy name (>85%). Chat: "find duplicates". | ✅ |
| 2.6 | Template library | **Backend** | `MessageTemplate` model + `actions/template-actions.ts`: CRUD + `renderTemplate()` with `{{var}}` syntax. 7 presets seeded. Chat: "show templates", "use template X for Y". | ✅ |

---

### PHASE 3 — Tradie Stream
**Priority: MEDIUM — vertical differentiation**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 3.1 | PDF quote/invoice generation | **Backend** | `generateQuotePDF(invoiceId)` returns `QuotePDFData` + printable HTML with GST, line items, contact details. Frontend uses `window.print()` or any PDF lib. | ✅ |
| 3.2 | Pocket Estimator UI | **Antigravity** | Form: material + quantity + rate → line items. "Generate Quote" button calls `generateQuote()`. Preview total with GST. | ✅ |
| 3.3 | Map / geo-scheduling view | **Antigravity** | Integrate Mapbox or Google Maps. Plot deals by address. Route optimization for today's jobs. | 🚧 |
| 3.4 | Map geocoding backend | **Backend** | `address`, `latitude`, `longitude` on Deal. `actions/geo-actions.ts`: `geocodeDeal()`, `getDealsWithLocation()`, `batchGeocode()`. Uses Nominatim free API. | ✅ |
| 3.5 | Voice-to-invoice | **Antigravity** | Web Speech API (`SpeechRecognition`). Transcribe → feed to `processChat()` which handles "new deal" and "generate quote" commands. | ✅ |
| 3.6 | Offline support | **Antigravity** | Service worker for offline cache. Queue mutations in IndexedDB. Sync when online. | ⬜ |
| 3.7 | Xero/MYOB accounting sync | **Backend** | `actions/accounting-actions.ts`: `syncInvoiceToXero()`, `syncInvoiceToMYOB()`, `getInvoiceSyncStatus()`. Stub — ready for OAuth integration. | ✅ |

---

### PHASE 4 — Agent Stream
**Priority: MEDIUM — vertical differentiation**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 4.1 | Open House Kiosk UI | **Antigravity** | Tablet-optimized form: name, email, phone, buyer status. Calls `logOpenHouseAttendee()`. Show QR to self-register. | ✅ |
| 4.2 | QR code generation | **Backend** | `lib/qrcode.ts`: pure SVG QR generator (no deps). `generateOpenHouseQR(dealId)` in agent-actions returns SVG + data URL. | ✅ |
| 4.3 | Buyer matchmaker UI | **Antigravity** | When viewing listing deal, show "Matched Buyers" panel. Call `findMatches(listingId)`. Display match score, budget fit, bedroom fit. | ✅ |
| 4.4 | Portal integration stubs | **Backend** | `actions/portal-actions.ts`: `importFromPortal(url, workspaceId)`. Detects REA/Domain, creates Deal + Contact, stores portal metadata. | ✅ |
| 4.5 | Rotting deal alerts widget | **Antigravity** | Dashboard widget showing stale + rotting counts. Click through to filtered Kanban. Backend `getDeals()` already returns health. | ✅ |

---

### PHASE 5 — Communications & Integrations
**Priority: LOWER — post-MVP polish**

| # | Task | Owner | Details | Status |
|---|------|-------|---------|--------|
| 5.1 | SMS/WhatsApp via Twilio | **Backend** | `actions/messaging-actions.ts`: `sendSMS()`, `sendWhatsApp()`, `sendBulkSMS()`. Uses Twilio REST API. Auto-logs activities. | ✅ |
| 5.2 | Unified messaging inbox UI | **Antigravity** | New `app/inbox/page.tsx`. SMS/WhatsApp/email threads grouped by contact. Chat bubble format. | ✅ |
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
| Antigravity | 4 | 3 | 4 | 3 | 1 | **15** | **14 ✅** |

---

# NEW MASTER SPECIFICATION: ASSISTANTBOT PIVOT

## 1. CORE PHILOSOPHY
The app is a **Chatbot-Driven interface/assistant** that manages a CRM in the background.
- **Default View ("Simple Mode"):** User interacts *only* with the Chatbot (Natural Language -> DB Actions).
- **Optional View ("Advanced Mode"):** User toggles a switch to reveal standard CRM tables/dashboards.

## 2. FRONTEND TASKS (For Antigravity)

### A. Navigation & Landing Page Refactor
- **Target File:** `Header.tsx` / `Navbar.js`
- **Action:** Replace the "Pricing" link with an "Industries" Dropdown.
- **Dropdown Items:**
  1. **Trades:** Links to `/industries/trades` (Features: Job scheduling, quoting, invoicing).
  2. **Real Estate:** Links to `/industries/real-estate` (Features: Property listings, tenant management, open house scheduling).
- **Content:** Update the Hero section to emphasize "The Assistant that runs your business," not just "A CRM."

### B. Authentication UI
- **Target File:** `Login.tsx` / `Auth.js`
- **Action:**
  - **REMOVE:** GitHub Login button (Dev-only feature).
  - **KEEP:** Google Sign-In and Email/Password.
  - **style:** Ensure the login form is clean and professional, targeting non-tech users (Tradies/Agents).

### C. The "Zero-Dashboard" Onboarding Flow
**Current Flow:** Signup -> Dashboard (Stop this).
**New Flow:**
1. **Signup:** User creates account.
2. **Setup Interview (Chatbot):**
   - Redirect new users to `/setup`.
   - **UI:** A simple chat interface.
   - **Bot Logic:** Ask "What is your business name?", "Are you in Trades or Real Estate?", "Where are you located?".
   - **Action:** Save these responses to the `UserProfile` table.
3. **Tutorial (Split-Screen):**
   - Redirect to `/tutorial` after setup.
   - **Left Pane:** Highlights specific app features (e.g., "Create a Quote").
   - **Right Pane:** Shows the *exact prompt* to type into the Assistant to trigger that feature.

## 3. BACKEND TASKS (For Aider/Claude Code)

### A. Database Schema Updates
- **Table:** `users` or `profiles`
  - Add column: `industry_type` (ENUM: 'TRADES', 'REAL_ESTATE', 'OTHER').
  - Add column: `setup_complete` (BOOLEAN, default `false`).
  - Add column: `mode_preference` (ENUM: 'SIMPLE', 'ADVANCED', default 'SIMPLE').

### D. View Restriction (Flagged for Post-MVP)
- **Requirement:** Users selecting "TRADES" should *only* see Tradie features. Users selecting "REAL_ESTATE" should *only* see Agent features.
- **Current State:** Allow switching for testing purposes (single account can see both).
- **Future State:** Enforce strict view isolation based on `industry_type`.

### B. "Assistant" Logic Engine
- **Input Processing:** The chatbot must accept natural language (e.g., "Add a job for 123 Main St tomorrow") and map it to database inserts (`INSERT INTO jobs...`).
- **Context Awareness:**
  - If `industry_type` = 'REAL_ESTATE', "Add listing" maps to the *Properties* module.
  - If `industry_type` = 'TRADES', "Add job" maps to the *Jobs/WorkOrders* module.

### C. Auth Security
- **Hardening:** Ensure removing the GitHub frontend button is matched by disabling the GitHub OAuth strategy in the backend config to prevent direct API access.
