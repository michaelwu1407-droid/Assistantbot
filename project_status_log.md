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

## 🚨 CRITICAL ISSUE LOG (For Claude Code)

> [!CAUTION]
> **ISSUE**: Vercel Deployment Crash / Database Connection
> **REPORTED BY**: User / Aider
> **DATE**: 2026-02-09 12:00 AEST

**Description**:
The application is crashing on Vercel with a 500 Server Error because `app/dashboard/page.tsx` attempts to initialize Supabase/DB before checking if the environment is valid.
The user explicitly rejected a "graceful fail" patch and wants the root cause fixed.

**Root Cause**:
1. `createClient()` in `lib/supabase/server.ts` throws immediately if env vars are missing.
2. `app/dashboard/page.tsx` calls this in the main render body.
3. Vercel environment variables for Supabase (`NEXT_PUBLIC_SUPABASE_URL`, etc.) are likely missing or incorrect.

**Action Required (Claude)**:
1. Verify Vercel environment variable configuration.
2. Ensure the application handles the "unconfigured" state intelligently without throwing a 500 error, guiding the user to setup.
3. **DO NOT** just wrap in try/catch to hide it (User rejected this). Implement a proper check or setup guard.

---

## 🚀 HANDOVER: REQUIREMENTS FOR FRONTEND TEAM (ANTIGRAVITY)

> [!NOTE]
> **BACKEND COMPLETE**: The backend team (Claude Code) has finished the core wiring for Automations, Notifications, and Job Workflows.
> **NEXT ACTION**: The Frontend team must now build the UI components to expose these features.

### 1. What We Need to Add / What Is Flagged
The Backend is ready, but the UI is missing key components defined in the `GAP_ANALYSIS.md`.

### 2. What I (Claude Code/Backend) Have Done
*   ✅ **Automations**: Wired `evaluateAutomations` to `updateDealStage` and `createContact`. Moving a deal to "CONTACTED" now triggers a task creation.
*   ✅ **Notifications**: Wired `createNotification` to automations. Users now get in-app alerts.
*   ✅ **Job Workflow**: Implemented `updateJobStatus` (Scheduled -> Traveling -> On Site -> Complete) and `sendOnMyWaySMS`.
*   ✅ **Safety Check**: Added `completeSafetyCheck` action for the Tradie workflow.
*   ✅ **Vendor Reports**: Updated `generateVendorReport` to include `vendorGoalPrice` for the frontend gauge chart.
*   ✅ **AI Brain**: Switched to Google Gemini (Flash model) for cost-effective, fast intent parsing.

### 3. What Antigravity (Frontend) Is Required To Do
*   **T-1 Interactive Tutorial**: Build the overlay tutorial that guides users through the *real* dashboard.
*   **J-5 Safety Check**: Build the modal that pops up when a Tradie clicks "Arrived".
*   **AG-2 Commission Calculator**: Build the slider widget for the Agent dashboard.
*   **X-17 UI Polish**: The app looks "barebones". Needs a design pass (gradients, spacing, micro-interactions).

## 🚀 HANDOVER: PHASE 2 REQUIREMENTS (Sprint 8: Wiring & Persistence)

> [!IMPORTANT]
> **NEXT STEPS FOR BACKEND TEAM (AIDER/CLAUDE)**: The Frontend has finished Sprint 7 (Search, Settings, Onboarding). The following actions are needed to turn these "Visual-Only" features into "Persisted" features.

### 1. Global Search (`actions/search-actions.ts`)
*   **Current**: `globalSearch` action is wired but performs a simple fetch + in-memory fuzzy search.
*   **Requirement**: Optimize for scale (e.g., `contains` queries) and ensure `url` property in results maps correctly to deep links (e.g., `/dashboard/deals/[id]`).

### 2. Settings & Profile (`actions/auth-actions.ts`, `actions/workspace-actions.ts`)
*   **Profile**: `profile-form.tsx` is built but has **NO** backend action. Create `updateUserProfile` to handle name/bio/urls updates.
*   **Workspace**: `workspace-form.tsx` is wired to `updateWorkspace`, but needs to fetch initial data to populate form fields (they currently default to placeholders).

