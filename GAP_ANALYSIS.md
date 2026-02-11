# PJ BUDDY — GAP ANALYSIS vs. EXTREME GRANULAR WALKTHROUGH

**Date**: 2026-02-11 (Updated: Antigravity Fixes Session)
**Prepared by**: Claude Code (Backend) & Antigravity (Frontend)
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
| Default view is clean central chat (like ChatGPT/Gemini) — chatbot is PRIMARY | ✅ | DashboardProvider now defaults to `"chat"`. `Shell.tsx` hides sidebar and centers chat (2026-02-11) |
| User types "Start my day" | ✅ | "Start day" triggers map redirect (2026-02-11) |
| Toggle to Advanced Mode → chatbot shrinks to 25% right, app canvas takes 75% left | ✅ | Fixed in `Shell.tsx` (2026-02-11) |
| Canvas slides in from the left to show relevant info | ⚠️ | Chat→UI bridge implemented, but no animated slide-in |
| Canvas retreats after showing info | ❌ | No auto-retreat behavior |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| M-1 | Change DashboardProvider default mode to `"chat"` for new users (store preference in workspace `mode_preference` field) | ✅ | Done (2026-02-08) |
| M-2 | Redesign chat mode to be full-page centered chat (like ChatGPT), not a sidebar card. Chatbot is the PRIMARY interface | ✅ Antigravity | **Done (2026-02-11)** |
| M-3 | Add `mode_preference` column to Workspace/User schema (ENUM: SIMPLE/ADVANCED, default SIMPLE) | ✅ | Added to User model (2026-02-08) |
| M-4 | ~~Chat response "action" field triggers UI mode changes~~ → assistant-pane.tsx handles navigate/switchMode/showPanel actions (Sprint 9) | ✅ Both | **Done** |
| M-5 | When toggling to Advanced Mode: app canvas = 75% left, chatbot = 25% right (not fixed 400px) | ✅ Antigravity | **Done (2026-02-11)** |
| M-6 | Add auto-retreat behavior: canvas slides out after N seconds or when user returns to chat | 🎨 Antigravity | LOW |

---

### 1.3 Advanced Mode (Power User) — 75/25 Split

| Requirement | Status | Notes |
|-------------|--------|-------|
| Split pane layout | ✅ | Dashboard layout has main + aside |
| Left (75%): App Canvas always visible | ✅ | `Shell.tsx` uses `ResizablePanel` with defaultSize={75} |
| Right (25%): Chatbot co-pilot | ✅ | `Shell.tsx` uses `ResizablePanel` with defaultSize={25} |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| A-1 | Change aside width from `w-[400px]` to `w-1/4` (25%) and main from `flex-1` to `w-3/4` (75%) with min-width guards | ✅ Antigravity | **Done (2026-02-11)** |

---

## SECTION 2: SCENARIO A — THE TRADIE (Scott & "Travis")

### 2.1 Morning Routine (Basic Mode)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Opens app, sees only central chat | ✅ | Default mode is now Chat |
| Types "Start Day" | ✅ | Triggers redirect to Map (2026-02-11) |
| Chat retreats, Map Canvas slides in full screen | ✅ | Mode switch handled in `ChatInterface` |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| S-1 | "Start Day" intent should: (a) return morning digest text, (b) signal frontend to switch to Advanced Mode, (c) navigate to `/dashboard/tradie/map` | ✅ Both | **Done (2026-02-11)** |

---

### 2.2 The Dashboard (Map View)

| Requirement | Status | Notes |
|-------------|--------|-------|
| **Header — "Good Morning, Scott"** | ✅ | Personalized greeting in header.tsx (Sprint 8/9) |
| **Header — Weather Icon** | ✅ | Weather integrated via getWeather action in header.tsx (Sprint 9) |
| **Header — Global Search (magnifying glass)** | ⚠️ | SearchCommand exists but only in dashboard layout header (top right), not in tradie pages |
| **Header — Notification Bell (red dot)** | ❌ | No notification system at all |
| **"The Pulse" Widget** (floating pill: "Wk: $4.2k | Owe: $850") | ✅ | Implemented in Tradie Page (2026-02-08) |
| **Dark Mode Google Map** with numbered pins + route line | ✅ | Leaflet "Voyager" tiles + Custom Popups (2026-02-11) |
| **Bottom Sheet (collapsed)** showing next job | ❌ | No bottom sheet component |
| **Bottom Sheet (expanded)** with job details + Quick Actions (Navigate, Call, Text, Parts) | ⚠️ | Popup card has basic actions (View Job, Directions) |
| **Dark theme** (Slate-950, Neon Green) | ✅ | Tradie page uses dark styling (2026-02-08) |

**Action Items:**

