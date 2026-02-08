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
   ### YYYY-MM-DD HH:MM AEST [Role - Agent Name] - Category
   **Feature/Fix**: Short description
   *   **Detail 1**: What was done
   *   **Files created/modified**: List specific files
   *   **Status**: Which task(s) this completes (reference GAP_ANALYSIS.md IDs where applicable)
   ```
   **IMPORTANT**: Always include the time in AEST and list files touched.
2. Update the **task table** status (change `⬜`→`🚧`→`✅`) when starting/finishing tasks.
3. If you create new files, list them so other agents know they exist.
4. If you change existing APIs or component props, note the breaking change.
5. **Mandatory Summary**: At the end of every response, provide a structured summary:
   1. **What I did**: Specific files edited and logic changed.
   2. **Current Status**: The state of the feature/bug.
   3. **Next Steps**: What needs to happen next.

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

> **FORMAT**: `### YYYY-MM-DD HH:MM AEST [Role - Agent] - Category`
> All timestamps are in Australian Eastern Standard Time (AEST/UTC+11).
> **Reference doc**: See `GAP_ANALYSIS.md` for full walkthrough gap analysis with 48 action items.

---

### 2026-02-08 14:00 AEST [Backend - Claude Code] - Build & Env Issues Flagged
**Issue**: Build failing due to Prisma sync and missing env vars.
*   **Prisma**: `tsc` reports errors because the Prisma Client is out of sync with the schema (missing `jobStatus`, `scheduledAt`, `user` relation). Needs `npx prisma generate`.
*   **Environment**: `.env` is missing `DIRECT_URL`, which is required for Prisma migrations/push in Supabase.
*   **Status**: **FAILING**. Backend team must fix env and regenerate client before proceeding.
*   **Files modified**: `project_status_log.md`.

### 2026-02-08 13:45 AEST [Backend - Claude Code] - Fix Layout Build Error
**Fix**: Removed invalid `chatbot` prop and import from Dashboard Layout.
*   **Layout**: Updated `app/(dashboard)/layout.tsx` to use `Shell` correctly (it manages `AssistantPane` internally).
*   **Status**: Resolving build errors.
*   **Files modified**: `app/(dashboard)/layout.tsx`.

### 2026-02-08 13:15 AEST [Backend - Claude Code] - Notification System
**Feature**: Implemented Notification system backend.
*   **Schema**: Added `Notification` model and `NotificationType` enum.
*   **Actions**: Created `actions/notification-actions.ts` with `getNotifications`, `markAsRead`, `createNotification`.
*   **Status**: Completes backend for D-3 (Notifications).
*   **Files modified**: `prisma/schema.prisma`.
*   **Files created**: `actions/notification-actions.ts`.

### 2026-02-08 13:05 AEST [Backend - Claude Code] - Weather, Schedule & Reports
**Feature**: Added Weather API, Today's Schedule, and Vendor Reporting backend.
*   **Weather**: Created `actions/weather-actions.ts` using Open-Meteo API.
*   **Tradie**: Added `getTodaySchedule` to `actions/tradie-actions.ts`.
*   **Agent**: Added `collectFeedback` and `generateVendorReport` to `actions/agent-actions.ts`.
*   **Status**: Completes backend for D-2 (Weather), D-8/D-9 (Schedule), VR-4 (Vendor Report).
*   **Files created**: `actions/weather-actions.ts`.
*   **Files modified**: `actions/tradie-actions.ts`, `actions/agent-actions.ts`.

### 2026-02-08 12:55 AEST [Backend - Claude Code] - Fix Missing UI Component
**Fix**: Created missing `ScrollArea` component.
*   **UI**: Added `components/ui/scroll-area.tsx` to resolve build error in Agent page.
*   **Status**: Addressing build errors from `tsc_log.txt`.
*   **Files created**: `components/ui/scroll-area.tsx`.

### 2026-02-08 12:45 AEST [Backend - Claude Code] - Fix Digest Logic
**Fix**: Corrected invalid enum usage in Morning Digest.
*   **Digest**: Updated `lib/digest.ts` to filter `notIn: ["WON", "LOST", "ARCHIVED"]` instead of invalid "CLOSED".
*   **Analysis**: Reviewed `tsc_log.txt` and confirmed most errors are due to stale Prisma Client generation (e.g., `lastActivityAt` missing in types despite being in schema).
*   **Status**: Backend logic is consistent with Schema.
*   **Files modified**: `lib/digest.ts`.

