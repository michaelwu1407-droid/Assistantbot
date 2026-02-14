# Pj Buddy — Error Tracking Log

> Comprehensive log of all issues encountered during development, their root causes, and solutions.

---

## ERR-001: Infinite Redirect Loop (Setup → Dashboard)
- **Status**: RESOLVED (commit `f72ec88`)
- **Symptoms**: Browser shows infinite loading, URL oscillates between `/setup` and `/dashboard`
- **Root Cause**: `app/setup/page.tsx` used hardcoded `"demo-user"` for `getOrCreateWorkspace()`, while `app/dashboard/page.tsx` used real authenticated user's ID. The demo user had `onboardingComplete: true`, so setup redirected to dashboard. But dashboard checked REAL user (not onboarded), so it redirected back to setup.
- **Solution**: Changed `setup/page.tsx` to use `createClient()` from Supabase to fetch real authenticated user's ID, matching dashboard's logic.
- **Files Modified**: `app/setup/page.tsx`
- **Learning**: Always use same user identification method across ALL pages. Never mix demo-user with real auth.

---

## ERR-002: React Error #310 — "Rendered more hooks than during previous render"
- **Status**: RESOLVED (commit `b445f95`)
- **Symptoms**: Blank page with "Application error: a client-side exception has occurred". Console shows Error #310 referencing `useMemo`.
- **Root Cause**: TWO issues combined:
  1. `Shell.tsx` uses `useSearchParams()` which requires a `<Suspense>` boundary in Next.js 14+. Without it, React's hydration gets confused during Suspense fallback/resolve transition, causing hook count mismatch.
  2. The `<Toaster>` component (from `sonner`) calls `useTheme()` from `next-themes`, but there was no `<ThemeProvider>` in component tree. This caused a secondary SSR/CSR mismatch.
- **Solution**:
  1. Wrapped `<Shell>` in `<Suspense>` in both `app/dashboard/layout.tsx` and `app/(dashboard)/layout.tsx`
  2. Added `<ThemeProvider>` from `next-themes` in `app/layout.tsx`
  3. Added `suppressHydrationWarning` on `<html>` tag
- **Files Modified**: `app/layout.tsx`, `app/dashboard/layout.tsx`, `app/(dashboard)/layout.tsx`
- **Learning**: ALWAYS wrap components using `useSearchParams()` in `<Suspense>`. ALWAYS provide a `<ThemeProvider>` when using `useTheme()`. These are Next.js 14+ requirements.

---

## ERR-003: Critical TypeScript Build Errors (2026-02-14)
- **Status**: RESOLVED (commit `fff6699`)
- **Symptoms**: 8 critical TypeScript errors blocking build across multiple action files
- **Root Cause**: Prisma 5.x type mismatches and missing null checks in various action files
- **Solution**: Fixed all 8 TypeScript errors:
  1. `Date | null` to `Date` conversions in calendar-actions.ts and task-actions.ts
  2. Contact relation property access with proper type casting
  3. Decimal to number conversions in deal-actions.ts and geo-actions.ts
  4. Company property issues in portal-actions.ts and search-actions.ts
  5. Workspace brandingColor type mismatch
- **Files Modified**: 8 action files
- **Learning**: Prisma relations require explicit type casting when accessing nested properties

---

## ERR-004: Prisma Version Compatibility (2026-02-14)
- **Status**: 🔴 OPEN
- **Symptoms**: Build fails with Prisma schema validation errors
- **Error Details**: 
  - Error code: P1012
  - Message: "The datasource property `url` is no longer supported in schema files"
  - CLI Version: 7.4.0 (installed globally)
  - Package Version: 5.21.1 (project dependency)
- **Root Cause**: Version mismatch between Prisma CLI (7.4.0) and project package (5.21.1)
- **Impact**: Blocks all build processes, prevents deployment
- **Files Affected**: `prisma/schema.prisma`, entire build pipeline
- **Technical Context**: Prisma 7.x introduced breaking changes requiring configuration migration
- **Attempted Solutions**:
  1. ✅ Created `prisma/config.ts` (new Prisma 7.x format)
  2. ✅ Removed deprecated `directUrl` property from schema
  3. ❌ CLI still rejects schema format due to version mismatch
- **Immediate Workaround**: Use `npx prisma@5.21.1 generate` to match package version
- **Permanent Solutions**:
  1. **Option A**: Upgrade project to Prisma 7.x and migrate all schema configurations
  2. **Option B**: Downgrade global Prisma CLI to match project version
  3. **Option C**: Use project-local Prisma CLI consistently
- **Required Actions**:
  - Update `package.json` scripts to use specific Prisma version
  - OR migrate to Prisma 7.x configuration format
  - OR set up CI/CD to use specific Prisma version
- **Dependencies**: None - this is a tooling/version conflict, not code logic
- **Priority**: HIGH - Blocks all development and deployment
- **AI Agent Note**: This is a configuration issue, not a code logic problem. The fix requires either version alignment or format migration.

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

---

