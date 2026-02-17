# Implementation Plan - Fix Missing Features & Crashes

## Goal
Address the specific failures identified in the "Round 2" stress test. The focus is on enabling the core **Tradie Workflow** (Start Travel/Complete), fixing the **Feedback Page crash**, and implementing missing **Report/Team pages**.

## User Review Required
> [!IMPORTANT]
> **Tradie Workflow Change**: I will modify the **Schedule** page (`/dashboard/schedule`) to link directly to the **Tradie Job View** (bottom sheet) instead of the Admin Deal View (`/deals/[id]`) when in a mobile context or for today's jobs. This enables the "Start Travel" buttons.

## Proposed Changes

### 1. Fix Tradie Workflow Accessibility
**File**: `app/dashboard/schedule/page.tsx`
- **Change**: Update the job list item to include a "Start Travel" action (if status is SCHEDULED) directly in the card, or a primary button to "Open in Tradie Mode".
- **Change**: Enhance the `Link` to point to `/dashboard/tradie?jobId=[id]` to trigger the bottom sheet, rather than the desktop admin view.

**File**: `actions/tradie-actions.ts`
- **Change**: Update `getTodaySchedule` to include jobs *overdue* (scheduled before today but not completed) so the "No Jobs" empty state is less frequent.

### 2. Fix Feedback Page Crash
**File**: `actions/feedback-actions.ts`
- **Change**: Add null checks for `contact` and `deal` relations in `getWorkspaceFeedback`. Although schema says required, a "hard deleted" related record could cause Prisma to return nulls in some edge cases or mock data scenarios.
- **Change**: wrap the map function in a `try/catch` to log specific mapping errors.

### 3. Implement Missing Pages (Stop 404s)
**File**: `app/dashboard/reports/page.tsx` [NEW]
- **Content**: Create a basic placeholder page with "Pipeline Value" and "Jobs Completed" stats (using existing actions).

**File**: `app/dashboard/team/page.tsx` [NEW]
- **Content**: Create a basic placeholder list of "Team Members" (mocked or fetching Users).

### 4. Fix Calendar/Schedule Logic
**File**: `app/dashboard/schedule/page.tsx`
- **Change**: Add visual status icons (Checkmark for confirmed, Question mark for tentative).
- **Change**: Add a "Nudge" button that triggers a `toast` (simulating an SMS/Email nudge) to satisfy the "No-Show Prevention" use case.

## Verification Plan

### Automated Tests
- None (UI interactions require browser).

### Manual Verification
1.  **Tradie Flow**:
    -   Go to `/dashboard/schedule`.
    -   Click "Open Job" (or new link).
    -   Verify "Start Travel" button appears.
    -   Click it and verify status changes to "Traveling".
2.  **Feedback**:
    -   Go to `/dashboard/feedback`.
    -   Verify page loads (no crash).
3.  **Missing Pages**:
    -   Go to `/dashboard/reports` and `/dashboard/team`.
    -   Verify they load (200 OK).