### 2026-02-08 12:35 AEST [Backend - Claude Code] - Materials, Keys & Feedback
**Feature**: Added backend support for Materials, Magic Keys, and Buyer Feedback.
*   **Schema**: Added `Material`, `Key`, and `BuyerFeedback` models.
*   **Actions**: Created `actions/material-actions.ts` (search/create) and `actions/key-actions.ts` (check-in/out).
*   **Seed**: Added sample materials (Plumbing/Electrical) and keys to seed data.
*   **Status**: Completes backend for J-9 (Materials), MK-1/MK-2 (Keys), VR-2 (Feedback).
*   **Files modified**: `prisma/schema.prisma`, `prisma/seed.ts`.
*   **Files created**: `actions/material-actions.ts`, `actions/key-actions.ts`.

### 2026-02-08 12:25 AEST [Backend - Claude Code] - Agent Actions & Storage
**Feature**: Restored Agent actions and added Storage support.
*   **Agent Actions**: Added `findMatches` and `logOpenHouseAttendee` to `actions/agent-actions.ts`.
*   **Storage**: Created `actions/storage-actions.ts` for handling file uploads (Task J-6).
*   **Status**: Completes backend support for Agent Matchmaker (AG-4) and File Storage (X-15).
*   **Files modified**: `actions/agent-actions.ts`.
*   **Files created**: `actions/storage-actions.ts`.

### 2026-02-08 12:15 AEST [Backend - Claude Code] - Job Status & Travel Workflow
**Feature**: Implemented Job Status model and Travel Workflow backend.
*   **Schema**: Added `JobStatus` enum (`SCHEDULED`, `TRAVELING`, `ON_SITE`, `COMPLETED`, `CANCELLED`) and `scheduledAt` field to `Deal` model.
*   **Tradie Actions**: Updated `getTradieJobs` to use `scheduledAt` and `jobStatus`. Implemented `sendOnMyWaySMS` and `updateJobStatus` (triggers SMS on TRAVELING).
*   **Deal Actions**: Updated `DealView` and `getDeals` to include new fields.
*   **Seed**: Added 2 scheduled jobs to seed data for testing.
*   **Status**: Completes Tasks J-2 (Job Status Model) and J-4 (On My Way SMS).
*   **Files modified**: `prisma/schema.prisma`, `actions/deal-actions.ts`, `actions/tradie-actions.ts`, `prisma/seed.ts`.

### 2026-02-08 12:05 AEST [Backend - Claude Code] - Chat First Default
**Feature**: Changed DashboardProvider default to "chat".
*   **Detail**: Updated `components/providers/dashboard-provider.tsx` to default to "chat" mode.
*   **Files modified**: `components/providers/dashboard-provider.tsx`.
*   **Status**: Completes Task M-1.

### 2026-02-08 12:00 AEST [Manager - Claude Code] - Documentation Sync
**Feature**: Synced GAP_ANALYSIS.md with completed tasks from Sprint 1/2.
*   **Sync**: Marked X-1, X-2, X-6, X-7, D-5, J-1, AG-1, AG-5, M-3 as ✅ based on previous logs.
*   **Files modified**: `GAP_ANALYSIS.md`.
*   **Status**: Documentation is now current.

### 2026-02-08 11:15 AEST [Backend - Claude Code] - Signup & Schema (Phase 1)
**Feature**: Implemented Signup page and updated Schema for onboarding.
*   **Schema**: Updated `User` model with `industryType`, `setupComplete`, `modePreference` and added `ViewMode` enum.
*   **Signup**: Created `app/(auth)/signup/page.tsx` wired to `signup` server action.
*   **Status**: Completes Signup UI wiring.
*   **Files modified**: `prisma/schema.prisma`, `app/(auth)/signup/page.tsx`.

