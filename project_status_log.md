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

### 2026-02-06 [Backend - Claude Code]
**Feature**: Core Hub Database Schema, Server Actions & UI Shell
*   **Status**: Initial branch `claude/build-crm-core-hub-dkt` was attempted to be merged but failed. Antigravity proceeded with Frontend-only build.
*   **Action**: Claude should Pull `main` first to get the new `app/dashboard` structure before reapplying backend logic.