| # | Task | Owner | Priority |
|---|------|-------|----------|
| D-1 | ~~Add personalized greeting header~~ → Implemented in header.tsx (Sprint 9) | ✅ | **Done** |
| D-2 | ~~Weather API integration~~ → getWeather action + header.tsx display (Sprint 9) | ✅ | **Done** |
| D-3 | Build notification system: schema (Notification model), bell icon with unread count, dropdown list | 🔧🎨 Both | MEDIUM |
| D-4 | Build "Pulse" widget (server action to compute weekly revenue + outstanding invoices) | ✅ | Done |
| D-5 | Fix map view: integrate Leaflet properly on tradie page with dark tiles, numbered pins from geocoded deals, route line (polyline connecting today's jobs in order) | ✅ | **Done (2026-02-11)** |
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

## SECTION 8: USER FEEDBACK (2026-02-11)

**Source**: User Review of "Chatbot Mode", "Advanced Mode", and "Settings".

### 8.1 Chatbot Mode (Basic)
| Issue | Task Ref | Action | Status |
|-------|----------|--------|--------|
| **Too much whitespace / Bare** | **M-2**, **X-17** | Add background pattern/gradient, refine spacing, maybe add "suggested prompts" bubbles to fill void. | ✅ Done |
| **No timestamps / delineation** | **[NEW] C-1** | Add "Today", "Yesterday" headers. Add visible dividers between conversation turns. | ✅ Done |
| **"Create Deal" fails to draft** | **[NEW] C-2** | **Generative UI**: When intent is `new_deal`, AI should return a structured "Draft Deal" card (Lead Name, Address, Issue, Quote) for confirmation *before* creating. | ✅ Done |
| **Microphone Broken** | **J-8** | Fix microphone permission/state handling in `ChatInput`. | ✅ Done |
| **Settings -> Replay Tutorial** | **[NEW] C-3** | Fix Settings Cog behavior. It should go to `/dashboard/settings`. "Replay Tutorial" should be a sub-item or inside Help. | ✅ Done |

### 8.2 Advanced Dashboard
| Issue | Task Ref | Action | Status |
|-------|----------|--------|--------|
| **"Atrocious formatting"** | **X-17** | Fix text overflow in cards. Standardize font sizes (caps vs sentence case). Text must stay inside boxes. | ✅ Done |
| **Recent Activity cuts off Kanban** | **[NEW] UI-1** | Move Recent Activity to top row (3-col grid: Pulse | Health | Activity) or limit height with scroll. | ✅ Done |
| **Cards overlapping** | **X-17** | Fix grid layout margins/padding. Ensure `gap-4` or `gap-6` is respected. | ✅ Done |

### 8.3 Settings
| Issue | Task Ref | Action | Status |
|-------|----------|--------|--------|
| **Profile Copy ("how others see you")** | **[NEW] S-1** | Change copy to "Manage your personal details and account preferences." | ✅ Done |

### 8.4 Map Page (Tradie View)
| Issue | Task Ref | Action | Status |
|-------|----------|--------|--------|
| **Sidebar Navigation Hints** | **[NEW] UI-2** | Add Tooltips to Sidebar icons. On hover, show label. | ✅ Done |
| **"Atrocious" Map Visuals** | **D-5** | Switch from standard OSM tiles to a premium provider (e.g., CartoDB Voyager or Dark Matter). Custom marker icons. | ✅ Done |
| **Data Filtering logic unclear** | **D-9** | Explicitly filter for "Today's Jobs" and show a legend/list side-by-side. | ✅ Done |
| **Glitching / Transparency** | **[NEW] UI-3** | Fix `z-index` of map container. Ensure background is opaque so other pages don't "bleed" through on zoom. | ✅ Done |
| **Popup Card Formatting** | **X-17** | Style the Leaflet popup to match `DealCard` aesthetics (fonts, sizes, shadows). | ✅ Done |
| **Popup Interactivity** | **[NEW] UI-4** | Make the popup clickable -> navigates to `DealDetail` page. | ✅ Done |

### 8.5 Navigation Logic
| Issue | Task Ref | Action | Status |
|-------|----------|--------|--------|
| **Redundant "Map" Icon** | **[NEW] NAV-1** | The "Tool" icon opens the map, but there is also a "Map" icon. Consolidate or clarify. | ✅ Done |
| **Mode Switching Logic** | **[NEW] NAV-2** | Clicking "Tool" (Tradie) or "Briefcase" (Agent) should **toggle the sidebar menu items** relevant to that industry, not just navigate to a page. | ✅ Done |

### 8.6 Calendar Page
| Issue | Task Ref | Action | Status |
|-------|----------|--------|--------|
| **Empty Calendar** | **[NEW] CAL-1** | Jobs exist in DB but don't show on Calendar. Likely a date parsing or filtering mismatch in `getCalendarJobs`. | ✅ Done |
| **Grid Alignment** | **[NEW] UI-5** | Time lines do not align with day columns. Refactor CSS grid/flex layout for precise alignment. | ✅ Done |
| **Formatting / Aesthetic** | **[NEW] UI-6** | Upgrade calendar to "Google Calendar" quality: modern event styling, time indicators, clean lines. | ✅ Done |