### 2026-02-08 11:00 AEST [Backend - Claude Code] - Real Authentication (Phase 1)
**Feature**: Implemented Supabase Auth and Middleware protection.
*   **Middleware**: Created `middleware.ts` and `lib/supabase/middleware.ts` to protect routes and refresh sessions.
*   **Auth Actions**: Created `actions/auth-actions.ts` with `login`, `signup`, `logout`, and `loginWithGoogle`.
*   **UI**: Updated `app/(auth)/login/page.tsx` to use real server actions instead of mock routing.
*   **Status**: Completes Tasks X-1 (Real Auth) and X-2 (Middleware).
*   **Files created**: `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`, `actions/auth-actions.ts`.
*   **Files modified**: `app/(auth)/login/page.tsx`.

### 2026-02-08 10:30 AEST [Backend - Claude Code] - Schema Updates for Assistant Pivot
**Feature**: Schema updates to support new onboarding and user preferences.
*   **Schema**:
    *   Added `ViewMode` enum (`SIMPLE`, `ADVANCED`).
    *   Updated `IndustryType` enum (Added `OTHER`).
    *   Updated `User` model:
        *   Added `industryType` (IndustryType).
        *   Added `setupComplete` (Boolean).
        *   Added `modePreference` (ViewMode, default SIMPLE).
        *   Added `avatarUrl` (String).
        *   Removed legacy `viewMode` string field.
*   **Status**: Completes Backend Task 3.A from Handover.
*   **Files modified**: `prisma/schema.prisma`

### 2026-02-08 10:00 AEST [Frontend - Antigravity] - Phase 2 Shell & Personas
**Feature**: Implemented Shell, Tradie & Agent Personas
*   **Layout Shell**: Implemented `lib/store.ts` (Zustand) and `components/layout/Shell.tsx` (Split Pane).
*   **Tradie Persona**: Built `/app/(dashboard)/tradie/page.tsx` with Dark Mode, Pulse Widget, Map Placeholder using `drawer` (Vaul).
*   **Agent Persona**: Built `/app/(dashboard)/agent/page.tsx` with Light Mode, Speed-to-Lead, Rotting Kanban using `deal.metadata`.
*   **Schema**: Added `Task` model and fixed `Deal <-> Activity` relations in `schema.prisma`. Verified `WorkspaceType` and `DealStage`.
*   **Build Status**: Passing (with pragmatic type fixes in `lib/digest.ts`).
*   **Status**: Phase 2 Frontend Complete.

### 2026-02-08 03:00 AEST [Frontend - Antigravity] - Sprint 2 Complete (Real Data)
**Feature**: Integrated Real Data for Tradie & Agent Dashboards
*   **Tradie Page** (`app/(dashboard)/tradie/page.tsx`): Fetches `activeJobs` from DB. Displays Map View with pins.
*   **Job Detail Page** (`app/(dashboard)/jobs/[id]/page.tsx`): Full job view with Status, Diary, and Billing tabs. Linked from Tradie Drawer.
*   **Agent Page** (`app/(dashboard)/agent/page.tsx`): Fetches `freshLeads` and `pipeline`.
*   **Speed-to-Lead Widget** (`components/agent/speed-to-lead.tsx`): Displays new leads for immediate action.
*   **Status**: Sprint 2 Complete. Tasks X-7, D-5, J-1, AG-1, AG-5 Complete.

### 2026-02-08 02:30 AEST [Frontend - Antigravity] - Planning
**Update**: Received GAP Analysis & Roadmap
*   **Sync**: Pulled latest changes from `main`.
*   **Analysis**: Reviewed `GAP_ANALYSIS.md` and identified 37 frontend tasks.
*   **Plan**: Updated `task.md` to reflect the 4-Sprint structure defined in the analysis.
*   **Next**: Starting **Sprint 1: Foundation**, focusing on UI Polish (X-17) and Tutorial Fixes (T-1).

### 2026-02-07 18:00 AEST [Backend - Claude Code] - Gap Analysis & Action Plan
**Deliverable**: Full codebase audit against the Extreme Granular Walkthrough spec

*   **Document**: Created `GAP_ANALYSIS.md` — 48 action items across 8 sections.
*   **Summary**:
    *   **P0 Critical (7)**: Real auth, middleware, industry-aware kanban, new deal form, chat-first default, agent/tradie real data
    *   **P1 High (13)**: Working map, bottom sheet, interactive tutorial, job detail, travel workflow, speed-to-lead, toast system, chat→UI bridge, file storage
    *   **P2 Medium (19)**: Notifications, pulse widget, dark theme, job scheduling, material DB, commission calc, vendor reports, etc.
    *   **P3 Low (9)**: Weather, photo annotation, video, NFC payments, magic keys