### 3. Notifications (`actions/notification-actions.ts`)
*   **Current**: `notification-feed.tsx` fetches from `getNotifications`.
*   **Requirement**: Implement the **creation** logic. System events (e.g., "Job status changed to Traveling") should trigger `createNotification` for the Agent/Admin.

### 4. Onboarding Persistence
*   **Current**: `OnboardingModal` uses `localStorage` to check if a user is new.
*   **Requirement**:
    *   Add `hasOnboarded` boolean to the User/Profile schema.
    *   Create `completeOnboarding(userId)` action.
    *   Frontend will then switch from localStorage to this DB flag.

---

## Change Log

> **FORMAT**: `### YYYY-MM-DD HH:MM AEST [Role - Agent] - Category`
> All timestamps are in Australian Eastern Standard Time (AEST/UTC+11).
> **Reference doc**: See `GAP_ANALYSIS.md` for full walkthrough gap analysis with 48 action items.

---

### 2026-02-09 13:00 AEST [Backend - Aider] - Weather & Kiosk QR
**Feature**: Weather Integration & Kiosk QR Code
*   **Weather**: Updated `components/dashboard/header.tsx` to fetch and display weather using `getWeather` action (Task D-2).
*   **Kiosk**: Updated `app/kiosk/open-house/page.tsx` to generate and display a QR code for visitor self-registration (Task K-2).
*   **Status**: Header now shows live weather. Kiosk page has a scannable QR code.
*   **Files modified**: `components/dashboard/header.tsx`, `app/kiosk/open-house/page.tsx`.

### 2026-02-09 12:45 AEST [Backend - Aider] - Job Billing Logic Fix
**Fix**: Updated Job Billing Tab to create invoices correctly.
*   **Billing**: Switched `JobBillingTab` to use `generateQuote` instead of `createQuoteVariation` so that an invoice is immediately created and visible in the list.
*   **UI**: Improved empty states and added refresh button to billing tab.
*   **Status**: Job Billing flow is now functional (Create Invoice -> View -> Pay).
*   **Files modified**: `components/tradie/job-billing-tab.tsx`.

### 2026-02-09 12:30 AEST [Backend - Aider] - Job Billing & Auth Fixes
**Feature**: Job Billing Tab & Real Auth for Settings
*   **Billing**: Created `components/tradie/job-billing-tab.tsx` to allow adding variations and viewing invoices.
*   **Wiring**: Updated `app/(dashboard)/tradie/jobs/[id]/page.tsx` to pass `dealId` to the billing tab.
*   **Auth**: Updated `app/dashboard/settings/workspace/page.tsx` to use real Supabase user ID instead of hardcoded "demo-user".
*   **Status**: Job Detail page is now fully functional with billing. Workspace settings use real auth.
*   **Files created**: `components/tradie/job-billing-tab.tsx`.
*   **Files modified**: `app/(dashboard)/tradie/jobs/[id]/page.tsx`, `app/dashboard/settings/workspace/page.tsx`.

### 2026-02-09 12:15 AEST [Backend - Aider] - Matchmaker & Pipeline
**Feature**: Agent Matchmaker Feed & Industry Pipeline Config
*   **Matchmaker**: Added `getMatchFeed` to `actions/agent-actions.ts`. Aggregates buyer matches across all active listings (Task AG-4).
*   **Pipeline**: Created `actions/pipeline-actions.ts` to serve industry-specific Kanban stages (Trades vs Real Estate) (Task X-4).
*   **Status**: Backend ready for Matchmaker Sidebar and Dynamic Kanban.
*   **Files modified**: `actions/agent-actions.ts`.
*   **Files created**: `actions/pipeline-actions.ts`.

