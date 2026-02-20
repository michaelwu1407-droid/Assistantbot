# Issue Audit — Sorted by Page

**Last Updated:** 2026-02-20
**Sources:** `ACECAP_LOG.md`, `project_status_log.md`

This document lists every recorded issue and outstanding task, sorted by the Page or Component it affects.

## Legend
- ✅ **Fixed**
- ❌ **Open**
- ⚠️ **Partial**
- ⏭️ **Deferred**
- 🚧 **Task** (Outstanding work)

| Page / Component | ID | Issue | Description | Status |
|------------------|----|-------|-------------|--------|
| **Agent Dashboard** | BE-2 | Wire vendor-report-widget | `components/agent/vendor-report-card.tsx` uses hardcoded static data. Needs real DB queries. | 🚧 Task |
| **Agent Dashboard** | BE-3 | Vendor report PDF generation | `generateVendorReportPDF()` returns HTML string, not PDF. | 🚧 Task |
| **Agent Dashboard** | BE-11 | Vendor report PDF generation | (Duplicate of BE-3) Vendor report PDF generation | 🚧 Task |
| **Agent Dashboard** | VR | Wire vendor-report-widget | (Duplicate of BE-2) Wire vendor-report-widget to real data | 🚧 Task |
| **Agent Dashboard** | AG-2 | Commission Calculator | Build the slider widget for the Agent dashboard. | 🚧 Task |
| **Agent Dashboard** | UI-19 | Sidebar Tradie/Agent toggles | Removed toggles and agent sub-items; Deals → Contacts. | ✅ Fixed |
| **API / Backend** | API-01 | Gmail API sync | Full API integration: OAuth, message fetching, contact matching. | ✅ Fixed |
| **API / Backend** | API-02 | Outlook API sync | Full Microsoft Graph integration. | ✅ Fixed |
| **API / Backend** | API-03 | MYOB accounting integration | Full MYOB AccountRight API integration. | ✅ Fixed |
| **API / Backend** | API-04 | Calendar sync | Token retrieval from workspace settings. | ✅ Fixed |
| **API / Backend** | API-05 | Environment variables | `.env.example` updated with all required vars. | ✅ Fixed |
| **API / Backend** | BE-1 | Create `pipeline-actions.ts` | Industry-aware kanban stages. Export `getIndustryStages(industryType)`. | 🚧 Task |
| **API / Backend** | BE-6 | Twilio SMS wiring | `sendOnMyWaySMS()` needs real Twilio credentials. | 🚧 Task |
| **API / Backend** | DEF-04 | API documentation | No docs written. | ⏭️ Deferred |
| **Auth / Setup** | AUTH-01 | Infinite redirect loop | Setup ↔ dashboard loop. Fixed by centralized auth. | ✅ Fixed |
| **Auth / Setup** | AUTH-02 | Returning users re-setup | Middleware now redirects to `/dashboard`. | ✅ Fixed |
| **Auth / Setup** | AUTH-03 | Advanced Mode redirects | Centralized auth, eliminated demo-user hardcoding. | ✅ Fixed |
| **Auth / Setup** | AUTH-04 | Tutorial flashes | `tutorialComplete` persisted in localStorage. | ✅ Fixed |
| **Auth / Setup** | AUTH-05 | "demo-user" hardcoded | Removed "demo-user" from 25+ files. | ✅ Fixed |
| **Auth / Setup** | AUTH-06 | Invalid Clerk Key | PEM format fixed in Vercel Env Vars. | ✅ Fixed |
| **Auth / Setup** | FE-10 | Remove GitHub OAuth button | Login page still shows GitHub button. | 🚧 Task |
| **Chatbot / Global** | CB-01 | "I'm not sure how to help" | Regex fixed for `$` symbol. | ✅ Fixed |
| **Chatbot / Global** | CB-02 | "200$" price format | `$` stripping normalization added. | ✅ Fixed |
| **Chatbot / Global** | CB-03 | Day indicator lost | `ymrw`/`tmrw` extraction fixed. | ✅ Fixed |
| **Chatbot / Global** | CB-04 | Draft card wrong data | Regex capture groups fixed. | ✅ Fixed |
| **Chatbot / Global** | CB-05 | AI drops params | `parameters` vs `params` check added. | ✅ Fixed |
| **Chatbot / Global** | CB-06 | History not loading | `getChatHistory` mapping fixed. | ✅ Fixed |
| **Chatbot / Global** | CB-07 | Clear history crash | Replaced with server action. | ✅ Fixed |
| **Chatbot / Global** | CB-08 | Metadata `action` type | Now saving `{ action, data }`. | ✅ Fixed |
| **Chatbot / Global** | CB-09 | `draft_job_natural` missing | Added to action switch. | ✅ Fixed |
| **Chatbot / Global** | CB-10 | 422/500 server errors | DB-resilient chat processing. | ✅ Fixed |
| **Chatbot / Global** | CB-11 | Syntax errors in parsing | Fixed in commit `ecd621f`. | ✅ Fixed |
| **Chatbot / Global** | CB-12 | Case sensitivity | Fixed in commit `7f8627e`. | ✅ Fixed |
| **Chatbot / Global** | CB-13 | Draft card raw data | Added enrichment (name, date, address). | ✅ Fixed |
| **Chatbot / Global** | CB-14 | Draft card not editable | Rebuilt as `JobDraftCard` with inputs. | ✅ Fixed |
| **Chatbot / Global** | CB-15 | No last name field | Split name into first/last. | ✅ Fixed |
| **Chatbot / Global** | CB-16 | Schedule raw shorthand | `resolveSchedule()` added. | ✅ Fixed |
| **Chatbot / Global** | CB-17 | Address not enriched | `enrichAddress()` added. | ✅ Fixed |
| **Chatbot / Global** | CB-18 | No work category | `categoriseWork()` mapping added. | ✅ Fixed |
| **Chatbot / Global** | BE-4 | Connect AI model | Wire `processChat()` to Gemini API (currently regex). | 🚧 Task |
| **Chatbot / Global** | FE-2 | Chat-first UI (Basic Mode) | Basic Mode should look like ChatGPT (full-page). | 🚧 Task |
| **Dashboard** | UI-01 | Dashboard layout broken | Refactored to Flex Column. | ✅ Fixed |
| **Dashboard** | UI-02 | Basic Mode UI too bare | Added chatbot polish, bubbles, chips. | ✅ Fixed |
| **Dashboard** | UI-07 | Empty calendar | Date serialization fixed. | ✅ Fixed |
| **Dashboard** | UI-08 | Sidebar tooltips missing | Added tooltips. | ✅ Fixed |
| **Dashboard** | UI-09 | Settings nav broken | Sidebar cog routes to settings. | ✅ Fixed |
| **Dashboard** | UI-10 | Redundant Map icon | Removed. | ✅ Fixed |
| **Dashboard** | UI-11 | Sidebar toggle logic | Tradie/Agent icons toggle sub-menus. | ✅ Fixed |
| **Dashboard** | UI-12 | React Error #310 | Suspense boundary + ThemeProvider added. | ✅ Fixed |
| **Dashboard** | UI-13 | react-resizable-panels crash | Downgraded to v2.1.7. | ✅ Fixed |
| **Dashboard** | UI-14 | Duplicate client-page.tsx | Removed. | ✅ Fixed |
| **Dashboard** | UI-15 | Activity feed nav broken | Replaced with `router.push()`. | ✅ Fixed |
| **Dashboard** | UI-16 | Tradie Map 404s | Fixed sidebar links. | ✅ Fixed |
| **Dashboard** | FE-3 | 75/25 split polish | Advanced mode responsive polish. | 🚧 Task |
| **Dashboard** | FE-4 | Mobile responsive pass | Sidebar/panels mobile improvements. | 🚧 Task |
| **Dashboard** | T-1 | Interactive Tutorial | Build overlay tutorial. | 🚧 Task |
| **Dashboard / Inbox** | UI-21 | Missing "Call" button | "Sticky header" with call button missing from Inbox. | ❌ Open |
| **Dashboard / Kanban** | FE-9 | Kanban card background | Change background color for stale/rotting deals. | 🚧 Task |
| **Dashboard / Kanban** | SH-1 | Industry-aware kanban | Dynamic column headers via `pipeline-actions.ts`. | 🚧 Task |
| **Deal Detail Page** | UI-20 | Crash (Images not defined) | `ReferenceError: Images is not defined`. | ❌ Open |
| **Global / UI** | NAV-01 | Global search broken | Integrated via Header. | ✅ Fixed |
| **Global / UI** | NAV-02 | Hardcoded workspace ID | Uses `useShellStore`. | ✅ Fixed |
| **Global / UI** | NAV-03 | Workspace ID TODO | Uses `useShellStore`. | ✅ Fixed |
| **Global / UI** | FE-1 | UI Polish pass | Gradients, shadows, skeletons, spacing. | 🚧 Task |
| **Global / UI** | X-17 | UI Polish | (Duplicate of FE-1) App looks "barebones". | 🚧 Task |
| **Infrastructure** | INFRA-01 | No test suite | Vitest installed, 35 tests. | ✅ Fixed |
| **Infrastructure** | INFRA-02 | Auto-retreat canvas | Timer implemented. | ✅ Fixed |
| **Infrastructure** | INFRA-03 | Hydration mismatch | Suspense boundaries added. | ✅ Fixed |
| **Infrastructure** | INFRA-04 | Vercel 500 Error | Missing Env Vars (fixed in config). | ✅ Fixed |
| **Infrastructure** | BUILD-01 | Prisma version mismatch | Aligned at 5.21.1. | ✅ Fixed |
| **Infrastructure** | BUILD-02 | TypeScript build errors | 8 critical errors fixed. | ✅ Fixed |
| **Infrastructure** | BUILD-03 | tsconfig duplicates | Removed. | ✅ Fixed |
| **Infrastructure** | BUILD-04 | Leaflet SSR error | Dynamic import wrapper added. | ✅ Fixed |
| **Infrastructure** | BUILD-05 | next.config format | Converted to JS. | ✅ Fixed |
| **Infrastructure** | BUILD-06 | Service worker error | Skips navigate requests. | ✅ Fixed |
| **Kiosk** | BE-5 | Self-registration page | Mobile-friendly registration page needed. | 🚧 Task |
| **Kiosk** | K-3 | Self-registration page | (Duplicate of BE-5) Kiosk self-registration page. | 🚧 Task |
| **Map** | UI-03 | Map z-index bleed | Fixed. | ✅ Fixed |
| **Map** | UI-04 | Map popup not interactive | Added buttons. | ✅ Fixed |
| **Map** | UI-18 | Map view not in nav | Added `/dashboard/map`. | ✅ Fixed |
| **Mobile / App** | SH-2 | Magic Keys system | QR scanner, key checkout flow. | 🚧 Task |
| **Mobile / App** | SH-3 | Payment integration | Stripe Terminal / Square Reader. | ⏭️ Deferred |
| **Mobile / App** | DEF-01 | Photo annotation | Low priority. | ⏭️ Deferred |
| **Mobile / App** | DEF-02 | Video recording | Low priority. | ⏭️ Deferred |
| **Mobile / App** | DEF-03 | Payment terminal | Low priority. | ⏭️ Deferred |
| **Mobile / App** | J-7 | Photo annotation | (Duplicate of DEF-01). | 🚧 Task |
| **Mobile / App** | J-10 | Video recording | (Duplicate of DEF-02). | 🚧 Task |
| **Mobile / App** | X-13 | Mobile responsive pass | (Duplicate of FE-4). | 🚧 Task |
| **Schedule / Calendar** | UI-05 | Calendar grid alignment | Fixed sticky headers and row heights. | ✅ Fixed |
| **Schedule / Calendar** | UI-06 | Calendar aesthetics | Upgraded to Google Calendar style. | ✅ Fixed |
| **Tradie** | TRADE-01 | Material DB minimal | Expanded. | ✅ Fixed |
| **Tradie** | TRADE-02 | MaterialPicker missing | Rendered in Billing. | ✅ Fixed |
| **Tradie** | TRADE-03 | Voice-to-text | Extracted hook. | ✅ Fixed |
| **Tradie** | TRADE-04 | Safety check modal | Wired to ON_SITE. | ✅ Fixed |
| **Tradie** | TRADE-05 | Travel workflow incomplete | SMS integration added. | ✅ Fixed |
| **Tradie** | TRADE-06 | Next job calculation | Server actions implemented. | ✅ Fixed |
| **Tradie** | TRADE-07 | Today's jobs filter | Filtering added. | ✅ Fixed |
| **Tradie** | TRADE-08 | Financial stats | Wired to dashboard. | ✅ Fixed |
| **Tradie** | TRADE-09 | Job Scheduling Failed | `DealStage` enum mismatch. | ❌ Open |
| **Tradie** | TRADE-10 | Start Travel button | Not visible on desktop. | ❌ Open |
| **Tradie** | UI-16 | Tradie Map/Schedule 404 | Link fixes. | ✅ Fixed |
| **Tradie** | UI-17 | DealView type mismatch | Fixed with casting. | ✅ Fixed |
| **Tradie** | J-3 | Travel workflow UI | Safety Check UI (START -> ARRIVED -> ON SITE). | 🚧 Task |
| **Tradie** | J-5 | Safety Check | Build the modal (Duplicate of TRADE-04/J-3?). | 🚧 Task |
| **Tradie** | J-8 | Voice-to-text on job page | Mic icon on job detail page. | 🚧 Task |
| **Tradie** | J-11 | Signature pad | Wiring `signature-pad.tsx`. | 🚧 Task |
| **Tradie** | FE-5 | Travel workflow UI | (Duplicate of J-3). | 🚧 Task |
| **Tradie** | FE-6 | Voice-to-text on job page | (Duplicate of J-8). | 🚧 Task |
| **Tradie** | FE-7 | Signature pad wiring | (Duplicate of J-11). | 🚧 Task |
| **Tradie** | FE-8 | Bottom sheet polish | Mobile UX, swipe gestures. | 🚧 Task |
| **Tradie** | D-6 | Bottom sheet polish | (Duplicate of FE-8). | 🚧 Task |
