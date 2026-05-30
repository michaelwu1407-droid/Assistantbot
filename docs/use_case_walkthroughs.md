> **⚠️ OUTDATED — historical reference only (as at 30 May 2026).** For current truth see `AGENTS.md` and `docs/current_agent_handoff.md`.

# Use Case Walkthroughs — historic walkthrough log

> **Status as of 2026-05-24:** this file is the **historic log** of
> manual walkthrough rounds. It is preserved for evidence (screenshots,
> fixture IDs, exact reproduction steps) but it is no longer the live
> source of truth for which use cases work today.
>
> For the **current state** of every use case, including the originals
> below (UC1..UC16), see `USE_CASE_TEST_MATRIX.md`. The mapping is:
>
> | Original UC | Now tracked in matrix as |
> |-------------|---------------------------|
> | UC1 Missed Call Rescue | `crm-27`, `voice-01..03` |
> | UC2 Rainy Day Blast | `comm-11`, `ai-05`, `crm-35` (`/crm/hub` 404) |
> | UC3 Tire Kicker Filter | `crm-18`, `crm-22` |
> | UC4 Pre-Arrival Friction Reducer | `job-01..02`, `crm-38` |
> | UC5 No-Show Prevention | `cal-04`, `cal-05` |
> | UC6 Context King (search) | `crm-39`, `modal-12` |
> | UC7 Ghosted Quote Resurrection | `crm-20` |
> | UC8 Post-Job Reputation Building | `job-08`, `job-09` |
> | UC9/15 CRM Filters | `crm-13`, `crm-14` |
> | UC10 Digital Handover | `job-06` |
> | UC11 After-Hours Gatekeeper | `set-03` |
> | UC13 Multi-Property Nexus | `crm-16` |
> | UC14 Uber-Style Arrival | `pub-05` |
> | UC16 Asset DNA | `crm-17` |
>
> Do not update the per-round results below. Update the matrix row
> instead, and link this file from the row's *Notes* column if the
> historic evidence (screenshots, fixture IDs) is still useful.

---

# Use Case Walkthroughs (Round 2)

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
