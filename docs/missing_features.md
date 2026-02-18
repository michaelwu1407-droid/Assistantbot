# Missing Features & Gap Analysis

This document collates all discrepancies between the `APP_MANUAL.md` and the actual codebase found during stress testing.

## High Priority (Core Flows Broken)

- **Job Workflow Broken**: "Start Travel", "Complete Job" buttons missing. (FIXED in Round 3)
- **AI Voice Agent**: Random caller -> AI answers, asks profile Qs, books time -> Logs to CRM. (MISSING - Priority High)
- **AI SMS Agent**: Random SMS -> AI replies, asks profile Qs, books time -> Logs to CRM. (MISSING - Priority High)
- **Global Search Hidden**: Logic exists but search index verified broken.
- **AI Logic Gaps**: Chat Assistant for internal queries missing.

## Medium Priority (UX/UI Gaps)
- **Deal Photos Tab**: Missing from Deal Details view.
- **Kanban Automation**: Missing modals for Stale Deal drag-and-drop.
- **Asset/Handover UI**: Missing sections for Asset DNA and Digital Handover.
- **Settings Missing**: No UI for "AI Voice Agent" or "After Hours Mode".

## Low Priority (Polish/Edge Cases)
