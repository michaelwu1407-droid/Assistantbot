# AI Agent Fix Plan

This document contains a comprehensive, granular plan for AI agents to fix the identified bugs and UX issues. 
Agents should pick up an issue, follow the exact steps, verify the fix, and mark it complete.

## 🟢 Immediate Fixes

### Landing Page

#### L1: Update Footer Copyright [DONE]
*   **Issue:** Footer copyright says "2025" — update to 2026.
*   **Fix & Steps:**
    1. Open the landing page footer component (e.g., `components/landing/footer.tsx`).
    2. Change "2025" to `2026` or dynamic `{new Date().getFullYear()}`.
*   **How to check:** View landing page footer.
*   **Agent:** Dumb Agent

#### L3: Replace Placeholder Screenshots [DONE]
*   **Issue:** "Hire Tracey" screenshot areas say "Screenshot coming soon".
*   **Fix & Steps:**
    1. Locate "Hire Tracey" section placeholder divs.
    2. Replace them with semantic `<img>` or actual UI mockups built via Tailwind classes.
*   **How to check:** Verify realistic UI is shown in "Hire Tracey" section.
*   **Agent:** Smart Agent

#### L4: Add Customer Testimonials Carousel [DONE]
*   **Issue:** No testimonials/social proof anywhere on landing page.
*   **Fix & Steps:**
    1. Create a modern carousel component.
    2. Populate with 3-4 realistic reviews.
    3. Place below "Get started/Interview your assistant" section.
*   **How to check:** Verify functional carousel on home page.
*   **Agent:** Smart Agent

#### L8: Fix Feature Carousel Mobile View [DONE]
*   **Issue:** Feature carousel side cards are hidden on mobile — only 1 card visible.
*   **Fix & Steps:**
    1. Remove `hidden md:flex` hiding adjacent cards.
    2. Apply `flex overflow-x-auto snap-x` allowing horizontal swipe.
*   **How to check:** Inspect on mobile view and swipe cards sideways.
*   **Agent:** Smart Agent

#### P4: Add Mobile Navigation Menu [DONE]
*   **Issue:** No mobile nav menu — navbar links hidden on mobile.
*   **Fix & Steps:**
    1. In navbar component, add a hamburger icon visible on mobile (`md:hidden`).
    2. Implement sheet or dropdown displaying desktop links.
*   **How to check:** On mobile view, click hamburger icon to see nav links.
*   **Agent:** Smart Agent

#### P11: Fix Forgot Password Page Background [DONE]
*   **Issue:** Forgot password page has different background style.
*   **Fix & Steps:**
    1. Copy background layout wrapper classes from Login page.
    2. Apply them to Forgot Password root element.
*   **How to check:** Compare Login and Forgot Password pages.
*   **Agent:** Dumb Agent


### Dashboard

#### D1: Simplified Empty State for Deals [DONE]
*   **Issue:** Overkill empty state when user has zero deals.
*   **Fix & Steps:**
    1. In Kanban column, if total workspace deals equals zero:
    2. Render simple text `Create your first deal` in the first column instead of buttons/icons.
*   **How to check:** Emulate 0 deals, verify only standard text shows in first column.
*   **Agent:** Smart Agent

#### D2: Add KPI Skeleton Loaders [DONE]
*   **Issue:** KPI cards have no skeleton loading state.
*   **Fix & Steps:**
    1. Add a Suspense boundary or `isLoading` check around KPI components.
    2. Render `shadcn/ui` `<Skeleton />` matching card dimensions while loading.
*   **How to check:** Throttle network to Slow 3G and ensure gray pulses appear.
*   **Agent:** Dumb Agent

#### D3: Make Setup Widget Collapsible on Mobile [DONE]
*   **Issue:** Setup widget takes full width on mobile.
*   **Fix & Steps:**
    1. Wrap `SetupWidget` content in a collapsible UI (Accordion or state-toggle).
    2. Default to collapsed on mobile viewports.
*   **How to check:** Verify dashboard setup widget is minimized initially on mobile screens.
*   **Agent:** Smart Agent

