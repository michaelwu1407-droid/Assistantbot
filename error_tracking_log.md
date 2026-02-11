# Pj Buddy — Error Tracking Log

> Comprehensive log of all issues encountered during development, their root causes, and solutions.

---

## ERR-001: Infinite Redirect Loop (Setup ↔ Dashboard)
- **Status**: ✅ RESOLVED (commit `f72ec88`)
- **Symptoms**: Browser shows infinite loading, URL oscillates between `/setup` and `/dashboard`
- **Root Cause**: `app/setup/page.tsx` used hardcoded `"demo-user"` for `getOrCreateWorkspace()`, while `app/dashboard/page.tsx` used the real authenticated user's ID. The demo user had `onboardingComplete: true`, so setup redirected to dashboard. But dashboard checked the REAL user (not onboarded), so it redirected back to setup.
- **Solution**: Changed `setup/page.tsx` to use `createClient()` from Supabase to fetch the real authenticated user's ID, matching the dashboard's logic.
- **Files Modified**: `app/setup/page.tsx`
- **Learning**: Always use the same user identification method across ALL pages. Never mix demo-user with real auth.

---

## ERR-002: React Error #310 — "Rendered more hooks than during the previous render"
- **Status**: ✅ RESOLVED (commit `b445f95`)
- **Symptoms**: Blank page with "Application error: a client-side exception has occurred". Console shows Error #310 referencing `useMemo`.
- **Root Cause**: TWO issues combined:
  1. `Shell.tsx` uses `useSearchParams()` which requires a `<Suspense>` boundary in Next.js 14+. Without it, React's hydration gets confused during the Suspense fallback/resolve transition, causing the hook count mismatch.
  2. The `<Toaster>` component (from `sonner`) calls `useTheme()` from `next-themes`, but there was no `<ThemeProvider>` in the component tree. This caused a secondary SSR/CSR mismatch.
- **Solution**: 
  1. Wrapped `<Shell>` in `<Suspense>` in both `app/dashboard/layout.tsx` and `app/(dashboard)/layout.tsx`
  2. Added `<ThemeProvider>` from `next-themes` in `app/layout.tsx`
  3. Added `suppressHydrationWarning` on the `<html>` tag
- **Files Modified**: `app/layout.tsx`, `app/dashboard/layout.tsx`, `app/(dashboard)/layout.tsx`
- **Learning**: ALWAYS wrap components using `useSearchParams()` in `<Suspense>`. ALWAYS provide a `<ThemeProvider>` when using `useTheme()`. These are Next.js 14+ requirements.

---

## ERR-003: Frozen/Missing UI Buttons (Settings, Advanced Mode, Chat Input)
- **Status**: ✅ RESOLVED (via ERR-002 fix)
- **Symptoms**: Dashboard loads but buttons appear unresponsive or missing entirely. No click handlers fire.
- **Root Cause**: React Error #310 kills the entire client-side hydration. When React crashes during hydration, the page renders server HTML only — which has no JavaScript event handlers attached. Buttons APPEAR to exist in the DOM but have no interactivity.
- **Solution**: Same as ERR-002. Once React hydration succeeds, all event handlers attach properly.
- **Learning**: "Frozen buttons" in a Next.js app almost always means a hydration crash. Check the browser console for React errors FIRST.

---

## ERR-004: Service Worker "opaqueredirect" Error
- **Status**: 🔴 OPEN
- **Symptoms**: Console warning: `The FetchEvent for "/setup" resulted in a network error response: an "opaqueredirect" type response was used for a request whose redirect mode is not "manual".`
- **Root Cause**: `public/sw.js` intercepts ALL same-origin GET requests with a stale-while-revalidate strategy. When a page like `/setup` issues a redirect (302) to `/dashboard`, the service worker tries to cache the redirect response. But service workers cannot cache "opaqueredirect" responses with `respondWith()` unless the request's `redirect` mode is "manual".
- **Solution**: Add a check in `sw.js` fetch handler to skip navigation requests (those with `mode: 'navigate'`), letting the browser handle redirects natively.
- **Files to Modify**: `public/sw.js`
- **Learning**: Service workers should NEVER cache navigation requests that might redirect. Always check `event.request.mode === 'navigate'` and skip those.

