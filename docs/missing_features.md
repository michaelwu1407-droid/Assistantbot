# Missing Features & Gap Analysis

This document collates all discrepancies between the `APP_MANUAL.md` and the actual codebase found during stress testing.

## High Priority (Core Flows Broken)
- **Hub Dashboard Missing**: `/dashboard/hub` returns 404. This is the central command center described in the manual.
- **Tradie Dashboard Missing**: `/dashboard/tradie` (Map View) returns 404.
- **Job Workflow Broken**: "Start Travel", "Complete Job" buttons missing. No field worker flow exists.
- **Calendar Logic Missing**: No confirmation status or "Nudge" workflow on calendar items.
- **Reporting & Feedback Missing**: No analytics or reputation management features.
- **Global Search Broken**: `Cmd+K` returns no results for existing data.
- **AI Logic Gaps**: Chat assistant cannot handle basic marketing/job queries described in use cases.

## Medium Priority (UX/UI Gaps)
- **Deal Photos Tab**: Missing from Deal Details view. Critical for "Tire Kicker" use case.
- **Asset/Handover UI**: Missing sections for Asset DNA and Digital Handover.
- **Contact Properties**: Missing "Properties" tab for multi-property landlords.
- **Internal Workflows**: Missing modals for Stale Deal follow-up and Job Completion reviews.
- **Team Management**: No UI for adding subcontractors or managing permissions.
- **Settings Missing**: No UI for "AI Voice Agent" or "After Hours Mode".

## Low Priority (Polish/Edge Cases)
