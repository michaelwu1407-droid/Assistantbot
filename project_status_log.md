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

## Change Log

### 2026-02-06 [Frontend - Antigravity]
**Feature**: Initial Scaffolding & Design System
*   **Scaffold**: Initialized Next.js 15 App Router project with TypeScript and ESLint.
*   **Dependencies**: Installed `lucide-react`, `framer-motion`, `clsx`, `tailwind-merge`, `date-fns`, `zod`.
*   **Architecture**: Created "Hub and Spoke" folder structure:
    *   `/app/(auth)`
    *   `/app/(dashboard)` (with layouts for `tradie` and `agent`)
    *   `/components/modules`
*   **Design**: Implemented global styles in `globals.css`:
    *   Background: Slate-950 (`#020617`).
    *   Text: Slate-50 (`#f8fafc`).
    *   Effect: Added noise texture overlay.
*   **Fix**: Resolved Tailwind CSS v4 build error (migrated from `@tailwind` directives to `@import "tailwindcss";`).
*   **Status**: Development server verified running at `http://localhost:3000`.
*   **Repo**: Connected to `https://github.com/michaelwu1407-droid/Assistantbot` and pushed initial scaffolding.
*   **Sync Limit**: Checked for remote changes on `main`. Result: Up to date (Commit `64a41a6`). No external backend changes detected yet.

### 2026-02-06 [Frontend - Antigravity]
**Feature**: Authentication UI & Core Components
*   **Components**: Created `Button` (with spring physics), `Input`, `Card`, `Label`, and `cn` utility.
*   **Pages**: Implemented `(auth)/login` and `(auth)/signup` with glassmorphism layout.
*   **Routing**: Updated Landing Page with links to Auth flow.
*   **Status**: Routes verified. UI ready for backend integration (Supabase Auth).

**Feature**: Dashboard Shell & Modules
*   **Layout**: Created bifurcated Dashboard Layout (Sidebar + Main Canvas + Assistant Pane).
*   **Modules**: Implemented `Tradie` (Map placeholder) and `Agent` (Kiosk placeholder).
*   **Routes**: Moved `app/(dashboard)` to `app/dashboard` to explicitely use the URL path.
*   **Backend Sync**: ATTEMPTED to merge `claude/build-crm-core-hub-dkt`. FAILED (Remote branch not found/checkout failed). Proceeded with Frontend-only build.

### 2026-02-06 [Frontend - Antigravity] - Design Pivot
**Feature**: Neutral Light Theme & SaaS Landing Page
*   **Design System**: Refactored `globals.css` and all UI components to **Neutral Light** (White Bg, Slate-900 Text, Borders/Shadows). Removed Dark Mode/Glassmorphism.
*   **Landing Page**: Replaced placeholder with full SaaS page (Hero, Product, Pricing, Contact). Added `Navbar` with "Get Started" CTA.
*   **Auth**: Updated Login/Signup pages to Light Mode. Added mock feedback to Google Sign-in button.

### 2026-02-06 [Frontend - Antigravity] - Core CRM Hub
**Feature**: Visual Pipeline & Chat Mode
*   **Layout Toggle**: Implemented Context-based toggle (`Chat` vs `Advanced/CRM` modes). `Chat` mode maximizes the Assistant pane. `Advanced` mode shows the Kanban board.
*   **Kanban Board**: Created visual pipeline with 5 stages (New, Contacted, Negotiation, Won, Lost) and `framer-motion` drag physics.
*   **Deal Logic**: Added "Stale" (Amber > 7d) and "Rotting" (Red > 14d) visual alerts to Deal Cards.
*   **Activity Feed**: Created `ActivityFeed` component to visualize the "Magic Data Entry" events (e.g., "Email logged from tesla.com").

### 2026-02-06 [Backend - Claude Code]
**Feature**: Core Hub Database Schema, Server Actions & UI Shell

*   **Prisma Schema** (`prisma/schema.prisma`):
    *   Enums: `WorkspaceType` (TRADIE/AGENT), `DealStage` (NEW → LOST), `ActivityType` (CALL/EMAIL/NOTE).
    *   Core Models: `Workspace`, `Contact`, `Deal` (polymorphic `metadata Json?`), `Activity`.
    *   Vertical Tables: `Invoice` (Tradie), `OpenHouseLog` (Agent) — both linked to Deal.
    *   All models indexed, cascade deletes, `@@map` for clean table names.
*   **Database Client** (`src/lib/db.ts`):
    *   Singleton PrismaClient with global caching for dev hot-reload.
*   **Server Actions** (Zod-validated):
    *   `src/actions/tradie-actions.ts` — `generateQuote(dealId, items[])`: sums line items, updates Deal value + metadata, sets stage to INVOICED.
    *   `src/actions/agent-actions.ts` — `findMatches(listingId)`: reads listing metadata (price/bedrooms), queries contacts by `buyer_budget_max`, returns top 5 matches.
*   **Pipeline Utility** (`src/lib/utils/pipeline.ts`):
    *   `getDealHealth(lastActivity)`: HEALTHY (<7 days, green), STALE (7–14 days, yellow), ROTTING (>14 days, red).
*   **UI Components** (for Antigravity to integrate):
    *   `src/components/layout/SplitShell.tsx` — Bifurcated layout: NavRail (64px) + Canvas (65%) + Assistant pane (35%). Spring transitions via `AnimatePresence`.
    *   `src/components/layout/NavRail.tsx` — Vertical sidebar (Home/Pipeline/Contacts/Invoices). Icons scale 1.1x on hover (Framer Motion spring, stiffness: 300).
    *   `src/components/widgets/BentoCard.tsx` — Base card with spring-physics hover lift.
    *   `src/components/widgets/QuickQuoteCard.tsx` — Tradie widget: 3 recent jobs with status badges.
    *   `src/components/widgets/SpeedLeadCard.tsx` — Agent widget: live countdown timer with color-coded urgency bar.
*   **Styling** (`src/app/globals.css`):
    *   Glassmorphism utilities: `.glass`, `.glass-heavy`, `.glass-light`.
    *   Layout classes: `.split-shell`, `.nav-rail`, `.canvas-pane`, `.assistant-pane`.
    *   Radial gradient background accents, custom scrollbar, focus rings.
*   **Config**: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`.
*   **Branch**: `claude/build-crm-core-hub-dktUf`.
*   **Status**: All files committed and pushed. Ready for Antigravity frontend integration.

#### Notes for Antigravity Sync
*   The SplitShell and NavRail components use Framer Motion — ensure `framer-motion` is installed.
*   The Prisma schema uses `Json?` for Deal.metadata — this is the polymorphic "magic column" for vertical-specific data.
*   Tailwind config uses v4 `@import "tailwindcss"` directive in `globals.css`, consistent with Antigravity's frontend setup.
*   Server actions expect `@prisma/client` generated — run `npx prisma generate` after pulling.
