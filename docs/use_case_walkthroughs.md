# Use Case Walkthroughs

This document records the step-by-step execution of user journeys defined in the `APP_MANUAL.md`.

## Legend
- ✅ **Passed**: Feature exists and works as described.
- ⚠️ **Partial**: Feature exists but has issues or differs from manual.
- ❌ **Failed/Missing**: Feature does not exist or is completely broken.

---

## Batch 1: Communication & Inbox

### Use Case 1: Missed Call Rescue
- **Status**: ✅ **Passed**
- **Test**: Navigated to `/dashboard/inbox`.
- **Observation**: "Call" button exists in contact header. SMS transcript is visible and functional.

### Use Case 2: Rainy Day Blast (Chat)
- **Status**: ⚠️ **Partial**
- **Test**: Navigated to `/dashboard/hub` (404 Error) -> Used Sidebar Chat.
- **Observation**:
  - `/dashboard/hub` does not exist.
  - Sidebar Chat exists but AI failed to handle "Find me indoor work" query.
  - No specific "Marketing Blast" UI found in chat suggestions.

### Use Case 3: Tire Kicker Filter (Deals)
- **Status**: ⚠️ **Partial**
- **Test**: Navigated to `/dashboard/deals`, opened "Kitchen Reno".
- **Observation**:
  - "Quick Reply" button found in Activity history.
  - ❌ **Missing**: "Photos" tab is completely absent.

### Use Case 6: Context King (Search)
- **Status**: ❌ **Failed**
- **Test**: `Ctrl+K`, searched "John" and "Sally".
- **Observation**: Search modal opens but returns "No results found" for known data. Search index appears broken.

### Use Case 11: After-Hours Gatekeeper
- **Status**: ❌ **Failed**
- **Test**: Navigated to `/dashboard/settings`.
- **Observation**: Checked Automations, Integrations, Notifications. No "Voice Agent" or "After Hours" settings found.

---

## Batch 2: Jobs & Field Work

### Use Case 4: Pre-Arrival Friction Reducer
- **Status**: ❌ **Failed**
- **Test**: Navigated to `/dashboard/tradie` (404), checked Job Details.
- **Observation**:
  - `/dashboard/tradie` (Map View) does not exist.
  - No "Start Travel" button found on Job Details.
  - Sidebar "Hammer" icon is non-functional.

### Use Case 8: Post-Job Reputation Building
- **Status**: ❌ **Failed**
- **Test**: Checked Job Details for completion flow.
- **Observation**: No "Complete Job" button. Dragging Deal to "Completed" column didn't trigger review prompt.

### Use Case 10: Digital Handover
- **Status**: ❌ **Failed**
- **Test**: Scrolled Job Details.
- **Observation**: No "Handover" section or "Add Resource" button.

### Use Case 14: Uber-Style Arrival
- **Status**: ❌ **Failed**
- **Observation**: Dependent on "Start Travel" which is missing.

### Use Case 16: Asset DNA
- **Status**: ❌ **Failed**
- **Test**: Searched for "Assets", checked Job Details.
- **Observation**: No asset tracking UI or QR scan features found.

---

## Batch 3: Scheduling & CRM

### Use Case 5: No-Show Prevention
- **Status**: ❌ **Failed**
- **Test**: Checked Calendar events.
- **Observation**: No visual confirmation status (checkmarks/question marks). clicking event navigates to deal, no "Nudge" popover.

### Use Case 7: Ghosted Quote Resurrection
- **Status**: ⚠️ **Partial**
- **Test**: Checked Kanban board.
- **Observation**:
  - ✅ "Stale" badges exist.
  - ❌ Dragging to other columns does NOT trigger any follow-up workflow/modal.

### Use Case 13: Multi-Property Nexus
- **Status**: ❌ **Failed**
- **Test**: Checked Contact Details (Sally).
- **Observation**: No "Properties" tab or list of addresses found.

### Use Case 9/15: CRM Filters
- **Status**: ⚠️ **Partial**
- **Test**: Checked Contact Filter Bar.
- **Observation**:
  - ✅ "Service Due" filter exists.
  - ❌ "Last Job Date" and "Suggested Campaign" filters missing.

---

## Batch 4: Advanced & Edge Cases

### Reports & Analytics
- **Status**: ❌ **Failed**
- **Test**: Checked Sidebar and `/dashboard/reports`.
- **Observation**: No reporting UI exists beyond basic pipeline totals.

### Feedback & Reputation
- **Status**: ❌ **Failed**
- **Test**: Checked Sidebar and `/dashboard/feedback`.
- **Observation**: Feature completely missing.

### Team Management (Subbies)
- **Status**: ❌ **Failed**
- **Test**: Checked Settings/Workspace and `/dashboard/team`.
- **Observation**: No user management or subcontractor permissions found.