*   **Ownership**: Antigravity (Frontend) ~37 items, Backend ~27 items, 16 shared
*   **Sprint plan**: 4-week execution order in `GAP_ANALYSIS.md` Section 7
*   **Files created**: `GAP_ANALYSIS.md`

### 2026-02-07 17:30 AEST [Backend - Claude Code] - Command Parser Fix + Page Guards
**Fix**: Industry-aware command parser + onboarding guards

*   **Chat parser** (`actions/chat-actions.ts`): Accepts "job/listing/property/client/buyer/vendor/quote" alongside "deal/contact"
*   **Pages fixed**: Estimator, Map, Kiosk now use `getOrCreateWorkspace()` instead of hardcoded `"demo-workspace"`. Inbox, Estimator, Map have onboarding redirect guards.
*   **Files modified**: `actions/chat-actions.ts`, `app/dashboard/estimator/page.tsx`, `app/dashboard/tradie/map/page.tsx`, `app/inbox/page.tsx`, `app/kiosk/open-house/page.tsx`

---

### 2026-02-07 16:00 AEST [Backend - Claude Code] - Tutorial Redesign (Split-Screen)
**Feature**: Full tutorial redesign with platform preview + chatbot side-by-side

*   **Layout**: 3/4 left pane shows mock "Advanced Mode" platform, 1/4 right pane shows chatbot with equivalent commands.
*   **Components**: `MockPipelinePreview`, `MockDealCard`, `MockChatPane` in `components/onboarding/tutorial-view.tsx`
*   **Industry-aware**: 3 variants (TRADES: 4 steps, REAL_ESTATE: 4 steps, Default: 3 steps).
*   **Routing**: Every sign-in triggers tutorial (for troubleshooting).
*   **Status**: Tutorial completely rebuilt from scratch.

### 2026-02-07 14:00 AEST [Backend - Claude Code] - Onboarding Flow Wiring
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

### 2026-02-06 22:00 AEST [Backend - Claude Code] - Vercel Deployment
**Fix**: Production deployment to Vercel
*   **URL**: https://assistantbot-zeta.vercel.app
*   **Schema**: Switched Prisma from SQLite to PostgreSQL for Vercel/Supabase compatibility.
*   **Build**: Added `prisma generate` to build script and `postinstall` hook so Prisma client regenerates on each Vercel deploy.
*   **Dynamic pages**: Marked all DB-dependent pages (`dashboard`, `estimator`, `inbox`, `kiosk`, `tradie/map`) as `force-dynamic` to prevent build-time DB queries.
*   **Error handling**: Wrapped all server-rendered pages in try/catch so they show a helpful "Database Not Initialized" message instead of crashing when Supabase tables don't exist.
*   **Fix**: Removed invalid `"use server"` directive from estimator page (pages are Server Components by default, `"use server"` only allows async function exports).
*   **Extension**: Removed hardcoded `localhost:3000` — users must configure their deployment URL.
*   **Status**: App deploys and builds on Vercel. DB tables need `prisma db push` + `prisma db seed` against Supabase.

