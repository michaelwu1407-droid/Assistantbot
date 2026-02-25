# Team Roles and Manager Approval

## Roles

- **OWNER** – Workspace owner; can do everything including billing and removing members. Created when you sign up from the main site; always has a User row so they appear in the team list and kanban filter.
- **MANAGER** – Team manager; can invite/remove members (except owner), and **confirm data changes** (revenue, etc.). Can be invited via link with role “Manager”.
- **TEAM_MEMBER** – Can use the app and update jobs/contacts, but **cannot** confirm changes to shared data (e.g. revenue) without manager approval. Typically invited via link; kanban defaults to **My jobs** (filtered to their assigned jobs).

## Invites and how roles are set

- **Invite link** (Team page): When creating an invite, you choose **They’ll join as** (Team Member or Manager). The link is fixed to that role; share it by email or copy link. Expires in 7 days.
- **Kanban view by role**: Team members see the board defaulted to “My jobs”; owners/managers see “All jobs”. Everyone can change the header filter (All jobs, Unassigned, or a specific team member).

## Data corrections (e.g. “I made $200 in February”)

- **Managers (OWNER/MANAGER):** The AI can offer to update data and ask them to type **confirm**; once they confirm, the change is applied (e.g. `recordManualRevenue`).
- **Team members:** The AI does **not** offer the “confirm” flow. It tells them that only the team manager or owner can make that change; they should ask their manager.

So team members cannot change shared data (like revenue) on their own; only managers can confirm those updates.

## Where does the team manager approve job/customer card changes?

**Currently there is no single “Approvals” or “Pending approval” screen.**

- **Job cards / customer cards:** Edits (details, stage, etc.) are applied **immediately** by whoever makes the change. There is no “pending” state that waits for manager approval.
- **Moving a job to “Completed”:** Today, any user who can move deals can move a job to Completed; there is no separate manager-approval step.

So today the team manager does **not** have one place to go to “approve” team member changes to job/customer cards or completion. To add that you would need:

1. A way for team member edits (or “mark as completed”) to create a **pending** item instead of applying immediately.
2. A dedicated **Approvals** (or “Pending approval”) area—e.g. under **Dashboard** or **Team**—where the manager sees a list of pending changes and can **Approve** or **Reject**.
3. On approve, the change is applied (e.g. deal stage → Completed, or updated job/contact details).

Until that flow exists, manager “approval” is only for **data corrections** in chat (revenue, etc.), where the manager types **confirm** in the chat after the AI offers the change.