---

## ERR-005: Returning Users Asked to Re-Enter Details
- **Status**: 🔴 OPEN
- **Symptoms**: User who has already completed onboarding is shown the setup page with "What's the name of your business?" every time they log in.
- **Root Cause**: Two-part issue:
  1. `middleware.ts` (line 60-67) redirects ALL authenticated users visiting `/login` or `/signup` to `/setup` — regardless of whether they've already completed onboarding.
  2. `setup/page.tsx` checks `onboardingComplete` and redirects to `/dashboard?tutorial=true` — but the redirect itself causes the service worker error (ERR-004) and also triggers the tutorial unnecessarily.
- **Expected Flow**:
  - **New user**: Sign up → `/setup` (answer questions) → `/dashboard?tutorial=true` (see tutorial) → Dashboard
  - **Returning user**: Sign in → `/dashboard` (skip setup AND tutorial entirely)
- **Solution**: Change `middleware.ts` to redirect authenticated users from `/login`/`/signup` to `/dashboard` instead of `/setup`. The dashboard page already checks `onboardingComplete` and redirects to `/setup` if needed.
- **Files to Modify**: `middleware.ts`
- **Learning**: The middleware should route to the "default" destination (dashboard) and let individual pages handle conditional redirects. Don't assume all users need setup.

---

## ERR-006: Tutorial Flashes Briefly Then Disappears
- **Status**: 🔴 OPEN
- **Symptoms**: After completing setup, tutorial step 1 briefly appears then the UI switches to chatbot mode.
- **Root Cause**: Multiple issues:
  1. `setup/page.tsx` redirects to `/dashboard?tutorial=true` for BOTH new users (correct) and returning users who already completed onboarding (incorrect — ERR-005).
  2. `tutorialComplete` in the Zustand store (`lib/store.ts`) defaults to `false` and is NOT persisted. On every fresh page load, it resets to `false`. This means even completed tutorials aren't remembered.
  3. When the Shell's `useEffect` triggers the tutorial via URL param, it sets `viewMode = "TUTORIAL"`. If something then resets it back to "BASIC" (e.g., a re-render or navigation), the tutorial vanishes.
- **Solution**:
  1. Fix ERR-005 so returning users don't get `?tutorial=true`
  2. Persist `tutorialComplete` in `localStorage` so it survives page reloads
  3. Ensure the tutorial state transition is stable
- **Files to Modify**: `lib/store.ts`, `middleware.ts`, `app/setup/page.tsx`
- **Learning**: Tutorial completion state MUST be persisted. Zustand stores reset on page reload unless using the `persist` middleware or manual `localStorage` checks.

---

## ERR-007: PowerShell `&&` Syntax Failure
- **Status**: ✅ RESOLVED
- **Symptoms**: Git commands chained with `&&` fail silently in PowerShell.
- **Root Cause**: PowerShell uses `;` or separate commands, not `&&` for command chaining (though PS7+ supports `&&`, earlier versions do not).
- **Solution**: Run git commands one at a time: `git add .`, then `git commit`, then `git push`.
- **Learning**: In PowerShell, always chain with `;` or run commands sequentially. Never assume `&&` works.

---

## ERR-008: Git Push Rejected (Non-Fast-Forward)
- **Status**: ✅ RESOLVED
- **Symptoms**: `git push origin main` fails with "rejected — non-fast-forward".
- **Root Cause**: Remote `main` had new commits pushed from another AI session (Claude) that weren't in the local history.
- **Solution**: `git pull --rebase origin main`, resolve conflicts, then push.
- **Learning**: When multiple AI agents work on the same repo, always pull before pushing.

---

## ERR-009: react-resizable-panels Crash (React #130)
- **Status**: ✅ RESOLVED
- **Symptoms**: React Error #130 — "Element type is invalid" for `PanelGroup`.
- **Root Cause**: `react-resizable-panels` version was incompatible with the project's React version.
- **Solution**: Downgraded to `react-resizable-panels@2.1.7`.
- **Learning**: Pin compatible versions of UI libraries; check React version compatibility.

