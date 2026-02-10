---
description: Update project docs after each batch of code changes
---

# Post-Change Documentation Workflow

> **MANDATORY**: After every batch of code changes (commit or group of related commits), update these 3 files before pushing or ending your session.

## Files to Update

### 1. `project_status_log.md`
Add a new entry at the top of the change log section:
```
### YYYY-MM-DD HH:MM AEST [Role - Agent Name] - Category
**Feature/Fix**: Short description
*   **Detail 1**: What was done
*   **Files created/modified**: List specific files
*   **Commit**: hash
*   **Status**: Which ERR/task this resolves
```

### 2. `HANDOVER.md`
Overwrite with current session state:
- Last updated timestamp
- What was done (grouped by batch/commit)
- Current build/deploy state
- Known issues
- Next steps
- Key notes for other agents

### 3. `error_tracking_log.md`
If you fixed a bug or discovered a new one:
- Add a new `## ERR-NNN` entry with: Status, Symptoms, Root Cause, Solution, Files Modified, Learning
- Update existing entries if their status changed
- Update the "Quick Reference" section if applicable

## Commit Order
// turbo
1. Stage all doc changes: `git add project_status_log.md HANDOVER.md error_tracking_log.md`
// turbo
2. Commit: `git commit -m "docs: update status log, handover, and error log"`
// turbo
3. Push: `git push origin main`

## Key Rules
- **Never hardcode `"demo-user"`** — use `lib/auth.ts` helpers instead
- **Always include AEST timestamps** in log entries
- **Reference ERR-NNN IDs** from `error_tracking_log.md` when relevant
- **List all files touched** so other agents know what changed
