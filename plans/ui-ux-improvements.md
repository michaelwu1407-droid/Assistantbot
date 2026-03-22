# UI/UX Improvements Plan

## Context
Major UI polish pass covering the landing page, dashboard components, kanban board, and app-wide styling. The goal is a more modern, sleek SaaS feel plus functional fixes around kanban draft cards and assignment enforcement.

---

## Task 1: Hero Section — Restructure Layout
**Agent:** Smart
**File:** `app/page.tsx`

### Current State (lines 444-525)
The hero section renders in this order: Heading → Value Pillars (3 icon cards) → CTA buttons (Get started + Interview your assistant).

### Required Change
Reorder to: **Heading → CTA buttons → App screenshot mockup → Value props**

1. Move the CTA button group (currently at ~line 512-525) to immediately after the heading block
2. After CTAs, add a new `<div>` containing a large browser-chrome frame mockup of the dashboard. Use a similar wrapper to the `ChatDemo` component's browser chrome (rounded-xl, fake traffic lights, grey title bar). Inside, render a static `<img>` placeholder or a styled div showing the kanban board layout with sample deal cards
3. Move the 3 value prop messages (lines 483-510) below the screenshot mockup

---

## Task 2: Value Props — Modern Gradient Glass Cards
**Agent:** Smart
**File:** `app/page.tsx` (lines 483-510)

### Current State
3 value prop items each rendered with a lucide icon inside a `rounded-full bg-{color}-100` circle, plus heading and description text.

### Required Change
Replace the icon-in-circle approach with gradient glass cards:

1. Remove the lucide icon circles entirely
2. Each card: `rounded-xl backdrop-blur-sm bg-gradient-to-br border border-white/20 p-6`
   - Card 1: gradient tint `from-emerald-50/80 to-emerald-100/40`
   - Card 2: gradient tint `from-blue-50/80 to-blue-100/40`
   - Card 3: gradient tint `from-violet-50/80 to-violet-100/40`
3. Add thin accent line at top of each card: `<div className="h-0.5 w-12 bg-{color}-400 mb-4 rounded-full" />`
4. Bold heading (`text-lg font-semibold`) + description text (`text-sm text-slate-600`)
5. Hover: `hover:shadow-lg hover:-translate-y-1 transition-all duration-300`
6. Layout: 3 cards side-by-side in a `grid grid-cols-1 md:grid-cols-3 gap-6`

---

## Task 3: Hire Tracey Section — Fill Screenshot Placeholders
**Agent:** Smart
**File:** `app/page.tsx` (HIRE_FEATURES array at lines 44-69, rendering at lines 652-678)

### Current State
4 feature cards with `HIRE_FEATURES` array. Each has a placeholder area showing "Screenshot coming soon" text.

### Required Change
Replace each placeholder with an inline JSX mockup styled to look like a real app screenshot:

1. **"Never miss a job again"** — Mini incoming-call UI: Phone icon, "Incoming call from +61...", green Answer button, "Tracey answered" confirmation, "New lead: Kitchen renovation" card
2. **"No more admin. Chat with your CRM."** — Chat interface mockup: 2-3 chat bubbles showing user asking "Schedule the Smith job for Friday" and Tracey responding "Done! Scheduled for Friday 9am"
3. **"AI that actually works"** — SMS conversation thread: alternating bubbles between Tracey and a customer discussing a quote
4. **"Total control"** — Mini settings panel: Toggle switches for "Auto-respond to calls", "Require approval for quotes", "Send follow-up reminders" with on/off states

Each mockup: `rounded-lg border bg-white shadow-sm p-4` with the app's design tokens (slate text, emerald accents).

---

## Task 4: FAQ Section
**Agent:** Smart
**File:** `app/page.tsx` — Add new section between final CTA (~line 724) and Footer (~line 728)

### Current State
No FAQ section exists.

### Required Change
Add an accordion-style FAQ section:

1. Section wrapper: `max-w-3xl mx-auto py-20 px-4`
2. Heading: "Frequently Asked Questions" centered, `text-3xl font-bold`
3. Implement simple accordion with React `useState` (array of open indices)
4. Each item: clickable header with +/- icon, expandable answer area with `transition-all overflow-hidden`
5. Questions & answers:
   - "What is Tracey?" → "Tracey is your AI assistant..."
   - "How does the AI phone answering work?" → Explain call forwarding + AI response
   - "Can I try it for free?" → Reference free trial
   - "What trades/industries does Earlymark support?" → Any service-based business
   - "How does Tracey learn about my business?" → Onboarding interview process
   - "Can I control what Tracey says to customers?" → Approval rules, customization
   - "Do I need technical skills to use Earlymark?" → No, conversational setup
   - "How much does it cost?" → Reference pricing page

