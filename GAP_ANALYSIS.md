# PJ BUDDY — GAP ANALYSIS vs. EXTREME GRANULAR WALKTHROUGH

**Date**: 2026-02-08 (Updated: Documentation Sync)
**Prepared by**: Claude Code (Backend)
**Purpose**: Compare current codebase state against the target UX walkthrough, identify all gaps, and assign fixes.

> **OWNER FEEDBACK (2026-02-07)**:
> 1. Split screen should be **75/25** (not 50/50 or 70/30). Chat pane is always 25% on the right.
> 2. Tutorial must be **interactive** (not passive). Currently it shows poorly formatted screens (buttons overlapping, etc.). Should walk through **ALL features** of the app (at least for troubleshooting).
> 3. **Basic Mode (Chat First)**: Chatbot interface is the primary thing on screen. Chatbot only gets pushed to the side when Advanced Mode is toggled on, and the actual app becomes the main focus.
> 4. **Overall formatting and colour scheme**: Looks barebones and unpolished. Needs significant design improvement.

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

### 1.1 Tutorial Mode (First Login) — 75/25 Split Screen

| Requirement | Status | Notes |
|-------------|--------|-------|
| Split-screen layout (75/25) | ✅ | Shell.tsx supports TUTORIAL mode with 75/25 split (Sprint 9) |
| Left (75%): The App Canvas (dimmed) | ⚠️ | Tutorial overlay now shows on real dashboard with spotlight highlighting, but dimming could be improved |
| Right (25%): The Chatbot | ✅ | Real assistant pane shown in tutorial mode (Sprint 9) |
| Interactive: Bot says "Click the Map", Map button highlights, user clicks | ⚠️ | 18-step tutorial with spotlighting exists (Sprint 9) but not fully interactive (click-to-advance on real elements) |
| Walk through ALL features (for troubleshooting) | ⚠️ | 18 steps now cover most features but may need expansion for completeness |
| Tutorial triggers on every sign-in (troubleshooting) | ✅ | Setup page redirects to /tutorial for onboarded users |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| T-1 | ~~Redesign tutorial as interactive overlay on real dashboard~~ → 18-step spotlight tutorial built (Sprint 9). Still needs full click-to-advance interactivity on real UI elements | ✅⚠️ Antigravity | **Done (needs polish)** |
| T-2 | ~~Fix layout issues~~ → Shell.tsx TUTORIAL mode with 75/25 split implemented (Sprint 9) | ✅ Antigravity | **Done** |
| T-3 | ~~Wire tutorial chatbot to real AssistantPane~~ → Tutorial mode shows real chat pane (Sprint 9) | ✅ Antigravity | **Done** |

---

### 1.2 Basic Mode (Default — "Chatbot First")

> **OWNER CLARIFICATION**: In Basic Mode, the chatbot IS the primary thing on screen (full width, centered, like ChatGPT). The chatbot only gets pushed to the 25% right side when the user toggles to Advanced Mode, at which point the actual app canvas takes the 75% left.

| Requirement | Status | Notes |
|-------------|--------|-------|
| Default view is clean central chat (like ChatGPT/Gemini) — chatbot is PRIMARY | ✅ | DashboardProvider now defaults to `"chat"` (2026-02-08) |
| User types "Start my day" | ⚠️ | "Start day" triggers morning digest text, but does NOT switch UI mode |
| Toggle to Advanced Mode → chatbot shrinks to 25% right, app canvas takes 75% left | ⚠️ | Currently uses `w-[400px]` fixed width for chat, not 25%. Main canvas doesn't fill 75% |
| Canvas slides in from the left to show relevant info | ⚠️ | Chat→UI bridge implemented (Sprint 9) — assistant-pane handles navigation actions, but no animated slide-in |
| Canvas retreats after showing info | ❌ | No auto-retreat behavior |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| M-1 | Change DashboardProvider default mode to `"chat"` for new users (store preference in workspace `mode_preference` field) | ✅ | Done (2026-02-08) |
| M-2 | Redesign chat mode to be full-page centered chat (like ChatGPT), not a sidebar card. Chatbot is the PRIMARY interface | 🎨 Antigravity | **CRITICAL** |
| M-3 | Add `mode_preference` column to Workspace/User schema (ENUM: SIMPLE/ADVANCED, default SIMPLE) | ✅ | Added to User model (2026-02-08) |
| M-4 | ~~Chat response "action" field triggers UI mode changes~~ → assistant-pane.tsx handles navigate/switchMode/showPanel actions (Sprint 9) | ✅ Both | **Done** |
| M-5 | When toggling to Advanced Mode: app canvas = 75% left, chatbot = 25% right (not fixed 400px) | 🎨 Antigravity | HIGH |
| M-6 | Add auto-retreat behavior: canvas slides out after N seconds or when user returns to chat | 🎨 Antigravity | LOW |