#### D4: Add Visual Separation to Kanban Board [DONE]
*   **Issue:** No visual separation between KPI section and kanban board.
*   **Fix & Steps:**
    1. Add `mb-8` and `border-b border-border/40 pb-8` below the KPI wrapper block.
*   **How to check:** Check for a visual divider between top metrics and kanban columns.
*   **Agent:** Smart Agent

#### D5: Pronounced Atmospheric Glow [DONE]
*   **Issue:** "Atmospheric glow" background effect barely visible.
*   **Fix & Steps:**
    1. Find dashboard background radial gradient or absolute blurred div.
    2. Increase opacity significantly (e.g., `opacity-10` to `opacity-40`).
*   **How to check:** Look at background for distinct color ambiance.
*   **Agent:** Dumb Agent


### Kanban / Deal Detail Modal

#### K1: Optimistic Update for Stage Moves [DONE]
*   **Issue:** `window.location.reload()` breaking UX on stage move.
*   **Fix & Steps:**
    1. Delete `window.location.reload()` from `onDragEnd` handler.
    2. Mutate local state immediately. Handle backend sync silently.
*   **Agent:** Smart Agent

#### K3: Dark Mode Handling for Overdue Deals [DONE]
*   **Issue:** Overdue deal styling lacks dark mode.
*   **Fix & Steps:**
    1. Append `dark:bg-red-900/20 dark:text-red-400` where hardcoded red exists entirely.
*   **Agent:** Dumb Agent

#### K5: Dashed-Border Placeholder for Empty Columns [DONE]
*   **Issue:** Empty columns incorrectly show standard text.
*   **Fix & Steps:**
    1. If column deals == 0, render dashed border placeholder reading "Drop deal here".
*   **Agent:** Smart Agent

#### DM1: Granular Activity Feed Updates
*   **Issue:** Feed shows generic "Deal updated".
*   **Fix & Steps:**
    1. Diff incoming form changes against old values to inject granular statements like "Stage: New -> Quote Sent" into the activity log JSON.
*   **Agent:** Smart Agent

#### DM2: Replace window.prompt() [DONE]
*   **Issue:** Reject reason native prompt used.
*   **Fix & Steps:**
    1. Replace `window.prompt` with Custom `Dialog` (shadcn) collecting text internally.
*   **Agent:** Smart Agent

#### DM3: Auto-Save for Invoice Amount [DONE]
*   **Issue:** Requires manual save.
*   **Fix & Steps:**
    1. Trigger API save via `onBlur` for the invoice input securely. Replace save button with auto-check.
*   **Agent:** Smart Agent

#### DM4: Fix Modal Full Reloads [DONE]
*   **Issue:** Stage dropdown inside modal forces `window.location.reload()`.
*   **Fix & Steps:**
    1. Halt browser refresh logic, simply fetch data and dispatch an update internally. Keep modal entirely open.
*   **Agent:** Smart Agent

#### DM5: Dynamic Stage Dropdown List
*   **Issue:** Stage dropdown is hardcoded.
*   **Fix & Steps:**
    1. Map array over fetched workspace stages context uniformly instead of static arrays.
*   **Agent:** Smart Agent


### Inbox / Schedule / Map / Team / Settings

#### I2: Twilio SMS Character Count
*   **Issue:** No SMS character count limitation.
*   **Fix & Steps:**
    1. Add length evaluation beneath SMS box: `{text.length}/160`. Turn text red over 160.
*   **Agent:** Dumb Agent

#### I3 & I4: Contact Sort & Search Filtering
*   **Issue:** Missing feature.
*   **Fix & Steps:**
    1. Add Input and Select components enforcing standard client-side array filter & sort across `contacts`.
*   **Agent:** Smart Agent

#### I5: Disable Bulk SMS Send [DONE]
*   **Issue:** Feature shouldn't be active.
*   **Fix & Steps:**
    1. Hide or remove UI explicitly sending grouped bulk messages.
*   **Agent:** Dumb Agent