### 2026-02-09 11:45 AEST [Backend - Aider] - Search & Onboarding Persistence
**Feature**: Optimized Search & User Onboarding
*   **Search**: Refactored `globalSearch` in `actions/search-actions.ts` to use DB `contains` queries instead of in-memory filtering (Task BE-10).
*   **Onboarding**: Added `hasOnboarded` to User schema and `completeUserOnboarding` action (Task BE-4).
*   **Seed**: Expanded `prisma/seed.ts` with realistic trade materials (Task BE-9).
*   **Status**: Search is scalable, Onboarding state is persistent.
*   **Files modified**: `prisma/schema.prisma`, `actions/search-actions.ts`, `actions/user-actions.ts`, `prisma/seed.ts`.

### 2026-02-09 11:30 AEST [Backend - Aider] - Profile & Notifications
**Feature**: User Profile Persistence & Job Notifications
*   **Profile**: Added `bio` and `urls` to User schema. Created `updateUserProfile` action (Task BE-3).
*   **Notifications**: Wired `createNotification` to `updateJobStatus` (Tradie workflow) (Task BE-8).
*   **Status**: Profile settings work, Job completion triggers alerts.
*   **Files modified**: `prisma/schema.prisma`, `actions/user-actions.ts`, `actions/tradie-actions.ts`.

### 2026-02-09 11:00 AEST [Backend - Claude Code] - Build Fix & Status Report

**Fix**: Resolved ALL build-breaking errors. Build now passes (0 TS errors, 25 routes compiled).

**Issues Fixed:**
1. **Middleware export** (`middleware.ts`): Changed `updateSession` → `middleware` named export. Next.js 16 requires `middleware` function export + `config.matcher`. Also added `cookiesToSet` type annotation.
2. **"use server" violation** (`actions/automation-actions.ts`): Removed `export` from `PRESET_AUTOMATIONS` const. "use server" files can only export async functions.
3. **"use server" on page** (`app/dashboard/deals/[id]/page.tsx`): Removed erroneous `"use server"` directive from a page component (pages are NOT server actions).
4. **Missing prop** (`app/dashboard/settings/workspace/page.tsx`): Added `workspaceId` prop by fetching workspace server-side via `getOrCreateWorkspace`.
5. **CameraFAB interface mismatch** (`components/tradie/job-photos-tab.tsx`): Updated to use new `CameraFAB` interface (`dealId` prop instead of `onCapture`). Also fixed caller in `app/(dashboard)/tradie/jobs/[id]/page.tsx`.
6. **Prerender failures**: Added `export const dynamic = "force-dynamic"` to all DB-dependent pages/layouts (5 files) to prevent static generation from hitting the database at build time.

**Files Modified:**
- `middleware.ts` — Fixed export name + added config matcher
- `actions/automation-actions.ts` — Removed const export
- `app/dashboard/deals/[id]/page.tsx` — Removed "use server", added force-dynamic
- `app/dashboard/settings/workspace/page.tsx` — Added workspaceId + force-dynamic
- `app/(dashboard)/layout.tsx` — Added force-dynamic
- `app/dashboard/layout.tsx` — Added force-dynamic
- `app/(dashboard)/tradie/jobs/[id]/page.tsx` — Added force-dynamic + dealId prop
- `components/tradie/job-photos-tab.tsx` — Fixed CameraFAB interface

**Database Issue (CRITICAL for Vercel + Local Dev):**
The Prisma schema was changed to `provider = "postgresql"` but:
- Local `.env` still has `DATABASE_URL="file:./dev.db"` (SQLite) → Prisma crashes
- Vercel deployment has no `DATABASE_URL` configured → build fails during prerender
- **Resolution**: Team needs a Supabase project. Set `DATABASE_URL` and `DIRECT_URL` to Supabase connection strings (see `.env.example`).
- `force-dynamic` on all pages prevents build-time DB calls, so **Vercel build will now pass** even without a DB — but the app will error at runtime until a real PostgreSQL connection string is configured.

**Build Status:** ✅ Passing (0 TS errors, 0 ESLint errors, 25 routes)