---

## Task 5: Sidebar — Move "Ask Tracey" to Top, Blue Styling
**Agent:** Dumb
**File:** `components/core/sidebar.tsx`

### Current State
"Ask Tracey" button is at the bottom of the sidebar (lines 127-140) with `bg-slate-100 text-slate-600` styling.

### Required Change
1. **Move** the "Ask Tracey" button JSX block (lines 127-140) to **above** the nav items list (before line 94), immediately after the logo/brand area
2. **Change classes** from `bg-slate-100 text-slate-600` to `bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700`
3. Keep the `MessageSquare` icon and tooltip behavior unchanged

---

## Task 6: Kanban Board — Reduce Vertical Whitespace
**Agent:** Dumb
**File:** `components/crm/kanban-board.tsx`

### Current State
- Line 361: Column wrapper has `p-5` (20px padding all sides)
- Line 369: Column header has `mb-5` (20px margin below)

### Required Change
1. Line 361: Change `p-5` → `px-5 py-1`
2. Line 369: Change `mb-5` → `mb-2`

---

## Task 7: Kanban Board — Colored Line Spacing
**Agent:** Dumb
**File:** `components/crm/kanban-board.tsx`

### Current State
Line 367: Each column `<div>` has `border-l-4` colored line that touches the left edge of the board.

### Required Change
Add `ml-2` to the column `<div>` (line 367) so the colored border has visual breathing room from the board edge.

---

## Task 8: Job Card — Show "Not scheduled" Fallback
**Agent:** Dumb
**File:** `components/crm/deal-card.tsx`

### Current State
- **Top-right date** (lines 253-257): Falls back to `createdAt` date when `scheduledAt` is null
- **Bottom-row date** (lines 405-412): Shows empty `<div />` when no `scheduledAt`

### Required Change
**Top-right (lines 253-257):** Replace `createdAt` fallback:
```tsx
{deal.scheduledAt
  ? format(new Date(deal.scheduledAt), "MMM d")
  : <span className="text-slate-400 italic text-[10px]">Not scheduled</span>}
```

**Bottom-row (lines 405-412):** Replace empty div:
```tsx
{deal.scheduledAt ? (
  <div className="flex items-center text-xs text-[#64748B]">
    <Calendar className="w-3 h-3 mr-1 shrink-0" />
    {formatScheduledTime(deal.scheduledAt)}
  </div>
) : (
  <span className="text-[10px] text-slate-400 italic">Not scheduled</span>
)}
```

---

## Task 9: Job Card — Remove "Move Stage" Dropdown
**Agent:** Dumb
**File:** `components/crm/deal-card.tsx` (lines 353-388)

### Current State
There's a `{!overlay && columnId && ( <DropdownMenu>...</DropdownMenu> )}` block that renders a "Move stage" dropdown with arrows to adjacent columns.

### Required Change
Delete the entire block (lines 353-388). Drag-and-drop handles stage changes; this dropdown is redundant.

---

## Task 10: Deal Source — Show Dash for Unknown
**Agent:** Dumb
**Files:**
- `components/crm/deal-card.tsx` (lines 328-335)
- `components/crm/deal-detail-modal.tsx` (line 250)

### Current State
- deal-card.tsx: Source badge only renders when `deal.source` is truthy (wrapped in `{deal.source && ...}`)
- deal-detail-modal.tsx: Falls back to `"Direct enquiry"` when no source

### Required Change

**deal-card.tsx (lines 328-335):** Remove the `{deal.source && ...}` conditional. Always render the badge:
```tsx
<div className="flex items-center gap-1">
  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600">
    {deal.source || "—"}
  </span>
</div>
```

**deal-detail-modal.tsx (line 250):** Change `"Direct enquiry"` fallback to `"—"`.

---

## Task 11: Inbox — Tab Separation + Distinct Activity Icons
**Agent:** Smart
**File:** `components/crm/inbox-view.tsx`

### Current State
- Tab bar (lines 535-550): Uses `border-b` for separation
- `channelIconAndStyle()` function (lines 190-213): Handles "call", "email", "voicemail" types but not "sms" or "system" events — they fall through to a default

