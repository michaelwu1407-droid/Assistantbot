# AceCap Log — All Issues Flagged To Date

**Last Updated**: 2026-02-14
**Project**: PJ Buddy (Assistantbot)

---

## Legend
- ✅ **FIXED** — Issue resolved and verified
- ⚠️ **PARTIAL** — Fix applied but needs further testing or refinement
- ❌ **OPEN** — Not yet resolved
- ⏭️ **DEFERRED** — Low priority / post-MVP

---

## CHATBOT / NATURAL LANGUAGE PARSING

| # | Issue | Status | Details |
|---|-------|--------|---------|
| CB-01 | Chatbot returns "I'm not sure how to help" for valid job entries | ✅ FIXED | Shorthand regex used `[^$]` blocking `$` in prices. Fixed with input normalization + `.+?` |
| CB-02 | "200$" price format causes NaN | ✅ FIXED | Added `$` stripping normalization at top of `parseCommandRegex` |
| CB-03 | Day indicator (ymrw/tmrw) lost from schedule | ✅ FIXED | Now extracted from workDesc and appended to schedule field |
| CB-04 | Draft card shows wrong data (price $0, address includes work desc) | ✅ FIXED | Shorthand regex Group 3 over-captured; added price/address extraction from workDesc |
| CB-05 | AI parser drops params (Gemini returns `params` not `parameters`) | ✅ FIXED | Now checks `parsed.parameters \|\| parsed.params \|\| {}` |
| CB-06 | Chat history not loading on mount (`loadChatHistory` undefined) | ✅ FIXED | Changed to imported `getChatHistory` with proper data mapping |
| CB-07 | Clear history crashes (`db` used in client component) | ✅ FIXED | Replaced with `clearChatHistoryAction` server action |
| CB-08 | Chat history metadata doesn't preserve `action` type | ✅ FIXED | Now saves `{ action, data }` in metadata for history reload |
| CB-09 | `draft_job_natural` missing from UI action switch | ✅ FIXED | Added to switch case alongside `draft_deal` |
| CB-10 | Chatbot 422/500 server errors | ✅ FIXED | Made processChat and getChatHistory DB-resilient (commit `dfcec95`) |
| CB-11 | Chatbot syntax errors in AI parsing | ✅ FIXED | Fixed in commit `ecd621f` |
| CB-12 | Case sensitivity in message parsing | ✅ FIXED | Fixed in commit `7f8627e` |

---

## AUTH & ONBOARDING

| # | Issue | Status | Details |
|---|-------|--------|---------|
| AUTH-01 | Infinite redirect loop (setup ↔ dashboard) | ✅ FIXED | Hardcoded "demo-user" vs real auth user mismatch. Centralized auth (commit `f34066e`) |
| AUTH-02 | Returning users asked to re-enter setup details | ⚠️ PARTIAL | Middleware redirects `/login` → `/setup` instead of `/dashboard`. Fix documented in ERR-005 |
| AUTH-03 | Advanced Mode redirects to /setup | ✅ FIXED | Centralized auth, eliminated demo-user hardcoding (commit `f34066e`) |
| AUTH-04 | Tutorial flashes briefly then disappears | ❌ OPEN | `tutorialComplete` not persisted in localStorage; resets on reload. ERR-006 |
| AUTH-05 | "demo-user" hardcoded across 25+ files | ✅ FIXED | All migrated to centralized `lib/auth.ts` (commit `1c104f5`) |

---

## BUILD & TYPESCRIPT

| # | Issue | Status | Details |
|---|-------|--------|---------|
| BUILD-01 | Prisma version mismatch (CLI 7.4.0 vs package 5.21.1) | ⚠️ PARTIAL | Workaround: `npx prisma@5.21.1 generate` in build script. Permanent fix needs version alignment |
| BUILD-02 | 8 critical TypeScript build errors | ✅ FIXED | Prisma type mismatches, null checks, Decimal conversions (commit `fff6699`) |
| BUILD-03 | tsconfig.json duplicate include/exclude | ✅ FIXED | Removed duplicates (commit `6b4bfb4`) |
| BUILD-04 | `window is not defined` (Leaflet SSR) | ✅ FIXED | Dynamic import wrapper with `ssr: false` (commit in ERR-012) |
| BUILD-05 | next.config format issues for Vercel | ✅ FIXED | Converted to `next.config.js` for Turbopack compatibility |
| BUILD-06 | Service worker "opaqueredirect" error | ⚠️ PARTIAL | Documented fix (skip navigate requests in sw.js), needs implementation |

---

## DASHBOARD & UI

