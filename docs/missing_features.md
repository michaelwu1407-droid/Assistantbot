# Missing Features & Gap Analysis

This document collates all discrepancies between the `APP_MANUAL.md` and the actual codebase found during stress testing.

## High Priority (Core Flows Broken)
- **Job Workflow Broken**: "Start Travel", "Complete Job" buttons missing. No field worker flow exists.
- **Calendar Logic Missing**: No confirmation status or "Nudge" workflow on calendar items.
- **Feedback Crashing**: `/dashboard/feedback` throws an application error.
- **Reporting & Team Missing**: No analytics or user management features (404).
- **Global Search Broken**: `Cmd+K` returns no results.
- **AI Logic Gaps**: Chat assistant limited capabilities.

## Medium Priority (UX/UI Gaps)
- **Deal Photos Tab**: Missing from Deal Details view.
- **Kanban Automation**: Missing modals for Stale Deal drag-and-drop.
- **Asset/Handover UI**: Missing sections for Asset DNA and Digital Handover.
- **Settings Missing**: No UI for "AI Voice Agent" or "After Hours Mode".

## Low Priority (Polish/Edge Cases)