### Required Change

**Tab separation (lines 535-550):**
1. Change `border-b` to `border-b-2` for stronger visual line
2. Add `mb-1` spacing below the tab bar

**Activity icons — add new cases to `channelIconAndStyle()` (after existing cases):**
```tsx
case "sms":
  return { icon: <MessageCircle className="h-4 w-4" />, containerClass: "bg-teal-100 text-teal-600", label: "SMS" }
case "system":
  return { icon: <Settings className="h-4 w-4" />, containerClass: "bg-slate-100 text-slate-500", label: "System" }
```

**In the rendering loop (~line 561):** Before calling `channelIconAndStyle()`, detect the effective type:
```tsx
const effectiveType = isSystemEvent(item) ? "system"
  : (item.title?.toLowerCase().includes("sms") ? "sms" : item.type)
```

**Imports:** Add `MessageCircle` and `Settings` to the lucide-react import.

---

## Task 12: Chat Sidebar — Reduce Default Width
**Agent:** Dumb
**File:** `components/layout/Shell.tsx` (lines 227-237, 270)

### Current State
- `defaultSize={35}`, `minSize={35}`, `min-w-[400px]`

### Required Change
- `defaultSize={35}` → `defaultSize={28}`
- `minSize={35}` → `minSize={28}`
- `min-w-[400px]` → `min-w-[320px]`

---

## Task 13: Analytics — Revenue Trend Line Graph
**Agent:** Smart
**File:** `app/crm/analytics/page.tsx` (lines 206-226)

### Current State
Revenue trend shows horizontal bars per month.

### Required Change
Replace with an inline SVG line chart:

1. `<svg viewBox="0 0 600 200" className="w-full h-48">`
2. Calculate X positions: evenly spaced across viewBox width for each month
3. Calculate Y positions: scale revenue values to viewBox height (max value = top, 0 = bottom), with 20px padding
4. Draw `<polyline points="..." fill="none" stroke="#00D28B" strokeWidth="2" />`
5. Draw `<circle cx={x} cy={y} r="4" fill="#00D28B" />` at each data point
6. Add 3-4 horizontal grid lines: `<line ... stroke="#e2e8f0" strokeWidth="1" />`
7. X-axis labels: `<text>` elements with month abbreviations
8. Y-axis labels: `<text>` elements with dollar amounts
9. If all values are $0: show "No revenue data yet" centered text instead of the chart

---

## Task 14: Draft & Pending Approval Cards — Improved Visual Design
**Agent:** Smart
**File:** `components/crm/deal-card.tsx` (lines 123-134)

### Current State
**Draft cards (lines 123-127):**
```tsx
cardClasses = "ott-card rounded-lg bg-indigo-50/50 border-indigo-300 border-dashed p-4 dark:border-indigo-500/40"
statusLabel = "Draft"
statusClass = "bg-indigo-100 text-indigo-700 border-indigo-200"
```

**Pending approval cards (lines 130-134):**
```tsx
cardClasses = "ott-card rounded-lg bg-amber-50/80 border-amber-400 border-2 border-dashed p-4 dark:bg-amber-950/30 dark:border-amber-500/60"
statusLabel = "Pending approval"
statusClass = "bg-amber-100 text-amber-800 border-amber-300 ..."
```

Both are too subtle — users may not notice that a card needs their attention.

### Required Change

**Draft cards — make the dashed border thicker and add a top banner:**
1. Update `cardClasses` (line 124):
   ```tsx
   cardClasses = "ott-card rounded-lg bg-indigo-50/60 border-2 border-dashed border-indigo-400 p-4 dark:bg-indigo-950/20 dark:border-indigo-500/60"
   ```
2. After the card's opening `<div>` (around line 164), add a conditional banner for draft cards:
   ```tsx
   {deal.isDraft && (
     <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md bg-indigo-100/80 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700">
       <span className="relative flex h-2 w-2">
         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
         <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
       </span>
       <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">Draft — Needs approval</span>
     </div>
   )}
   ```
3. Add `FileEdit` to the lucide-react import (line 7). Update the statusLabel badge to include the icon — in the badge rendering area find where `statusLabel` is displayed and for "Draft" add a `<FileEdit className="w-3 h-3 mr-0.5 inline" />` before the text.