## ERR-014: Chatbot Draft Card Shows Wrong Data (2026-02-14)
- **Status**: ✅ RESOLVED
- **Symptoms**: User enters "sally 12pm ymrw broken fan. 200$ 45 wyndham st alexandria". Bot responds with "I've extracted these details from your message. Please confirm:" but the draft card shows price $0, work description "General service/repair", and address containing the work description.
- **Root Cause**: Three compounding issues in `parseCommandRegex()`:
  1. **Shorthand regex over-capture**: The non-greedy `.+?` in Group 3 (work description) expanded to swallow the entire remainder (price + address) because the optional groups `(?:\s+(\d+))?(?:\s+(.+?))?$` never forced capture — they're all optional, so the regex engine let Group 3 consume everything.
  2. **Street-pattern check replaces entire workDesc**: When the bloated Group 3 contained "45 wyndham st", the street detection replaced the entire string with "General service/repair" and set the whole thing as address.
  3. **Price defaulted to "0"**: Since Group 4 (price) never captured anything, `extractedPrice` fell through to "0".
- **Solution**: Added post-processing in shorthand handler — when price group is empty, search the work description for a number, split text before it as work description, the number as price, and text after as address.
- **Files Modified**: `actions/chat-actions.ts` (lines 120-134)
- **Learning**: Non-greedy quantifiers (`.+?`) followed by entirely optional groups are effectively greedy — the regex engine minimizes `.+?` only when it MUST yield to required subsequent groups. Always add post-processing fallbacks when regex groups are optional.

---

## ERR-015: loadChatHistory Undefined — Chat History Never Loads (2026-02-14)
- **Status**: ✅ RESOLVED
- **Symptoms**: Chat history doesn't persist across page reloads. Console shows `ReferenceError: loadChatHistory is not defined`.
- **Root Cause**: `assistant-pane.tsx` calls `loadChatHistory(workspaceId)` at line 48, but this function doesn't exist. The imported function is `getChatHistory`. The `.catch()` handler silently swallows the ReferenceError.
- **Solution**: Changed to `getChatHistory(workspaceId)` with proper data mapping (DB rows → Message interface: converting `createdAt` to timestamp, mapping `metadata.action` and `metadata.data`).
- **Files Modified**: `components/core/assistant-pane.tsx` (lines 46-64)
- **Learning**: Always verify function names match their imports. Silent `.catch()` handlers mask bugs — consider logging or re-throwing.

---

## ERR-016: clearChatHistory Uses Server-Only db in Client Component (2026-02-14)
- **Status**: ✅ RESOLVED
- **Symptoms**: Clicking "Clear History" crashes with `ReferenceError: db is not defined`. The `db` Prisma client is a server-only module.
- **Root Cause**: `assistant-pane.tsx` (marked `"use client"`) directly called `db.chatMessage.deleteMany()` — the Prisma client (`@/lib/db`) is server-only and not available in client components.
- **Solution**: Created `clearChatHistoryAction()` server action in `chat-actions.ts` and called it from the component instead.
- **Files Modified**: `actions/chat-actions.ts` (new export), `components/core/assistant-pane.tsx` (import + usage)
- **Learning**: NEVER import or use `db` (Prisma client) in `"use client"` components. Always go through server actions.

---

## ERR-017: Chat History Metadata Doesn't Preserve Action Type (2026-02-14)
- **Status**: ✅ RESOLVED
- **Symptoms**: After page reload, messages that had draft cards (e.g., `draft_job_natural`) lose their card UI because the `action` field wasn't saved to the database.
- **Root Cause**: The DB persistence code saved `response.data` as metadata but not `response.action`. On reload, `metadata.action` was `undefined`, so the card condition `msg.action === "draft_job_natural"` was never true.
- **Solution**: Changed metadata to save `{ action: response.action, data: response.data }`. Updated history loader to read `metadata.action` and `metadata.data`.
- **Files Modified**: `actions/chat-actions.ts` (line 1234), `components/core/assistant-pane.tsx` (lines 55-56)
- **Learning**: When UI rendering depends on response metadata (action type, data payload), ALL of it must be persisted to the database, not just partial fields.

---

## ERR-018: Draft Card Shows Raw Un-Enriched Data (2026-02-14)
- **Status**: ✅ RESOLVED
- **Symptoms**: User enters "sally 12pm ymrw broken fan. 200$ 45 wyndham st alexandria". Draft card shows raw data: lowercase "sally", schedule "12pm ymrw" instead of a real date, "45 wyndham st alexandria" without capitalisation, no work category, no last name field. User expects polished pre-filled data they can review and edit.
- **Root Cause**: The `create_job_natural` handler returned raw parsed strings with no enrichment. The draft card was static text (non-editable) showing whatever the parser extracted verbatim.
- **Solution**: Added five enrichment functions and rebuilt the draft card UI:
  1. `titleCase()` — capitalises "sally" → "Sally"
  2. `categoriseWork()` — maps keywords to trade categories (Plumbing, Electrical, HVAC, etc.)
  3. `resolveSchedule()` — converts "12pm ymrw" → "12:00 PM, Sat 15 Feb 2026" with ISO date
  4. `enrichAddress()` — capitalises + expands abbreviations ("st" → "Street,")
  5. Split client name into first/last name fields
  6. Rebuilt card as `JobDraftCard` component with editable `<Input>` fields, category badge, and pre-filled enriched data
- **Files Modified**: `actions/chat-actions.ts` (enrichment functions + draft response), `components/core/assistant-pane.tsx` (JobDraftCard component)
- **Learning**: Chatbot draft UIs should always present enriched, editable data — not raw parser output. Users expect to review and correct, not re-enter from scratch.
