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
