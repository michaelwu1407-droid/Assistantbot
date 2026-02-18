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

### Summary
The critical **Tradie Workflow** blocker is resolved. However, **Search** reliability and **AI Parsing** quality remain high-priority issues for the next sprint.