#### I6 & I7: Contact Batch Actions & Tags
*   **Issue:** Missing features.
*   **Fix & Steps:**
    1. Append checkboxes triggering standard batch `Delete / Export`.
    2. Hook up tag badges array within the Contact Schema.
*   **Agent:** Smart Agent

#### S1-S5: Schedule Overhaul
*   **Fix & Steps:**
    - Button appending date explicitly to `new Date()`. (Dumb)
    - Mobile layout morphing grid uniformly into chronological List View. (Smart)
    - Scale `text-[11px]` nodes drastically larger. (Dumb)
    - Attach ArrowRight/ArrowLeft keyboard handlers. (Smart)
    - Ensure logical empty array string prints securely. (Dumb)

#### M2 & M3: Map Refinements
*   **Fix & Steps:**
    - Integrate Marker Clusterer plugins explicitly handling 5+ locations efficiently. (Smart)
    - Implement interactive retry `<Button>` avoiding blank 'refresh' text directives. (Dumb)

#### T1 & T2 & T4: Team Component Additions [DONE]
*   **Fix & Steps:**
    - Delete uses `AlertDialog` instead of `confirm()`. (Smart)
    - Mount Dropdowns allowing immediate Role mutation patches. (Smart)
    - Attach standard `toast.success("Copied")` on invite linkages. (Dumb)

#### ST1 & BUG1 & BUG2: Fix Hook Fetch Hangs [DONE]
*   **Issue:** Infinity fetch hangs in phone/agent pages due to `useState`.
*   **Fix & Steps:**
    1. Convert function wrapping inside `useState` structurally into a valid `useEffect` load block. 
*   **Agent:** Smart Agent

#### ST2 & ST6 & BUG4 & ST7: Settings Polishing [DONE]
*   **Fix & Steps:**
    - Purge dead ai-voice redirect. (Dumb)
    - Delete duplicated `<h2>Business Details</h2>`. (Dumb)
    - Inject an `Input` natively filtering the settings sidebar list. (Smart)

#### ST5 & BUG3: Dynamic Billing Page [DONE]
*   **Issue:** Plan says static Earlymark Pro.
*   **Fix & Steps:**
    1. Swap string dynamically mapping to `workspace.planTier`.
*   **Agent:** Smart Agent


### Chatbots / AI Analytics & Global Patterns

#### C1 & C2 & C4 & C5 & N1: AI Integrations [DONE]
*   **Fix & Steps:**
    - Reject form structurally if Jobs fields missing. (Smart)
    - Pass routing contextual strings populating Quick Action prompts. (Smart)
    - Embed "Transferring you to human staff" into bot fallback prompts. (Dumb)
    - Tell wrap-up script "I need to look a bit deeper into this for you. I will follow up via email shortly." (Dumb)
    - **N1 New Issue**: Route negative chatbot experiences securely into `CustomerFeedback` tables. Construct detailed Customer Card expandable UI surfacing precise transcripts mapped from this DB. Erase the prior `/crm/feedback` construct. (Smart)

#### G1-G12: Global Fixes (Contrast, Animation, Offline, Aria)
*   **Fixes:** Check all text colors for AA contrasts, standardizing `text-xs` sizing minimums uniformly, attach Breadcrumb routing uniformly natively over dynamic identifiers, purge `router.back()` references replacing them structurally enforcing standard paths `/crm/deals`, attach global timeout-based Undo hooks directly mapping into custom Sonners, append tactile UI audio feedback explicitly linked to fatal failures, intercept `offline` hooks rendering bright visual warnings natively spanning root layout, and strip Framer+Tailwind conflict variants enforcing global static Aria button annotations. 
*   **Agents:** Distributed heavily amongst Dumb and Smart based on complexity.

---

## 🟡 Logged For Later
*   L2: Social Links generic.
*   L5: No pricing section.
*   K4: Missing KanBan shortcut adds.
*   P1-P10, P12-P13: Assorted Landing Page marketing SEO polishing tasks.
*   Noted items explicitly ignored during instruction (Emojis, Auto-advance speeds, T3 timestamps, A2 exports, Call recording labels).
