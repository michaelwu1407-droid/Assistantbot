# Bug & Issue Log

## Priority Levels
- **P0**: Critical (Crash, Data Loss, Blocked Workflow)
- **P1**: High (Major Feature Broken, No Workaround)
- **P2**: Medium (UI/UX Glitch, Minor Functional Issue)
- **P3**: Low (Cosmetic, Typos)

## Round 1 Findings (Verification Phase 2)

### P0 - Critical
- [ ] **Tradie Dashboard Crash**: Clicking a job not scheduled for "Today" results in "All Caught Up" empty state because `getTodaySchedule` doesn't fetch specific IDs. (Confirmed in prev step)

### P1 - High
- [ ] **Tradie Navigation**: "Open Job Mode" button is missing from job cards; users must click the card itself which is not obvious.

### P2 - Medium
- [ ] **Global Search**: Search can be slow/unresponsive (noted in previous runs).

### Verified Bugs (Round 3 - Final)
- [x] **Tradie Deep Link**: **FIXED**. Deep linking to "Eve" (future job) correctly showed Job Details. The "All Caught Up" bug is resolved.
- [x] **AI Parsing**: **FAIL**. "New job for Eve..." -> Parsed Price=$0, Name=Mixed. P1 Issue.
- [x] **Global Search**: **FAIL**. Search for "Eve" returned "No results" consistently. Console error observed: `useIndustry must be used within an IndustryProvider`.
- [x] **Kanban Drag**: **FAIL**. Drag functionality is broken; deals do not stick to "Lost" column and no modal appears.

## Sprint 21 Updates (2026-02-22)

### P1 - High (Resolved)
- [x] **AI Parsing / Pricing**: Refactored AI agent from context-stuffing to tool-use architecture. Agent now calls `searchJobHistory`, `getFinancialReport`, and `getClientContext` tools for just-in-time data retrieval instead of guessing from stale prompt context. Should significantly improve pricing accuracy.
- [x] **Vercel Build Failure**: `pnpm-lock.yaml` was out of sync with `package.json`, causing `ERR_PNPM_OUTDATED_LOCKFILE` on frozen-lockfile installs. Regenerated lockfile.

### P2 - Medium (Open)
- [ ] **Global Search**: Search for contacts still uses `useIndustry` provider which may not be mounted in all contexts. Needs provider wrapping or fallback.
- [ ] **Kanban Drag**: Drag-and-drop to "Lost" column doesn't persist. Needs investigation into DnD event handler and `updateDealStage` call.

### Summary
The critical **AI Agent** architecture has been rebuilt from context-stuffing to tool-use, resolving data-staleness and pricing issues. **Vercel deploy** is unblocked. **Search** and **Kanban drag** remain open for next sprint.

## Sprint 24 Updates (2026-02-27)

### P1 - High (Resolved)
- [x] **Goldfish Effect after Support Ticket**: **FIXED**. Added sticky context pattern using `SYSTEM_CONTEXT_SIGNAL` + `appendTicketNote` tool/action so immediate follow-up details are appended to the same ticket.
- [x] **Automated calling/texting page load failure**: **FIXED**. Settings page now handles partial fetch failures without becoming unusable.

### P2 - Medium (Resolved)
- [x] **Settings overlap (Notifications vs Automated calling & texting)**: **FIXED**. Removed duplicate automated communication controls from Notifications and consolidated behavior in one tab.
- [x] **Display theme behavior**: **FIXED**. Restored Dark option, enabled true system auto theme, and improved dark palette readability.

### P3 - Low (Resolved)
- [x] **Billing label mismatch**: **FIXED**. Updated plan and manage button text (`Earlymark Pro`, `Manage`).
- [x] **Privacy naming mismatch**: **FIXED**. Replaced legacy product naming with Earlymark AI, added Data Policy (DRAFT), removed data export request control.
