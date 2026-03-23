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

There is an active "Approval" flow for job completion:

1. When a job is marked for completion, it enters the **`PENDING_COMPLETION`** stage.
2. On the Kanban board, these jobs appear inside the **Completed** column with an **amber dashed border**.
3. Managers opening these deal cards will see specific **Approve** (green) and **Reject & send back** (amber) buttons. 
4. **On approve**, the deal is fully `Completed`.
5. **On reject**, the manager can provide a rejection reason, which logs to the activity feed and sends the deal back.

For data corrections via chat (e.g. "I made $200 in February"), the manager must type **confirm** in the chat when prompted by the AI.
