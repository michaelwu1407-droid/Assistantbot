# PJ BUDDY — GAP ANALYSIS vs. EXTREME GRANULAR WALKTHROUGH

**Date**: 2026-02-07
**Prepared by**: Claude Code (Backend)
**Purpose**: Compare current codebase state against the target UX walkthrough, identify all gaps, and assign fixes.

---

## LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ | Exists and works |
| ⚠️ | Partially exists — needs rework |
| ❌ | Missing — needs to be built |
| 🔧 | Backend fix (Claude Code / Aider) |
| 🎨 | Frontend fix (Antigravity) |
| 🔧🎨 | Both teams required |

---

## SECTION 1: THE 3 MODES

### 1.1 Tutorial Mode (First Login) — 50/50 Split Screen

| Requirement | Status | Notes |
|-------------|--------|-------|
| Split-screen layout | ⚠️ | Currently 75/25 split. Spec says **50/50** |
| Left: The App Canvas (dimmed) | ❌ | Currently shows a **mock** pipeline, not the real app canvas. Should show the actual app UI (dimmed/greyed out) |
| Right: The Chatbot | ⚠️ | Currently shows a mock chat pane with static messages, not the real chatbot |
| Interactive: Bot says "Click the Map", Map button highlights, user clicks | ❌ | Tutorial is **passive** (Next button only). Spec requires **interactive guided clicks** on real UI elements |
| Tutorial triggers on every sign-in (troubleshooting) | ✅ | Setup page redirects to /tutorial for onboarded users |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| T-1 | Redesign tutorial as interactive overlay on real dashboard (not a separate mock page). Bot gives instructions, real UI elements highlight, user clicks them to advance | 🎨 Antigravity | HIGH |
| T-2 | Change split to 50/50 (or make it an overlay with dimmed background + spotlight) | 🎨 Antigravity | HIGH |
| T-3 | Wire tutorial chatbot to real AssistantPane (right side shows actual chat that responds) | 🎨 Antigravity | MEDIUM |

---

### 1.2 Basic Mode (Default — "Chatbot First")

| Requirement | Status | Notes |
|-------------|--------|-------|
| Default view is clean central chat (like ChatGPT/Gemini) | ❌ | DashboardProvider defaults to `"advanced"`. Chat mode exists but shows a sidebar-style card, not a full-page clean chat |
| User types "Start my day" | ⚠️ | "Start day" triggers morning digest text, but does NOT switch UI mode |
| App Canvas slides in from the left to show relevant info | ❌ | No mechanism for chat responses to trigger UI mode changes. Canvas just shows/hides with toggle button |
| Canvas retreats after showing info | ❌ | No auto-retreat behavior |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| M-1 | Change DashboardProvider default mode to `"chat"` for new users (store preference in workspace `mode_preference` field) | 🔧🎨 Both | HIGH |
| M-2 | Redesign chat mode to be full-page centered chat (like ChatGPT), not a sidebar card | 🎨 Antigravity | HIGH |
| M-3 | Add `mode_preference` column to Workspace schema (ENUM: SIMPLE/ADVANCED, default SIMPLE) | 🔧 Backend | MEDIUM |
| M-4 | Chat response "action" field should trigger UI mode changes (e.g., "start day" → switch to advanced + show map/pipeline) | 🔧🎨 Both | HIGH |
| M-5 | Add auto-retreat behavior: canvas slides out after N seconds or when user returns to chat | 🎨 Antigravity | LOW |

---

### 1.3 Advanced Mode (Power User)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Split pane layout | ✅ | Dashboard layout has main + aside |
| Left (70%): App Canvas always visible | ⚠️ | Currently `flex-1` (dynamic) not fixed 70%. Close enough, but chatbot is `w-[400px]` fixed, not 30% |
| Right (30%): Chatbot co-pilot | ⚠️ | Fixed 400px width, not 30%. On small screens this may not work well |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| A-1 | Change aside width from `w-[400px]` to `w-[30%]` and main from `flex-1` to `w-[70%]` (with min-width guards) | 🎨 Antigravity | LOW |