---

## ERR-010: Advanced Mode Redirects to /setup (Systemic Auth Mismatch)
- **Status**: ✅ RESOLVED (commit `f34066e`)
- **Symptoms**: User completes onboarding, sees dashboard in Basic Mode. Clicking "Advanced Mode" redirects to `/setup`.
- **Root Cause**: **Systemic `"demo-user"` hardcoding across 25+ files**. The most critical instance was `completeOnboarding()` in `workspace-actions.ts`, which marked the **demo-user's** workspace as completed, not the real authenticated user's. When the dashboard page (which correctly used the real user) checked `onboardingComplete`, it found `false` and redirected to `/setup`.
- **Solution**: Created a centralized `lib/auth.ts` module with `getAuthUserId()` and `getAuthUser()` helpers. Updated all critical-path files to use these instead of hardcoded `"demo-user"`:
  - `actions/workspace-actions.ts` (`completeOnboarding`)
  - `app/dashboard/page.tsx`
  - `app/dashboard/layout.tsx`
  - `app/(dashboard)/layout.tsx`
  - `app/setup/page.tsx`
- **Files Modified**: 6 files (5 existing + 1 new `lib/auth.ts`)
- **Remaining**: ~~15 non-critical files still use `"demo-user"`~~ All 14 remaining files migrated on 2026-02-10. `"demo-user"` now only exists as the fallback in `lib/auth.ts`.
- **Learning**: NEVER hardcode user IDs. Create a centralized auth helper from day one and use it everywhere. When fixing auth in one file, grep for ALL occurrences of the pattern.

---

## ERR-011: Build Failed - Prisma Schema Validation (v7+)
- **Status**: ✅ RESOLVED
- **Symptoms**: `npm run build` failed with `Error: Prisma schema validation - (get-config wasm)`. Error code `P1012`. "The datasource property 'url' is no longer supported".
- **Root Cause**: `npm install prisma@latest` installed v7.3.0, which has breaking changes for schema configuration (requires `prisma.config.ts` or constructor args for URLs). The project was set up for Prisma v5.
- **Solution**: Downgraded Prisma to v5.21.1 to match project patterns.
- **Command**: `npm install prisma@5.21.1 --save-dev && npm install @prisma/client@5.21.1`
- **Learning**: Always pin major versions of critical infrastructure libraries like Prisma to avoid breaking changes in CI/CD.

---

## ERR-012: Build Failed - JobMapView Window Undefined
- **Status**: ✅ RESOLVED
- **Symptoms**: Build error: `window is not defined` in `app/dashboard/tradie/map/page.tsx`.
- **Root Cause**: Importing `JobMapView` (which uses Leaflet) directly in a Server Component or during SSR. Leaflet accesses `window` on initialization.
- **Solution**: Created `components/crm/job-map-view-wrapper.tsx` which uses `next/dynamic` with `{ ssr: false }` to load the map component only on the client.
- **Files Modified**: `app/dashboard/tradie/map/page.tsx`, `components/crm/job-map-view-wrapper.tsx`
- **Learning**: Any component using Leaflet (or browser-only APIs) MUST be dynamically imported with SSR disabled if included in a Next.js App Router page.

---

## ERR-013: Empty Calendar - Date Serialization
- **Status**: ✅ RESOLVED
- **Symptoms**: Calendar page loaded but showed no events, even though DB had jobs.
- **Root Cause**: Passing raw `Date` objects from Server Component (`page.tsx`) to Client Component (`scheduler-view.tsx`). Next.js warns about non-serializable data, and `dnd-kit` or date-fns logic on the client failed to parse the server-side Date object correctly across the boundary.
- **Solution**: Converted dates to ISO strings in `page.tsx` before passing to the client component.
- **Files Modified**: `app/dashboard/tradie/schedule/page.tsx`
- **Learning**: Always serialize dates to strings (ISO format) when passing data from Server Components to Client Components.