**Pending approval cards — similar treatment:**
1. Keep existing `cardClasses` (already has `border-2 border-dashed`)
2. Add conditional banner for pending approval:
   ```tsx
   {deal.stage === "pending_approval" && (
     <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md bg-amber-100/80 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
       <span className="relative flex h-2 w-2">
         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
         <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
       </span>
       <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Pending — Awaiting manager approval</span>
     </div>
   )}
   ```
3. Add `Clock` to the lucide-react import. For the "Pending approval" statusLabel badge, prepend `<Clock className="w-3 h-3 mr-0.5 inline" />`.

---

## Task 15: Kanban — Prevent Unassigned Cards in Scheduled+ Columns
**Agent:** Smart
**Files:**
- `components/crm/deal-card.tsx` (lines 282-325)
- `actions/deal-actions.ts` (lines 872-895)

### Current State — The Loophole
The kanban board correctly blocks dragging an unassigned card to "scheduled" (kanban-board.tsx lines 264-270). However, once a card IS in scheduled (or later: `ready_to_invoice`, `completed`), the user can open the assignment dropdown (deal-card.tsx lines 302-304) and click "Unassign" — the card stays in the scheduled column but is now unassigned.

**Backend** (`updateDealAssignedTo` at deal-actions.ts:872-895) has NO validation for this — it blindly sets `assignedToId` to whatever is passed, including `null`.

### Required Change

**Frontend fix — deal-card.tsx (lines 302-305):**

The "Unassign" dropdown item is at line 303:
```tsx
<DropdownMenuItem onClick={() => onAssign(null)}>
  Unassign
</DropdownMenuItem>
```

Replace with a conditional that checks if the card is in a stage requiring assignment:
```tsx
{(() => {
  const requiresAssignment = ["scheduled", "ready_to_invoice", "completed"].includes(columnId || "")
  return requiresAssignment ? (
    <DropdownMenuItem disabled className="text-slate-400 cursor-not-allowed">
      Cannot unassign (move to earlier stage first)
    </DropdownMenuItem>
  ) : (
    <DropdownMenuItem onClick={() => onAssign(null)}>
      Unassign
    </DropdownMenuItem>
  )
})()}
```

Note: `columnId` is already available as a prop in the DealCard component (check the component's props interface — it receives `columnId?: string`).

**Backend fix — deal-actions.ts (lines 872-895):**

In the `updateDealAssignedTo` function, after the existing `if (!deal)` check (line 880), add validation before the `db.deal.update`:

1. Change the `select` on line 877 from `{ workspaceId: true }` to `{ workspaceId: true, stage: true }`
2. Add this check after line 888 (after the workspace member validation):
```tsx
// Prevent unassignment for deals in Scheduled or later stages
if (!assignedToId) {
  const STAGES_REQUIRING_ASSIGNMENT = ["SCHEDULED", "READY_TO_INVOICE", "WON", "PENDING_COMPLETION"]
  if (STAGES_REQUIRING_ASSIGNMENT.includes(deal.stage)) {
    return { success: false, error: "Cannot unassign a deal in the Scheduled stage or later. Move it to an earlier stage first." }
  }
}
```

Note: The Prisma `stage` enum values are uppercase (e.g. `SCHEDULED`, `READY_TO_INVOICE`, `WON`, `PENDING_COMPLETION`) while the frontend uses lowercase equivalents. The backend check must use the Prisma enum values.

---

## Verification
1. `npm run build` — no compilation errors
2. Landing page: hero shows CTAs → screenshot → value prop cards (no icons)
3. Landing page: Hire Tracey section has real mockups, not placeholders
4. Landing page: FAQ accordion works at bottom
5. Sidebar: Ask Tracey at top in blue
6. Kanban: tighter vertical padding, colored lines have margin from edge
7. Job cards: "Not scheduled" label, no "Move stage" button
8. Deal modal: "—" for unknown source
9. Inbox: distinct icons per event type, stronger tab separation
10. Chat sidebar: 28% default width
11. Analytics: line graph with dots for revenue trend
12. Kanban: draft cards have prominent visual treatment (thick dashed border, pulsing banner, icon badge)
13. Kanban: pending approval cards equally prominent with amber pulsing banner
14. Kanban: cannot unassign a card in Scheduled or later (dropdown shows disabled "Cannot unassign")
15. Backend: `updateDealAssignedTo` rejects `null` assignment for SCHEDULED+ stage deals