---

### 1.3 Advanced Mode (Power User) — 75/25 Split

| Requirement | Status | Notes |
|-------------|--------|-------|
| Split pane layout | ✅ | Dashboard layout has main + aside |
| Left (75%): App Canvas always visible | ⚠️ | Currently `flex-1` (dynamic) not fixed 75%. Chatbot is `w-[400px]` fixed, not 25% |
| Right (25%): Chatbot co-pilot | ⚠️ | Fixed 400px width, not 25%. On small screens this may not work well |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| A-1 | Change aside width from `w-[400px]` to `w-1/4` (25%) and main from `flex-1` to `w-3/4` (75%) with min-width guards | 🎨 Antigravity | HIGH |

---

## SECTION 2: SCENARIO A — THE TRADIE (Scott & "Travis")

### 2.1 Morning Routine (Basic Mode)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Opens app, sees only central chat | ✅ | Default mode is now Chat |
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
| **Header — "Good Morning, Scott"** | ✅ | Personalized greeting in header.tsx (Sprint 8/9) |
| **Header — Weather Icon** | ✅ | Weather integrated via getWeather action in header.tsx (Sprint 9) |
| **Header — Global Search (magnifying glass)** | ⚠️ | SearchCommand exists but only in dashboard layout header (top right), not in tradie pages |
| **Header — Notification Bell (red dot)** | ❌ | No notification system at all |
| **"The Pulse" Widget** (floating pill: "Wk: $4.2k | Owe: $850") | ✅ | Implemented in Tradie Page (2026-02-08) |
| **Dark Mode Google Map** with numbered pins + route line | ✅ | Leaflet map implemented with pins (2026-02-08) |
| **Bottom Sheet (collapsed)** showing next job | ❌ | No bottom sheet component |
| **Bottom Sheet (expanded)** with job details + Quick Actions (Navigate, Call, Text, Parts) | ❌ | No bottom sheet, no quick actions row |
| **Dark theme** (Slate-950, Neon Green) | ✅ | Tradie page uses dark styling (2026-02-08) |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| D-1 | ~~Add personalized greeting header~~ → Implemented in header.tsx (Sprint 9) | ✅ | **Done** |
| D-2 | ~~Weather API integration~~ → getWeather action + header.tsx display (Sprint 9) | ✅ | **Done** |
| D-3 | Build notification system: schema (Notification model), bell icon with unread count, dropdown list | 🔧🎨 Both | MEDIUM |
| D-4 | Build "Pulse" widget (server action to compute weekly revenue + outstanding invoices) | ✅ | Done |
| D-5 | Fix map view: integrate Leaflet properly on tradie page with dark tiles, numbered pins from geocoded deals, route line (polyline connecting today's jobs in order) | ✅ | Done |
| D-6 | Build BottomSheet component (collapsed = next job preview, expanded = job details + quick actions) | 🎨 Antigravity | HIGH |
| D-7 | Apply consistent dark theme with neon green accents to all tradie pages | ✅ | Done |
| D-8 | Build "Next Job" server action: calculate next job based on time/location | 🔧 Backend | MEDIUM |
| D-9 | Add "today's jobs" concept — filter deals/jobs by scheduled date | 🔧 Backend | MEDIUM |

---

### 2.3 Job Execution — The Workflow

This is the **largest gap** in the entire application. Almost none of the job execution workflow exists.

| Requirement | Status | Notes |
|-------------|--------|-------|
| Job Details Page | ✅ | Implemented `/dashboard/jobs/[id]` (2026-02-08) |
| "START TRAVEL" → "ARRIVED" button (massive neon green footer btn) | ⚠️ | JobStatusBar component exists with status transitions, but UI needs polish for neon green footer style |
| Auto-SMS to client on "On My Way" | ❌ | Twilio SMS action exists but not wired to any travel trigger |
| Safety Check modal (toggles: Power Off? Site Clear?) | ❌ | No safety checklist |
| Camera FAB (floating action button) | ✅ | camera-fab.tsx implemented with Supabase Storage upload (Sprint 9) |
| AI photo annotation (draw to circle damage) | ❌ | No canvas/drawing capability |
| Voice-to-text transcription to Job Diary | ⚠️ | SpeechRecognition exists in AssistantPane but not on job detail/camera view |
| Field Quoting with material search | ⚠️ | EstimatorForm exists but no material database/search |
| Video Explanation recording | ❌ | No video recording |
| Sign-on-Glass (client signature) | ❌ | No signature pad component |
| Payment Terminal (NFC card tap) | ❌ | No payment integration (Stripe/Square) |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| J-1 | Build Tradie Job Detail page (`/dashboard/tradie/jobs/[id]`) with job-specific layout: job info, client info, job diary, photos, billing tabs | ✅ | Done |
| J-2 | Add `scheduledDate`, `status` (SCHEDULED/TRAVELING/ON_SITE/COMPLETE) fields to Deal or new Job model | 🔧 Backend | HIGH |
| J-3 | Build travel workflow: START TRAVEL button → sends auto-SMS to client → ARRIVED button → Safety Check modal → ON SITE | 🔧🎨 Both | HIGH |
| J-4 | Wire "On My Way" SMS: server action that sends SMS via Twilio using job contact phone + template | 🔧 Backend | MEDIUM |
| J-5 | Safety Check modal: toggleable checklist (configurable per workspace) | 🎨 Antigravity | MEDIUM |
| J-6 | ~~Camera integration~~ → camera-fab.tsx + storage-actions.ts (Sprint 9) | ✅ Both | **Done** |
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
| **Speed-to-Lead Widget** (horizontal bubble list with time-since-inquiry) | ✅ | Implemented (2026-02-08) |
| **Commission Calculator** ($ slider widget dropdown) | ✅ | commission-calculator.tsx implemented (Sprint 9) |
| **"Rotting" Pipeline** (Kanban, 7+ day cards turn light red background) | ⚠️ | Kanban exists ✅, stale/rotting badges exist ✅, but cards have **border** color change, not **background** color change as spec requires |
| **Matchmaker Feed** sidebar ("3 Buyers found for 12 Smith St.") | ✅ | matchmaker-feed.tsx implemented on agent dashboard (Sprint 9) |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| AG-1 | Build Speed-to-Lead widget: shows recent inquiries as horizontal bubbles with time elapsed (green < 5min, amber < 1hr, red > 1hr). Needs `createdAt` tracking on new leads/contacts | ✅ | Done |
| AG-2 | ~~Build Commission Calculator~~ → commission-calculator.tsx (Sprint 9) | ✅ | **Done** |
| AG-3 | Change deal card background from white to light red when >7 days (currently only border changes) | 🎨 Antigravity | LOW |
| AG-4 | ~~Build Matchmaker Feed sidebar widget~~ → matchmaker-feed.tsx + getMatchFeed action (Sprint 9) | ✅ Both | **Done** |
| AG-5 | Replace hardcoded data on Agent page with real data (Active Visitors from OpenHouseLog, Recent Leads from contacts) | ✅ | Done |

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
| Full screen house image + "Scan to Check In" QR code | ✅ | Kiosk page has hero image + QR code for self-registration (Sprint 9) |
| Visitor scans QR on their own phone OR types into iPad form | ⚠️ | iPad form exists ✅, QR self-scan flow does not |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| K-1 | Add "Kiosk Mode" link to sidebar when in Agent mode (opens /kiosk/open-house) | 🎨 Antigravity | LOW |
| K-2 | ~~Display QR code on kiosk page~~ → QR code generated on open-house page (Sprint 9) | ✅ Both | **Done** |
| K-3 | Build self-registration page (mobile-friendly form visitors reach after scanning QR) | 🎨 Antigravity | MEDIUM |

---

### 3.4 Vendor Reporting

| Requirement | Status | Notes |
|-------------|--------|-------|
| Listing Detail Page | ⚠️ | Deal detail page exists with vendor-report-widget and commission calc for RE deals |
| **Price Feedback Meter** (gauge chart: buyer avg vs vendor goal) | ⚠️ | vendor-report-widget.tsx exists but uses **static data** — needs wiring to real BuyerFeedback |
| "Send Vendor Report" button | ✅ | vendor-report-widget.tsx has send button + whatsapp-preview-modal (Sprint 9) |
| WhatsApp Preview modal (pre-written message + PDF link) | ✅ | whatsapp-preview-modal.tsx implemented (Sprint 9) — PDF still stub |

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
| X-1 | **No real authentication** — all pages use hardcoded "demo-user". No login/session/JWT | ✅ | 🔧 Backend | **CRITICAL** |
| X-2 | **No middleware.ts** — no auth guards, no redirect for unauthenticated users | ✅ | 🔧 Backend | **CRITICAL** |
| X-3 | **Toast notifications** — Sonner installed + wired in some components | ⚠️ | 🎨 Antigravity | MEDIUM |
| X-4 | **Kanban columns are hardcoded** to generic CRM stages (New/Contacted/Negotiation/Won/Lost). Should be **industry-aware**: Trades = New Lead/Quoted/In Progress/Invoiced/Paid. Real Estate = New Listing/Appraised/Under Offer/Exchanged/Settled | ⚠️ | 🔧🎨 Both | HIGH |
| X-5 | **DealStage enum mismatch** — Prisma has 6 stages (NEW, CONTACTED, NEGOTIATION, INVOICED, WON, LOST) but walkthrough spec needs industry-specific stages. May need flexible stage system | ✅ | 🔧 Backend | HIGH |
| X-6 | **Agent page is entirely hardcoded** — "Active Visitors: 12", "John Doe" leads are mock data, not from DB | ✅ | 🔧🎨 Both | HIGH |
| X-7 | **Tradie page is a placeholder** — just a GPS animation and 3 identical "Emergency Fix" cards | ✅ | 🎨 Antigravity | HIGH |
| X-8 | **New Deal form/modal** — dashboard-client.tsx has modal for creating deals | ✅ | 🎨 Antigravity | **Done** |
| X-9 | **Settings page** — `/dashboard/settings` routes exist (profile + workspace forms) | ✅ | 🎨 Antigravity | **Done** |
| X-10 | **Logout button does nothing** — no logout flow (because no real auth) | ✅ | 🔧 Backend | MEDIUM |
| X-11 | **GitHub OAuth button still on login page** — spec says REMOVE (keep only Google + Email) | ⚠️ | 🎨 Antigravity | LOW |
| X-12 | **Chat→UI bridge** — assistant-pane.tsx handles navigate/switchMode/showPanel actions from chat responses (Sprint 9) | ✅ | 🔧🎨 Both | **Done** |
| X-13 | **No mobile responsiveness** for dashboard — sidebar + main + assistant pane all compete for space on mobile | ⚠️ | 🎨 Antigravity | MEDIUM |
| X-14 | **"New Deal" button text should be industry-aware** — "New Job" for trades, "New Listing" for agents | ⚠️ | 🎨 Antigravity | LOW |
| X-15 | **File/photo storage** — storage-actions.ts + camera-fab.tsx with Supabase Storage (Sprint 9) | ✅ | 🔧 Backend | **Done** |
| X-16 | **Estimator typo** — "Generatiing" (double i) in estimator-form.tsx line 202 | ⚠️ | 🎨 Antigravity | LOW |
| X-17 | **Overall UI looks barebones/unpolished** — colour scheme is bland, components lack visual depth, spacing inconsistent, no gradients/micro-interactions, no loading skeletons. Needs a comprehensive design pass | ⚠️ | 🎨 Antigravity | **CRITICAL** |
| X-18 | **Tutorial layout is broken** — buttons overlap, poor formatting, not all features covered | ⚠️ | 🎨 Antigravity | **CRITICAL** |

---

## SECTION 5: PRIORITY MATRIX

### P0 — CRITICAL (App doesn't function without these)

| # | Task | Owner | Description |
|---|------|-------|-------------|
| X-17 | **UI Polish** | 🎨 Antigravity | Comprehensive design pass — colour scheme, spacing, gradients, micro-interactions, loading states |
| X-18/T-1/T-2 | **Tutorial fix** | ✅⚠️ | 18-step spotlight tutorial built (Sprint 9). Needs interactive click-to-advance polish |
| M-2 | **Chat-first UI** | 🎨 Antigravity | Full-page centered chat UI (chatbot is PRIMARY) |
| M-5/A-1 | **75/25 split** | ⚠️ Antigravity | Shell.tsx supports 3 modes (Sprint 9) but needs responsive polish |
| X-4 | Industry stages | 🔧🎨 Both | Kanban columns match industry, flexible DealStage. `pipeline-actions.ts` **does NOT exist** despite log entry |
| X-8 | New Deal form | ✅ | dashboard-client.tsx modal implemented |

### P1 — HIGH (Core walkthrough features)

| # | Task | Owner | Status | Description |
|---|------|-------|--------|-------------|
| D-6 | Bottom Sheet | 🎨 Antigravity | ⚠️ | job-bottom-sheet.tsx exists but needs polish |
| T-1 | Interactive tutorial | ✅ | **Done** | 18-step spotlight overlay (Sprint 9) |
| J-2 | Job status model | ✅ | **Done** | JobStatus enum + scheduledAt in schema |
| J-3 | Travel workflow | ⚠️ | Partial | JobStatusBar exists, SMS wired, Safety Check UI still needed |
| J-6 | Camera/photos | ✅ | **Done** | camera-fab.tsx + Supabase Storage (Sprint 9) |
| X-3 | Toast system | ✅ | **Done** | Sonner installed and wired |
| X-12 | Chat triggers UI | ✅ | **Done** | assistant-pane handles navigate/switchMode actions (Sprint 9) |
| X-15 | File storage | ✅ | **Done** | storage-actions.ts (Sprint 9) |
| M-4 | Chat → UI bridge | ✅ | **Done** | Action field in chat responses (Sprint 9) |

### P2 — MEDIUM (Important but not blocking)

| # | Task | Owner | Status | Description |
|---|------|-------|--------|-------------|
| D-1 | Greeting header | ✅ | **Done** | header.tsx with personalized greeting (Sprint 9) |
| D-3 | Notifications | ⚠️ | Partial | Bell icon + dropdown exist, notification creation wired to job status |
| D-8/D-9 | Job scheduling | ✅ | **Done** | getNextJob + getTodaySchedule actions exist |
| J-4 | On My Way SMS | ✅ | **Done** | sendOnMyWaySMS wired to TRAVELING status |
| J-5 | Safety check | ⚠️ | Backend only | completeSafetyCheck action exists, UI modal still needed |
| J-8 | Voice on job page | 🎨 Antigravity | Pending | Mic icon for job diary |
| J-9 | Material DB | ✅ | **Done** | material-actions.ts + seed data (Sprint 9) |
| J-11 | Signature pad | 🎨 Antigravity | Pending | Sign-on-glass component |
| J-13 | Complete Job | ⚠️ | Partial | Job billing tab exists, payment integration pending |
| AG-2 | Commission calc | ✅ | **Done** | commission-calculator.tsx (Sprint 9) |
| AG-4 | Match feed | ✅ | **Done** | matchmaker-feed.tsx + getMatchFeed (Sprint 9) |
| K-2/K-3 | Kiosk QR | ✅/⚠️ | QR done | QR display done, self-registration page still needed |
| VR-1–5 | Vendor reports | ⚠️ | Partial | Widget + modal exist but use static data, PDF is stub |
| MK-4 | Toast system | ✅ | **Done** | Sonner installed |
| X-9 | Settings page | ✅ | **Done** | Profile + workspace forms wired |
| X-13 | Mobile responsive | 🎨 Antigravity | Pending | Dashboard needs mobile pass |

### P3 — LOW (Nice to have / Post-MVP)

| # | Task | Owner | Description |
|---|------|-------|-------------|
| D-2 | Weather API | 🔧 Backend | Show weather icon |
| J-7 | Photo annotation | 🎨 Antigravity | Draw on photos |
| J-10 | Video recording | 🔧🎨 Both | Record explanation videos |
| J-12 | NFC payments | 🔧🎨 Both | Stripe Terminal / Square |
| MK-1–3,5 | Magic Keys | 🔧🎨 Both | Full key management system |
| M-6 | Canvas auto-retreat | 🎨 Antigravity | Auto-hide canvas |
| X-11 | Remove GitHub btn | 🎨 Antigravity | Clean up login page |
| X-14 | Industry-aware labels | 🎨 Antigravity | "New Job" / "New Listing" |
| X-16 | Estimator typo | 🎨 Antigravity | Fix "Generatiing" |

---

## SECTION 6: SUMMARY COUNTS (Updated 2026-02-09)

| Category | Total Items | ✅ Done | ⚠️ Partial | ❌ Remaining |
|----------|-------------|---------|------------|--------------|
| P0 — Critical | 6 | 2 (X-8, T-1/T-2) | 2 (M-5, X-4) | 2 (X-17, M-2) |
| P1 — High | 9 | 7 (T-1, J-2, J-6, X-3, X-12, X-15, M-4) | 2 (D-6, J-3) | 0 |
| P2 — Medium | 16 | 9 (D-1, D-8/9, J-4, J-9, AG-2, AG-4, K-2, MK-4, X-9) | 4 (D-3, J-5, J-13, VR-1-5) | 3 (J-8, J-11, X-13) |
| P3 — Low | 9 | 0 | 0 | 9 |
| **TOTAL** | **40** | **18** | **8** | **14** |

### By Owner (Remaining work):
- **Antigravity (Frontend)**: ~12 items (X-17, M-2, M-5 polish, X-13, J-5 UI, J-8, J-11, J-7, J-10, X-11, X-14, X-16)
- **Backend (Claude Code / Aider)**: ~5 items (X-4/pipeline-actions, VR wiring, BE-11 PDF, D-3 full wiring, K-3 self-reg)
- **Both teams**: ~5 items (J-3 polish, MK-1-3, J-12, D-6 polish)

---

## SECTION 7: RECOMMENDED EXECUTION ORDER

### Sprint 1 — Foundation (Week 1)
1. **X-17**: UI Polish pass — colour scheme, spacing, gradients, visual depth (Frontend)
2. **X-18/T-1/T-2**: Tutorial fix — broken layout, interactive, cover all features (Frontend)
3. **M-2**: Chat-first default mode + full-page centered chat UI (Both)
4. **M-5/A-1**: 75/25 split in Advanced Mode (Frontend)
5. **X-4**: Industry-aware kanban stages (Both)
6. **X-8**: New Deal modal/form (Frontend)
7. **X-3**: Toast notification system (Frontend)

### Sprint 2 — Core Scenarios (Week 2)
1. **X-12/M-4**: Chat → UI bridge (Both)
2. **J-2**: Job status model (Backend)
3. **J-3/J-4**: Travel workflow + auto-SMS (Both)
4. **J-6/X-15**: Camera + file storage (Both)
5. **D-6**: Bottom Sheet component (Frontend)

### Sprint 3 — Workflows (Week 3)
1. **D-1/D-3**: Greeting header + notifications (Both)
2. **J-5/J-8/J-9**: Safety check + voice + materials (Both)
3. **AG-2/AG-4**: Commission calc + match feed (Both)
4. **VR-1–5**: Vendor reporting (Both)

### Sprint 4 — Polish (Week 4)
1. **K-2/K-3**: Kiosk QR flow (Both)
2. **J-11/J-13**: Signature + complete job (Both)
