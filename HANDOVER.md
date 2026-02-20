## Last Updated: 2026-02-20
**Session**: Antigravity — Verification & Issue Logging
**Branch**: `main`
**Status**: Reverted unstable changes, issues logged in `ACECAP_LOG.md`

## What Was Done This Session — Verification & Logging

### Batch 1: Verification & Revert
- Verified Tradie Workflow (Scheduling works backend, button missing frontend)
- Verified Feedback Page (Fixed crash)
- Verified Inbox (Call button missing)
- **Action**: Reverted code changes to `app/dashboard/deals/[id]/page.tsx` and `prisma/schema.prisma` to leave codebase clean.
- **Logging**: All findings documented in `ACECAP_LOG.md`.

### Open Issues for Next Session (See `ACECAP_LOG.md`)
- **UI-20**: Deal Detail Page Crash (`ReferenceError: Images`)
- **TRADE-09**: Job Scheduling Enum Mismatch (`SCHEDULED`)
- **UI-21**: Missing "Call" button in Inbox
- **TRADE-10**: "Start Travel" button visibility


### Batch 1: React Error #310 Fix (commit `b445f95`)
- Added `<Suspense>` boundary around `Shell` component (uses `useSearchParams`)
- Added `<ThemeProvider>` from `next-themes` in root layout (for `useTheme` in Toaster)
- Added `suppressHydrationWarning` to `<html>` tag
- **Files**: `app/layout.tsx`, `app/dashboard/layout.tsx`, `app/(dashboard)/layout.tsx`

### Batch 2: Onboarding Flow + Service Worker (commit `180727c`)
- Middleware now redirects auth users to `/dashboard` not `/setup`
- Setup page: returning users skip tutorial (`/dashboard` not `?tutorial=true`)
- `tutorialComplete` persisted to localStorage
- Service worker skips navigation requests (fixes `opaqueredirect`)
- **Files**: `middleware.ts`, `app/setup/page.tsx`, `lib/store.ts`, `public/sw.js`

### Batch 3: Centralized Auth (commit `f34066e`)
- Created `lib/auth.ts` — `getAuthUserId()` and `getAuthUser()` helpers
- Fixed `completeOnboarding()` to use real user (was hardcoded `"demo-user"`)
- Updated both dashboard layouts and dashboard page
- **Files created**: `lib/auth.ts`
- **Files modified**: `actions/workspace-actions.ts`, `app/dashboard/page.tsx`, `app/dashboard/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/setup/page.tsx`

## Current State
- **Build**: PASSING (TypeScript pre-commit hook verified)
- **Deployment**: Vercel auto-deploy from `main`
- **Key Auth Pattern**: Use `getAuthUserId()` from `lib/auth.ts` — NOT `"demo-user"`

## Known Issues (See `error_tracking_log.md`)
- ~15 non-critical files still use `"demo-user"` (tradie pages, agent pages, kiosk, command palette)
- These should be migrated to `lib/auth.ts` helpers over time

## Next Steps
1. **Verify deployment**: Test onboarding flow and Advanced Mode on Vercel
2. **Migrate remaining `demo-user`**: Tradie/agent pages, kiosk, command palette, assistant pane
3. **Service worker**: Monitor for any remaining cache issues (old SW v1 may persist in some browsers)

## Key Notes for All AI Agents
- Always use `lib/auth.ts` helpers for user identification — never hardcode `"demo-user"`
- After making changes, update: `project_status_log.md`, `HANDOVER.md`, `error_tracking_log.md`
- See `.agent/workflows/post-change-docs.md` for detailed workflow