---

## SECTION 2: SCENARIO A — THE TRADIE (Scott & "Travis")

### 2.1 Morning Routine (Basic Mode)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Opens app, sees only central chat | ❌ | See M-1, M-2 above |
| Types "Start Day" | ⚠️ | Recognized as "morning_digest" intent but only returns text |
| Chat retreats, Map Canvas slides in full screen | ❌ | No mode switch from chat, no map auto-display |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| S-1 | "Start Day" intent should: (a) return morning digest text, (b) signal frontend to switch to Advanced Mode, (c) navigate to `/dashboard/tradie/map` | 🔧🎨 Both | HIGH |

---

### 2.2 The Dashboard (Map View)

| Requirement | Status | Notes |
|-------------|--------|-------|
| **Header — "Good Morning, Scott"** | ❌ | Current tradie page shows "Tradie View" with no personalization |
| **Header — Weather Icon** | ❌ | No weather API integration |
| **Header — Global Search (magnifying glass)** | ⚠️ | SearchCommand exists but only in dashboard layout header (top right), not in tradie pages |
| **Header — Notification Bell (red dot)** | ❌ | No notification system at all |
| **"The Pulse" Widget** (floating pill: "Wk: $4.2k | Owe: $850") | ❌ | No financial summary overlay on map |
| **Dark Mode Google Map** with numbered pins + route line | ❌ | Map is placeholder ("Waiting for GPS signal..."). Leaflet component exists but only used on map subpage (also broken — shows "Map unavailable") |
| **Bottom Sheet (collapsed)** showing next job | ❌ | No bottom sheet component |
| **Bottom Sheet (expanded)** with job details + Quick Actions (Navigate, Call, Text, Parts) | ❌ | No bottom sheet, no quick actions row |
| **Dark theme** (Slate-950, Neon Green) | ⚠️ | Tradie page has dark styling (slate-800/900) but inconsistent — some cards use light theme. No neon green accents |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| D-1 | Add personalized greeting header ("Good Morning, [Name]") using workspace.name | 🎨 Antigravity | MEDIUM |
| D-2 | Weather API integration (e.g., Open-Meteo free API — no key needed) — show icon in header | 🔧 Backend | LOW |
| D-3 | Build notification system: schema (Notification model), bell icon with unread count, dropdown list | 🔧🎨 Both | MEDIUM |
| D-4 | Build "Pulse" widget (server action to compute weekly revenue + outstanding invoices) | 🔧🎨 Both | MEDIUM |
| D-5 | Fix map view: integrate Leaflet properly on tradie page with dark tiles, numbered pins from geocoded deals, route line (polyline connecting today's jobs in order) | 🎨 Antigravity | HIGH |
| D-6 | Build BottomSheet component (collapsed = next job preview, expanded = job details + quick actions) | 🎨 Antigravity | HIGH |
| D-7 | Apply consistent dark theme with neon green accents to all tradie pages | 🎨 Antigravity | MEDIUM |
| D-8 | Build "Next Job" server action: calculate next job based on time/location | 🔧 Backend | MEDIUM |
| D-9 | Add "today's jobs" concept — filter deals/jobs by scheduled date | 🔧 Backend | MEDIUM |

---

### 2.3 Job Execution — The Workflow

This is the **largest gap** in the entire application. Almost none of the job execution workflow exists.

| Requirement | Status | Notes |
|-------------|--------|-------|
| Job Details Page | ⚠️ | Deal detail page exists (`/dashboard/deals/[id]`) but it's generic CRM, not tradie job-specific |
| "START TRAVEL" → "ARRIVED" button (massive neon green footer btn) | ❌ | No travel tracking workflow |
| Auto-SMS to client on "On My Way" | ❌ | Twilio SMS action exists but not wired to any travel trigger |
| Safety Check modal (toggles: Power Off? Site Clear?) | ❌ | No safety checklist |
| Camera FAB (floating action button) | ❌ | No camera integration |
| AI photo annotation (draw to circle damage) | ❌ | No canvas/drawing capability |
| Voice-to-text transcription to Job Diary | ⚠️ | SpeechRecognition exists in AssistantPane but not on job detail/camera view |
| Field Quoting with material search | ⚠️ | EstimatorForm exists but no material database/search |
| Video Explanation recording | ❌ | No video recording |
| Sign-on-Glass (client signature) | ❌ | No signature pad component |
| Payment Terminal (NFC card tap) | ❌ | No payment integration (Stripe/Square) |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| J-1 | Build Tradie Job Detail page (`/dashboard/tradie/jobs/[id]`) with job-specific layout: job info, client info, job diary, photos, billing tabs | 🎨 Antigravity | HIGH |
| J-2 | Add `scheduledDate`, `status` (SCHEDULED/TRAVELING/ON_SITE/COMPLETE) fields to Deal or new Job model | 🔧 Backend | HIGH |
| J-3 | Build travel workflow: START TRAVEL button → sends auto-SMS to client → ARRIVED button → Safety Check modal → ON SITE | 🔧🎨 Both | HIGH |
| J-4 | Wire "On My Way" SMS: server action that sends SMS via Twilio using job contact phone + template | 🔧 Backend | MEDIUM |
| J-5 | Safety Check modal: toggleable checklist (configurable per workspace) | 🎨 Antigravity | MEDIUM |
| J-6 | Camera integration: FAB button opening device camera, save photos to job record (need file storage — Supabase Storage or S3) | 🔧🎨 Both | HIGH |
| J-7 | Photo annotation: HTML Canvas overlay for drawing on captured photos | 🎨 Antigravity | LOW |
| J-8 | Voice-to-text on job detail: mic icon that transcribes to job diary/notes | 🎨 Antigravity | MEDIUM |
| J-9 | Material database: seed common trade materials (plumbing, electrical, etc.) with prices. Search autocomplete in estimator | 🔧 Backend | MEDIUM |
| J-10 | Video recording: MediaRecorder API to capture explanation videos, save to storage | 🔧🎨 Both | LOW |
| J-11 | Sign-on-Glass: HTML Canvas signature pad component + save signature image to job/invoice | 🎨 Antigravity | MEDIUM |
| J-12 | Payment integration: Stripe Terminal SDK or Square Reader SDK for NFC tap-to-pay | 🔧🎨 Both | LOW (Post-MVP) |
| J-13 | "Complete Job" button that triggers payment flow and deal stage update | 🔧🎨 Both | MEDIUM |

---

## SECTION 3: SCENARIO B — THE AGENT (Sarah & "Pj")

### 3.1 Agent Dashboard (Advanced Mode)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Split Pane: Canvas + Chatbot | ✅ | Dashboard layout already does this |
| **Speed-to-Lead Widget** (horizontal bubble list with time-since-inquiry) | ❌ | No speed-to-lead tracking. Agent page shows hardcoded "Active Visitors: 12" |
| **Commission Calculator** ($ slider widget dropdown) | ❌ | No commission calculator |
| **"Rotting" Pipeline** (Kanban, 7+ day cards turn light red background) | ⚠️ | Kanban exists ✅, stale/rotting badges exist ✅, but cards have **border** color change, not **background** color change as spec requires |
| **Matchmaker Feed** sidebar ("3 Buyers found for 12 Smith St.") | ❌ | BuyerMatchmaker component exists but only on deal detail page, not as a sidebar feed |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| AG-1 | Build Speed-to-Lead widget: shows recent inquiries as horizontal bubbles with time elapsed (green < 5min, amber < 1hr, red > 1hr). Needs `createdAt` tracking on new leads/contacts | 🎨 Antigravity | HIGH |
| AG-2 | Build Commission Calculator: dropdown/modal with slider for sale price, commission %, split %, calculates take-home | 🎨 Antigravity | MEDIUM |
| AG-3 | Change deal card background from white to light red when >7 days (currently only border changes) | 🎨 Antigravity | LOW |
| AG-4 | Build Matchmaker Feed sidebar widget: server action to run match scan across all active listings, show aggregated "X buyers found for Y listing" feed | 🔧🎨 Both | MEDIUM |
| AG-5 | Replace hardcoded data on Agent page with real data (Active Visitors from OpenHouseLog, Recent Leads from contacts) | 🔧🎨 Both | HIGH |

---

### 3.2 Magic Keys

| Requirement | Status | Notes |
|-------------|--------|-------|
| Bottom Navigation Rail with Key icon | ❌ | Sidebar exists (vertical, left) but no bottom nav rail. No Key icon |
| Camera scans QR tag on physical keys | ❌ | QR generation exists but no QR **scanning** |
| Toast: "Keys checked out to Sarah" | ❌ | No toast notification system |
| Key tracking (who has which keys) | ❌ | No Key model in schema |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| MK-1 | Add Key model to schema (id, propertyRef, dealId, checkedOutTo, checkedOutAt, checkedInAt) | 🔧 Backend | LOW |
| MK-2 | Add key management server actions (checkOutKey, checkInKey, getKeyStatus) | 🔧 Backend | LOW |
| MK-3 | Build QR scanner component using device camera (e.g., `html5-qrcode` library) | 🎨 Antigravity | LOW |
| MK-4 | Add toast notification system (e.g., Sonner or react-hot-toast) | 🎨 Antigravity | MEDIUM |
| MK-5 | Add Key icon to sidebar/bottom nav for Agent mode | 🎨 Antigravity | LOW |

---

### 3.3 Open House (Kiosk Mode)

| Requirement | Status | Notes |
|-------------|--------|-------|
| "Kiosk Mode" button in sidebar | ❌ | Kiosk link only exists on deal detail page. Not in sidebar |
| Full screen house image + "Scan to Check In" QR code | ⚠️ | Kiosk page has hero image ✅ but no QR code displayed for visitors to scan |
| Visitor scans QR on their own phone OR types into iPad form | ⚠️ | iPad form exists ✅, QR self-scan flow does not |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| K-1 | Add "Kiosk Mode" link to sidebar when in Agent mode (opens /kiosk/open-house) | 🎨 Antigravity | LOW |
| K-2 | Display QR code on kiosk page that visitors can scan on their own phone to self-register (use existing `generateQRSVG()`) | 🔧🎨 Both | MEDIUM |
| K-3 | Build self-registration page (mobile-friendly form visitors reach after scanning QR) | 🎨 Antigravity | MEDIUM |

---

### 3.4 Vendor Reporting

| Requirement | Status | Notes |
|-------------|--------|-------|
| Listing Detail Page | ⚠️ | Deal detail page exists but not listing-specific |
| **Price Feedback Meter** (gauge chart: buyer avg vs vendor goal) | ❌ | No feedback tracking, no gauge chart |
| "Send Vendor Report" button | ❌ | No vendor report generation |
| WhatsApp Preview modal (pre-written message + PDF link) | ❌ | WhatsApp sending action exists (Twilio) but no preview modal, no PDF |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| VR-1 | Add `vendorGoalPrice` to Deal metadata for real estate listings | 🔧 Backend | MEDIUM |
| VR-2 | Add buyer feedback tracking: `BuyerFeedback` model (dealId, buyerContactId, priceOffered, notes, createdAt) | 🔧 Backend | MEDIUM |
| VR-3 | Build Price Feedback Meter: gauge/arc chart showing buyer avg vs vendor goal | 🎨 Antigravity | MEDIUM |
| VR-4 | Build Vendor Report PDF generation (listing photos, buyer feedback summary, market insights) | 🔧 Backend | MEDIUM |
| VR-5 | Build WhatsApp Preview modal: shows pre-composed message + PDF attachment, "Send" button calls sendWhatsApp() | 🎨 Antigravity | MEDIUM |

---

## SECTION 4: CROSS-CUTTING ISSUES (Bugs & Architecture)

These are issues that affect the entire app regardless of scenario.

| # | Issue | Status | Owner | Priority |
|---|-------|--------|-------|----------|
| X-1 | **No real authentication** — all pages use hardcoded "demo-user". No login/session/JWT | ❌ | 🔧 Backend | **CRITICAL** |
| X-2 | **No middleware.ts** — no auth guards, no redirect for unauthenticated users | ❌ | 🔧 Backend | **CRITICAL** |
| X-3 | **No toast notifications** — no feedback system for user actions (success/error) | ❌ | 🎨 Antigravity | HIGH |
| X-4 | **Kanban columns are hardcoded** to generic CRM stages (New/Contacted/Negotiation/Won/Lost). Should be **industry-aware**: Trades = New Lead/Quoted/In Progress/Invoiced/Paid. Real Estate = New Listing/Appraised/Under Offer/Exchanged/Settled | ⚠️ | 🔧🎨 Both | HIGH |
| X-5 | **DealStage enum mismatch** — Prisma has 6 stages (NEW, CONTACTED, NEGOTIATION, INVOICED, WON, LOST) but walkthrough spec needs industry-specific stages. May need flexible stage system | ⚠️ | 🔧 Backend | HIGH |
| X-6 | **Agent page is entirely hardcoded** — "Active Visitors: 12", "John Doe" leads are mock data, not from DB | ❌ | 🔧🎨 Both | HIGH |
| X-7 | **Tradie page is a placeholder** — just a GPS animation and 3 identical "Emergency Fix" cards | ❌ | 🎨 Antigravity | HIGH |
| X-8 | **No "New Deal" form/modal** — the "+ New Deal" button on dashboard does nothing (no onClick handler) | ❌ | 🎨 Antigravity | HIGH |
| X-9 | **Settings button does nothing** — sidebar Settings icon has no route or modal | ❌ | 🎨 Antigravity | MEDIUM |
| X-10 | **Logout button does nothing** — no logout flow (because no real auth) | ❌ | 🔧 Backend | MEDIUM |
| X-11 | **GitHub OAuth button still on login page** — spec says REMOVE (keep only Google + Email) | ⚠️ | 🎨 Antigravity | LOW |
| X-12 | **Chat doesn't trigger UI changes** — processChat returns text only, never triggers mode switches, page navigation, or canvas updates | ❌ | 🔧🎨 Both | HIGH |
| X-13 | **No mobile responsiveness** for dashboard — sidebar + main + assistant pane all compete for space on mobile | ⚠️ | 🎨 Antigravity | MEDIUM |
| X-14 | **"New Deal" button text should be industry-aware** — "New Job" for trades, "New Listing" for agents | ⚠️ | 🎨 Antigravity | LOW |
| X-15 | **File/photo storage** — no file upload or storage system (needed for photos, documents, PDFs) | ❌ | 🔧 Backend | HIGH |
| X-16 | **Estimator typo** — "Generatiing" (double i) in estimator-form.tsx line 202 | ⚠️ | 🎨 Antigravity | LOW |

---

## SECTION 5: PRIORITY MATRIX

### P0 — CRITICAL (App doesn't function without these)

| # | Task | Owner | Description |
|---|------|-------|-------------|
| X-1 | Auth | 🔧 Backend | Implement real authentication (NextAuth.js or Supabase Auth) |
| X-2 | Middleware | 🔧 Backend | Auth guards for protected routes |
| X-4/X-5 | Industry stages | 🔧🎨 Both | Kanban columns match industry, flexible DealStage |
| X-8 | New Deal form | 🎨 Antigravity | Modal/form to create deals from dashboard |
| M-1/M-2 | Chat-first default | 🔧🎨 Both | Default to chat mode, full-page chat UI |
| X-6 | Agent page real data | 🔧🎨 Both | Replace hardcoded agent page with DB data |
| X-7 | Tradie page real data | 🎨 Antigravity | Replace placeholder with real job cards from DB |

### P1 — HIGH (Core walkthrough features)

| # | Task | Owner | Description |
|---|------|-------|-------------|
| D-5 | Map view | 🎨 Antigravity | Working Leaflet map with pins + route |
| D-6 | Bottom Sheet | 🎨 Antigravity | Mobile-first bottom sheet for job preview |
| T-1 | Interactive tutorial | 🎨 Antigravity | Overlay on real UI, not separate mock page |
| J-1 | Job detail page | 🎨 Antigravity | Tradie job-specific detail view |
| J-2 | Job status model | 🔧 Backend | SCHEDULED → TRAVELING → ON_SITE → COMPLETE |
| J-3 | Travel workflow | 🔧🎨 Both | START TRAVEL → ARRIVED → Safety → Work |
| J-6 | Camera/photos | 🔧🎨 Both | Capture + store job photos |
| AG-1 | Speed-to-Lead | 🎨 Antigravity | Horizontal bubble widget with time tracking |
| AG-5 | Agent real data | 🔧🎨 Both | Wire agent page to DB |
| X-3 | Toast system | 🎨 Antigravity | Install Sonner or similar |
| X-12 | Chat triggers UI | 🔧🎨 Both | Chat responses can switch modes/navigate |
| X-15 | File storage | 🔧 Backend | Supabase Storage for photos/PDFs |
| M-4 | Chat → UI bridge | 🔧🎨 Both | Action field triggers mode changes |

### P2 — MEDIUM (Important but not blocking)

| # | Task | Owner | Description |
|---|------|-------|-------------|
| D-1 | Greeting header | 🎨 Antigravity | "Good Morning, [Name]" |
| D-3 | Notifications | 🔧🎨 Both | Bell icon with notification list |
| D-4 | Pulse widget | 🔧🎨 Both | Financial summary overlay |
| D-7 | Dark theme | 🎨 Antigravity | Consistent tradie dark mode |
| D-8/D-9 | Job scheduling | 🔧 Backend | Next job calculation, today's jobs |
| J-4 | On My Way SMS | 🔧 Backend | Auto-SMS on travel start |
| J-5 | Safety check | 🎨 Antigravity | Modal with toggles |
| J-8 | Voice on job page | 🎨 Antigravity | Mic icon for job diary |
| J-9 | Material DB | 🔧 Backend | Searchable materials catalog |
| J-11 | Signature pad | 🎨 Antigravity | Sign-on-glass component |
| J-13 | Complete Job | 🔧🎨 Both | Job completion + payment flow |
| AG-2 | Commission calc | 🎨 Antigravity | Slider widget for earnings |
| AG-4 | Match feed | 🔧🎨 Both | Sidebar showing matched buyers |
| K-2/K-3 | Kiosk QR | 🔧🎨 Both | QR display + self-reg page |
| VR-1–5 | Vendor reports | 🔧🎨 Both | Feedback meter + PDF + WhatsApp |
| M-3 | Mode preference | 🔧 Backend | Persist user's mode choice |
| MK-4 | Toast system | 🎨 Antigravity | Sonner or react-hot-toast |
| X-9 | Settings page | 🎨 Antigravity | Workspace settings UI |
| X-13 | Mobile responsive | 🎨 Antigravity | Dashboard works on phones |

### P3 — LOW (Nice to have / Post-MVP)

| # | Task | Owner | Description |
|---|------|-------|-------------|
| D-2 | Weather API | 🔧 Backend | Show weather icon |
| J-7 | Photo annotation | 🎨 Antigravity | Draw on photos |
| J-10 | Video recording | 🔧🎨 Both | Record explanation videos |
| J-12 | NFC payments | 🔧🎨 Both | Stripe Terminal / Square |
| MK-1–3,5 | Magic Keys | 🔧🎨 Both | Full key management system |
| A-1 | Width ratios | 🎨 Antigravity | 70/30 split percentages |
| M-5 | Canvas auto-retreat | 🎨 Antigravity | Auto-hide canvas |
| X-11 | Remove GitHub btn | 🎨 Antigravity | Clean up login page |
| X-14 | Industry-aware labels | 🎨 Antigravity | "New Job" / "New Listing" |
| X-16 | Estimator typo | 🎨 Antigravity | Fix "Generatiing" |

---

## SECTION 6: SUMMARY COUNTS

| Category | Total Items | Backend (🔧) | Frontend (🎨) | Both (🔧🎨) |
|----------|-------------|---------------|----------------|--------------|
| P0 — Critical | 7 | 2 | 3 | 2 |
| P1 — High | 13 | 3 | 6 | 4 |
| P2 — Medium | 19 | 5 | 7 | 7 |
| P3 — Low | 9 | 1 | 5 | 3 |
| **TOTAL** | **48** | **11** | **21** | **16** |

### By Owner:
- **Antigravity (Frontend)**: ~37 items (21 solo + 16 shared)
- **Backend (Claude Code / Aider)**: ~27 items (11 solo + 16 shared)

---

## SECTION 7: RECOMMENDED EXECUTION ORDER

### Sprint 1 — Foundation (Week 1)
1. **X-1**: Real auth (Backend) — Supabase Auth or NextAuth
2. **X-2**: Middleware auth guards (Backend)
3. **X-4/X-5**: Industry-aware kanban stages (Both)
4. **X-8**: New Deal modal/form (Frontend)
5. **M-1/M-2**: Chat-first default mode + full-page chat UI (Both)
6. **X-3**: Toast notification system (Frontend)

### Sprint 2 — Core Scenarios (Week 2)
1. **X-6/AG-5**: Agent page real data (Both)
2. **X-7**: Tradie page real data (Frontend)
3. **D-5**: Working map with pins (Frontend)
4. **J-1/J-2**: Job detail page + status model (Both)
5. **X-12/M-4**: Chat → UI bridge (Both)
6. **AG-1**: Speed-to-Lead widget (Frontend)

### Sprint 3 — Workflows (Week 3)
1. **J-3/J-4**: Travel workflow + auto-SMS (Both)
2. **J-6/X-15**: Camera + file storage (Both)
3. **D-6**: Bottom Sheet component (Frontend)
4. **T-1/T-2**: Interactive tutorial redesign (Frontend)
5. **D-1/D-3**: Greeting header + notifications (Both)

### Sprint 4 — Polish (Week 4)
1. **D-4/D-7**: Pulse widget + dark theme (Both)
2. **J-5/J-8/J-9**: Safety check + voice + materials (Both)
3. **AG-2/AG-4**: Commission calc + match feed (Both)
4. **VR-1–5**: Vendor reporting (Both)
5. **K-2/K-3**: Kiosk QR flow (Both)
6. **J-11/J-13**: Signature + complete job (Both)

---

## SECTION 8: WHAT'S WORKING WELL

Credit where due — these are solid:

1. **Prisma schema** — 10 models, well-structured with proper relations and indexes
2. **18 server actions** — comprehensive backend covering all verticals
3. **Kanban board** — dnd-kit drag-and-drop works smoothly
4. **Deal health system** — stale/rotting logic with visual indicators
5. **Chat parser** — handles 14+ intents with industry-aware language
6. **Onboarding flow** — signup → setup → tutorial → dashboard routing
7. **Estimator form** — line items, GST calc, invoice generation
8. **Kiosk form** — clean open house check-in flow
9. **Buyer matchmaker** — budget + bedroom matching
10. **Command palette** — CMD+K search across contacts/deals
11. **Activity feed** — timeline view with icons and timestamps
12. **Fuzzy search** — Levenshtein-based matching that handles typos
