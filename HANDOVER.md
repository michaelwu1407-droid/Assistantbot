# Claude Code Handover Log

**Purpose**: Sync state between Claude Code **web** and Claude Code **terminal** sessions. Read this first on session start. Update before session end.

---

## Last Updated: 2026-02-06 (Session 2)
**Session**: Claude Code Web
**Branch**: `claude/build-crm-core-hub-dktUf`

## What Was Done This Session

### 1. Removed `src/` legacy directory (DONE)
- All legacy files consolidated into root (`lib/`, `actions/`)
- Deleted: `src/lib/db.ts`, `src/lib/utils/pipeline.ts`, `src/actions/tradie-actions.ts`, `src/app/`, `src/components/`

### 2. Added Vertical-Specific Actions (DONE)
- `actions/tradie-actions.ts` — `generateQuote()` (line items → total with 10% GST, creates Invoice record, moves deal to INVOICED), `getDealInvoices()`, `issueInvoice()`, `markInvoicePaid()` (auto-moves to WON)
- `actions/agent-actions.ts` — `findMatches()` (buyer matchmaker: budget + bedrooms filter), `logOpenHouseAttendee()` (auto-creates contacts), `getOpenHouseLog()`

### 3. Fixed Build (DONE)
- Removed Google Fonts import (Geist) from `app/layout.tsx` — fails in offline build env. Uses system fonts.
- Fixed all Prisma `InputJsonValue` type errors across actions — `JSON.parse(JSON.stringify(...))` wrapper for all Json field writes.
- **Build passes cleanly**: all 9 routes compile.

## Current State
- **All backend code complete**: Schema, 8 server action files, 5 lib utilities, seed script
- **Build: PASSING** (`npm run build` succeeds)
- **No `src/` directory** — everything in root

## What Needs To Be Done Next
- Frontend integration: wire server actions into Gemini's CRM components
- Set up Supabase DB + run `npx prisma db push` + `npm run db:seed`
- Wire `AssistantPane` chat input to `processChat()`
- Add real drag-and-drop persistence (call `updateDealStage()` on drop)

## Key Notes for Next Session
- All Json fields use `JSON.parse(JSON.stringify(...))` to satisfy Prisma's `InputJsonValue` type
- `app/layout.tsx` uses system fonts (no Google Fonts) — Gemini can add them back if they have internet access
- `getDeals()` returns `DealView[]` matching frontend `Deal` type exactly