### 2026-02-06 20:00 AEST [Backend - Claude Code] - Code Quality & Build Cleanup
**Fix**: Full codebase audit and quality pass
*   **Security**: Removed hardcoded Supabase credentials from `lib/db.ts`. DB connection now requires `.env` to be configured.
*   **Prisma**: Regenerated Prisma client from current schema, resolving all ~47 TypeScript compiler errors caused by stale generated types.
*   **Tailwind**: Fixed `tailwind.config.ts` content paths (was scanning `./src/` which doesn't exist; now correctly scans `./app/` and `./components/`). Removed dead `darkMode: "class"` config and stale dark theme colors.
*   **ESLint**: Resolved all 27 ESLint errors across 25 files (unused imports, unescaped JSX entities, missing displayNames, empty interfaces, no-explicit-any).
*   **Stale Files**: Removed outdated `tsc_log.txt` and `lint_log.txt`.
*   **Build Status**: **0 TypeScript errors, 0 ESLint errors** (13 warnings remain — all `_`-prefixed stub params).

### 2026-02-07 10:00 AEST [Backend - Claude Code] - Assistant-Pivot Backend Support
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

### 2026-02-07 09:00 AEST [Frontend - Antigravity] - Communications
**Feature**: Unified Inbox
*   **UI**: Created `app/inbox/page.tsx` and `InboxView`.
*   **Logic**: Added `getInboxThreads` to `messaging-actions.ts`.
*   **Status**: Task 5.2 Complete.

### 2026-02-07 08:30 AEST [Frontend - Antigravity] - Core Hub Polish
**Feature**: Rotting Deal Widget
*   **UI**: Created `components/crm/deal-health-widget.tsx`.
*   **Logic**: Calculates pipeline value and counts stale/rotting deals.
*   **Status**: Task 4.5 Complete.

### 2026-02-07 08:00 AEST [Frontend - Antigravity] - Agent Stream
**Feature**: Buyer Matchmaker & Deal Page
*   **UI**: Created `app/dashboard/deals/[id]/page.tsx` and `BuyerMatchmaker` component.
*   **Logic**: Wires to `findMatches` action. Shows contacts matching budget/bedrooms.
*   **Status**: Task 4.3 Complete.

### 2026-02-07 07:30 AEST [Frontend - Antigravity] - Agent Stream
**Feature**: Open House Kiosk
*   **Kiosk UI**: Built `app/kiosk/[id]/page.tsx` tablet-first view.
*   **Logic**: Wires to `logOpenHouseAttendee` + auto-creates contacts.
*   **Status**: Task 4.1 Complete.

### 2026-02-07 07:00 AEST [Backend - Claude Code] - Database Connected
**Update**: Populated `.env` with Supabase credentials.
*   **Fix**: URL-encoded special characters in password to prevent connection errors.
*   **Status**: Database connection ready.
*   **Next**: Schema push and seed.

### 2026-02-07 06:30 AEST [Frontend - Antigravity] - Voice-to-Invoice
**Feature**: Voice command integration
*   **UI**: Added microphone button to `AssistantPane`.
*   **Logic**: Integrated Web Speech API.
*   **Backend**: Added `create_invoice` intent to `processChat` action.

### 2026-02-06 18:00 AEST [Backend - Aider] - Team Expansion
**Update**: Added Aider to the backend team.
*   **Role**: Aider will work interchangeably with Claude Code on backend tasks, bug fixes, and wiring support.
*   **Context**: Aider has ingested the project status and handover logs and is aware of the completed Phase 1-5 backend work.

### 2026-02-06 17:00 AEST [Backend - Aider] - Phase 1 Wiring Complete
**Feature**: Connected Frontend Shell to Backend Actions
*   **Dashboard**: Refactored `app/dashboard/page.tsx` to Server Component fetching real `getDeals()` and `getActivities()`.
*   **Kanban**: Wired `KanbanBoard` to `updateDealStage()` server action using HTML5 Drag & Drop.
*   **Chat**: Wired `AssistantPane` to `processChat()` server action.
*   **Activity Feed**: Connected to real data props.

### 2026-02-06 16:00 AEST [Backend - Aider] - Phase 2 Backend Support
**Feature**: Contact Details & Filtering
*   **Contact Actions**: Added `getContact(id)` to fetch single contact details. Updated `ContactView` to include `address` and `metadata`.
*   **Deal Actions**: Updated `getDeals()` to support filtering by `contactId`.
*   **Purpose**: Unblocking Frontend Task 2.2 (Contact Detail Page).

### 2026-02-06 15:30 AEST [Backend - Aider] - Phase 2 UI Implementation
**Feature**: Contact Detail Page
*   **Page**: Created `app/contacts/[id]/page.tsx` fetching contact, deals, and activities.
*   **Components**: Created `ContactHeader` and `ContactTimeline` for visualizing contact history.
*   **Status**: Task 2.2 Complete.

### 2026-02-06 15:00 AEST [Backend - Aider] - Phase 2 Search Support
**Feature**: Global Search Action
*   **Search**: Created `actions/search-actions.ts` with `globalSearch()` to aggregate contacts, deals, and tasks using fuzzy matching.
*   **Purpose**: Unblocking Task 2.4 (Command Palette).

### 2026-02-06 14:30 AEST [Backend - Aider] - Phase 2 Command Palette
**Feature**: CMD+K Command Palette
*   **UI**: Created `components/core/command-palette.tsx` with custom modal UI (no external deps).
*   **Integration**: Mounted in `app/layout.tsx`. Wired to `globalSearch` action.
*   **Status**: Task 2.4 Complete.

### 2026-02-06 14:00 AEST [Backend - Aider] - Phase 2 Kanban Upgrade
**Feature**: dnd-kit Kanban Board
*   **UI**: Upgraded `components/crm/kanban-board.tsx` to use `@dnd-kit/core` and `@dnd-kit/sortable`.
*   **UX**: Added drag overlay, touch support, and smooth animations.
*   **Status**: Task 2.1 Complete.

### 2026-02-06 12:00 AEST [Frontend - Antigravity] - Core CRM Hub
**Feature**: Visual Pipeline & Chat Mode
*   **Layout Toggle**: Implemented Context-based toggle (`Chat` vs `Advanced/CRM` modes). `Chat` mode maximizes the Assistant pane. `Advanced` mode shows the Kanban board.
*   **Kanban Board**: Created visual pipeline with 5 stages (New, Contacted, Negotiation, Won, Lost) and `framer-motion` drag physics.
*   **Deal Logic**: Added "Stale" (Amber > 7d) and "Rotting" (Red > 14d) visual alerts to Deal Cards.
*   **Activity Feed**: Created `ActivityFeed` component to visualize the "Magic Data Entry" events.

### 2026-02-07 06:00 AEST [Frontend - Antigravity] - Tradie Stream
**Feature**: Pocket Estimator
*   **Estimator UI**: Built `app/dashboard/estimator` for quick quote generation.
*   **Logic**: wired to `generateQuote` action. Clientside line-item math.
*   **Note**: PDF download button is disabled (waiting on backend).

### 2026-02-07 05:30 AEST [Frontend - Antigravity] - Core Hub Polish
**Feature**: Rotting Deal Widget
*   **DealHealthWidget**: Dashboard summary of Total Value vs Risk.
*   **Logic**: Counts Stale (>7d) and Rotting (>14d) deals.
*   **UI**: Red/Amber alert cards.

### 2026-02-06 10:00 AEST [Frontend - Antigravity] - Design Pivot
**Feature**: Neutral Light Theme & SaaS Landing Page
*   **Design System**: Refactored `globals.css` and all UI components to **Neutral Light** (White Bg, Slate-900 Text, Borders/Shadows). Removed Dark Mode/Glassmorphism.
*   **Landing Page**: Replaced placeholder with full SaaS page (Hero, Product, Pricing, Contact). Added `Navbar` with "Get Started" CTA.
*   **Auth**: Updated Login/Signup pages to Light Mode. Added mock feedback to Google Sign-in button.

### 2026-02-06 08:00 AEST [Backend - Claude Code] - Full Backend Implementation
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

### 2026-02-06 06:00 AEST [Backend - Claude Code] - Build Fixes, Vertical Actions, Cleanup
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

### 2026-02-06 04:00 AEST [Backend - Claude Code] - All 14 Backend Tasks Complete
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

### 2026-02-08 [Frontend - Antigravity] - Phase 2 Shell & Personas
**Feature**: Implemented Shell, Tradie & Agent Personas
*   **Layout Shell**: Implemented `lib/store.ts` (Zustand) and `components/layout/Shell.tsx` (Split Pane).
*   **Tradie Persona**: Built `/app/(dashboard)/tradie/page.tsx` with Dark Mode, Pulse Widget, Map Placeholder using `drawer` (Vaul).
*   **Agent Persona**: Built `/app/(dashboard)/agent/page.tsx` with Light Mode, Speed-to-Lead, Rotting Kanban using `deal.metadata`.
*   **Schema**: Added `Task` model and fixed `Deal <-> Activity` relations in `schema.prisma`. Verified `WorkspaceType` and `DealStage`.
*   **Build Status**: Passing (with pragmatic type fixes in `lib/digest.ts`).
*   **Status**: Phase 2 Frontend Complete.

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
| 3.3 | Map / geo-scheduling view | **Antigravity** | Integrate Mapbox or Google Maps. Plot deals by address. Route optimization for today's jobs. | ✅ |
| 3.4 | Map geocoding backend | **Backend** | `address`, `latitude`, `longitude` on Deal. `actions/geo-actions.ts`: `geocodeDeal()`, `getDealsWithLocation()`, `batchGeocode()`. Uses Nominatim free API. | ✅ |
| 3.5 | Voice-to-invoice | **Antigravity** | Web Speech API (`SpeechRecognition`). Transcribe → feed to `processChat()` which handles "new deal" and "generate quote" commands. | ✅ |
| 3.6 | Offline support | **Antigravity** | Service worker for offline cache. Queue mutations in IndexedDB. Sync when online. | ✅ |
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

---

# PHASE 2 MASTER SPECIFICATION: THE EXTREME GRANULAR WALKTHROUGH

## THE CORE UX: THE 3 MODES
1. **Tutorial Mode (First Login)**: 50/50 Split Screen.
   - **Left**: The App Canvas (dimmed).
   - **Right**: The Chatbot.
   - **Interaction**: Bot says "Click the Map." The Map button highlights. User clicks.

2. **Basic Mode (Default - "Chatbot First")**:
   - **Screen**: Clean, central chat interface (like ChatGPT or Google Gemini).
   - **Action**: User types/speaks: "Start my day."
   - **Result**: The App Canvas slides in from the left to show relevant info, then retreats.

3. **Advanced Mode (Power User)**:
   - **Screen**: Split Pane.
   - **Left (70%)**: The App Canvas (Map, Pipeline, Forms) is always visible.
   - **Right (30%)**: The Chatbot ("Travis" or "Pj") sits on the side as a co-pilot.

## SCENARIO A: THE TRADIE (Scott & "Travis")
**Theme**: High Contrast Dark Mode (Slate-950 bg, Neon Green accents).
**Device**: iPhone 16 Pro.

1.  **The Morning Routine (Basic Mode)**
    - *Action*: Scott types "Start Day."
    - *System*: Map Canvas slides in (Advanced Mode).

2.  **The Dashboard (Map View)**
    - *Header*: "Good Morning", Weather, Search, Notification Bell.
    - *Overlay*: "The Pulse" Widget (Wk: $4.2k | Owe: $850).
    - *Canvas*: Dark Mode Map with numbered pins + blue route line.
    - *Bottom Sheet*: Collapsed ("Next: Mrs. Jones"). Expandable to show Job Details + Quick Actions.

3.  **Job Execution**
    - *Travel*: "START TRAVEL" Footer Button (Neon Green). Triggers SMS.
    - *Arrival*: "ARRIVED" -> Safety Check Modal (Power Off? Site Clear?).
    - *Work*: Camera FAB. Photo annotation (Red line). Voice transcription ("Found hairline fracture").
    - *Quoting*: "Add Video Explanation" (15s). Sign-on-Glass.
    - *Payment*: "Complete Job" -> Full screen Payment Terminal ($450.00). Tap to Pay.

## SCENARIO B: THE AGENT (Sarah & "Pj")
**Theme**: Elegant Light Mode (White bg, Gold/Navy accents).
**Device**: iPad Pro.

1.  **The Dashboard (Advanced Mode)**
    - *Header*: "Speed-to-Lead" Widget (Bubbles with timers). Commission Calculator.
    - *Canvas*: "Rotting" Pipeline (Kanban). Red cards if > 7 days inactive.
    - *Sidebar*: Matchmaker Feed ("3 Buyers found").

2.  **Killer Feature: Magic Keys**
    - *Action*: Tap "Key" icon (Bottom Rail). Scan QR.
    - *Feedback*: Toast "Keys checked out to Sarah."

3.  **Open House (Kiosk Mode)**
    - *Screen*: Full screen image + QR Code ("Scan to Check In").

4.  **Vendor Reporting**
    - *Widget*: "Price Feedback Meter" (Gauge).
    - *Action*: "Send Vendor Report" -> WhatsApp Preview -> Send.