| # | Issue | Status | Details |
|---|-------|--------|---------|
| UI-01 | Dashboard layout broken / activity feed cut off | ✅ FIXED | Refactored to Flex Column with strict max-h and internal scrolling |
| UI-02 | Basic Mode UI too bare | ✅ FIXED | Added chatbot polish, message bubbles, date separators, helper chips |
| UI-03 | Map z-index bleed through sidebar | ✅ FIXED | Set `z-index: 0` on Leaflet container |
| UI-04 | Map popup not interactive | ✅ FIXED | Added "View Job" and "Directions" buttons to popups |
| UI-05 | Calendar grid alignment off | ⚠️ PARTIAL | Improved header, relies on CSS Grid stability |
| UI-06 | Calendar aesthetics outdated | ✅ FIXED | Upgraded to "Google Calendar" style with responsive wrapping |
| UI-07 | Empty calendar (no events shown) | ✅ FIXED | Date serialization (ISO string) from server to client (commit ERR-013) |
| UI-08 | Sidebar tooltips missing | ✅ FIXED | Added tooltips to all sidebar icons |
| UI-09 | Settings navigation broken | ✅ FIXED | Sidebar cog routes to `/dashboard/settings` |
| UI-10 | Redundant Map icon in navigation | ✅ FIXED | Removed; tradie map accessed via sub-menu |
| UI-11 | Sidebar toggle logic wrong | ✅ FIXED | Tradie/Agent icons now toggle sub-menus |
| UI-12 | React Error #310 (hook count mismatch) | ✅ FIXED | Added Suspense boundary + ThemeProvider (commit `b445f95`) |
| UI-13 | react-resizable-panels crash (React #130) | ✅ FIXED | Downgraded to v2.1.7 |
| UI-14 | Duplicate dashboard `client-page.tsx` | ✅ FIXED | Removed duplicate file |
| UI-15 | Activity feed broken navigation (window.location) | ✅ FIXED | Replaced with `router.push()` |
| UI-16 | Tradie Map/Schedule/Estimator 404 errors | ✅ FIXED | Fixed sidebar links, created missing routes |
| UI-17 | DealView vs TradieJob type mismatch | ⚠️ PARTIAL | Affects tradie page type safety. Not blocking build. |

---

## TRADIE WORKFLOW

| # | Issue | Status | Details |
|---|-------|--------|---------|
| TRADE-01 | Material database seed data minimal (14 items) | ✅ FIXED | Expanded to 29 items (HVAC, Hardware, Roofing categories) |
| TRADE-02 | MaterialPicker imported but never rendered | ✅ FIXED | Rendered in Billing tab of JobBottomSheet |
| TRADE-03 | Voice-to-text recognition | ✅ FIXED | Extracted to `use-speech-recognition.ts` hook with error handling |
| TRADE-04 | Safety check modal not wired | ✅ FIXED | Wired to "ON_SITE" status trigger in JobStatusBar |
| TRADE-05 | Travel workflow incomplete | ✅ FIXED | Enhanced with SMS sending via `sendOnMyWaySMS` |
| TRADE-06 | Next job calculation missing | ✅ FIXED | `getNextJob` and `getTodaySchedule` server actions implemented |
| TRADE-07 | Today's jobs filter not working | ✅ FIXED | Filtering and visual indicators added |
| TRADE-08 | Financial stats not wired to dashboard | ❌ OPEN | UI exists but doesn't fetch data. TODO in tradie page |

---

## SEARCH & NAVIGATION

| # | Issue | Status | Details |
|---|-------|--------|---------|
| NAV-01 | Global search Cmd+K not working in tradie | ✅ FIXED | Integrated via Header component |
| NAV-02 | Hardcoded workspace ID in search | ✅ FIXED | Uses `useShellStore` for dynamic workspace ID |
| NAV-03 | Workspace ID TODO in search dialog | ⚠️ PARTIAL | Still has TODO comment but functional via store |

---

## API INTEGRATIONS

| # | Issue | Status | Details |
|---|-------|--------|---------|
| API-01 | Gmail API sync | ⚠️ PARTIAL | Stubs implemented, not fully integrated with live API |
| API-02 | Outlook API sync | ⚠️ PARTIAL | Microsoft Graph stubs implemented |
| API-03 | MYOB accounting integration | ❌ OPEN | 2 TODO comments — not implemented |
| API-04 | Calendar sync (Google/Outlook) | ⚠️ PARTIAL | Stubs exist, not fully wired |
| API-05 | Missing environment variables | ❌ OPEN | DB, Supabase, Gemini, Twilio, Google, Azure, Xero keys not configured |

---

## INFRASTRUCTURE

| # | Issue | Status | Details |
|---|-------|--------|---------|
| INFRA-01 | No test suite | ❌ OPEN | Zero tests written. No regression protection |
| INFRA-02 | Auto-retreat canvas (30s inactivity) | ✅ FIXED | Timer implemented to return to Basic mode |
| INFRA-03 | Hydration mismatch errors | ✅ FIXED | Suspense boundaries and `suppressHydrationWarning` added |

---

## DEFERRED (Post-MVP / Low Priority)

| # | Issue | Status | Details |
|---|-------|--------|---------|
| DEF-01 | Photo annotation (J-7) | ⏭️ DEFERRED | Low priority feature |
| DEF-02 | Video recording (J-10) | ⏭️ DEFERRED | Low priority feature |
| DEF-03 | Payment terminal (J-12) | ⏭️ DEFERRED | Low priority feature |
| DEF-04 | API documentation | ⏭️ DEFERRED | No docs written |

---

## SUMMARY

| Category | Total | Fixed | Partial | Open | Deferred |
|----------|-------|-------|---------|------|----------|
| Chatbot | 12 | 12 | 0 | 0 | 0 |
| Auth | 5 | 3 | 1 | 1 | 0 |
| Build | 6 | 4 | 2 | 0 | 0 |
| UI | 17 | 14 | 2 | 0 | 0 |
| Tradie | 8 | 7 | 0 | 1 | 0 |
| Search/Nav | 3 | 2 | 1 | 0 | 0 |
| API | 5 | 0 | 3 | 2 | 0 |
| Infra | 3 | 2 | 0 | 1 | 0 |
| Deferred | 4 | 0 | 0 | 0 | 4 |
| **TOTAL** | **63** | **44** | **9** | **5** | **4** |
