> **⚠️ OUTDATED — historical reference only (as at 30 May 2026).** For current truth see `AGENTS.md` and `docs/current_agent_handoff.md`.

# Use Case Walkthroughs — historical record (SUPERSEDED)

> **Status: historical snapshot (Feb 2026). Do not use the old verdicts as current truth.**
> The canonical, current testing guide is **`docs/APP_TESTING_PLAYBOOK.md`**. Run workflows
> from there. This file is kept only as a record of the early manual passes and what they found.

## Why this was superseded

The original batches recorded many ❌/⚠️ verdicts that **later rounds in this same document
fixed**, and several used the stale `/dashboard/*` routes (live routes are `/crm/*`). Rather
than keep contradictory verdicts scattered here, the live test plan now lives in one place
(the playbook). Below is the reconciled outcome.

## Reconciled status (corrected)

Resolved since the early batches (confirmed by later rounds and current routes):

- **Reports/Analytics** — early ❌ (`/crm/reports` 404). Now ✅ via `/crm/analytics`.
- **Feedback & Reputation** — early ❌ (crash). Now ✅ (page loads).
- **Team Management** — early ❌ (404). Now ✅ at `/crm/team`.
- **Tradie workflow (Start Travel / Complete Job)** — early ❌. Now ✅ via "Open Job Mode".
- **Photos tab** — recorded both missing and present; now present on job details.
- **`/crm/hub`** — early 404; route now exists (re-test its content).
- **AI job creation by chat** — ✅ (e.g. "New repair job for Frank at 300 George St for $600 tomorrow").

Still unverified / re-test in the playbook (no confirmed fix on record):

- **Global search (Ctrl+K)** — earlier passes returned "no results"; re-confirm. (Playbook C/3.2)
- **Kanban drag-and-drop** — earlier passes reported failures; re-confirm. (Playbook B2/C3)

## Where to go next

- Current feature inventory + workflows: `docs/APP_TESTING_PLAYBOOK.md`
- Current known gaps/decisions: `docs/missing_features.md`
- What shipped, by version: `CHANGELOG.md`
</content>
</invoke>
