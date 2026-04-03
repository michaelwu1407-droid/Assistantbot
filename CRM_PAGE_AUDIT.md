# CRM Page Audit

Audit date: 2026-04-03

This audit is intentionally practical. It focuses on whether the real CRM pages and user flows feel complete enough to use, not just whether underlying functions exist.

Status meanings:

- `go`
  The page or flow has a real entry point, the core action path works, and there is meaningful test coverage.
- `watch`
  The page is real and usable, but there are still important gaps in verification, polish, or surrounding workflow.
- `gap`
  The page or linked flow is missing, broken, misleading, or incomplete enough to block confident use.

## What was fixed in this pass

1. Contact create flow
   - Added a real `/crm/contacts/new` page instead of leaving the existing "Add contact" links pointing nowhere.
2. Contact edit flow
   - Added a real `/crm/contacts/[id]/edit` page so the existing "Edit" action on contact detail no longer dead-ends.
3. Inbox deep links
   - `/crm/inbox?contact=<id>` now actually opens the intended contact thread instead of ignoring the query param.
4. Test reliability
   - Added focused coverage for the new contact form flow and inbox deep-linking.
   - Updated the map-view test to avoid a brittle fixed-date assumption.
5. Manager-only route guards
   - Added server-side route guards for analytics and integrations so direct URLs are blocked before the page renders for team members.
6. Team page coherence
   - Hid invite and role-management controls for team members so they no longer see actions they are not allowed to use.
7. Schedule failure feedback
   - Schedule drag/drop now shows a visible toast error instead of only logging to the console when an update fails.
8. Schedule lane coherence
   - Team members now only see their own schedule lane instead of the whole roster with everyone else's empty rows.
   - The team filter now hides itself when there is only one visible team member.
9. Settings discoverability proof
   - Added direct coverage that team members do not see manager-only Billing and Integrations links in the settings sidebar.
10. Deal direct-link access
   - Team members can no longer open arbitrary deal detail or edit pages in their workspace by guessing `/crm/deals/[id]` URLs.
   - Deal detail and edit pages now scope through the same deal-access guard as the rest of the job actions.
11. Deal reassignment guardrail
   - Team members can no longer reassign jobs through the edit form or server action path.
   - The edit page now hides assignment controls when the current user should not manage assignment.
12. Team page proof
   - Added direct tests for manager vs team-member rendering on the team page so invite-management visibility is no longer just inferred from code.
13. Contact direct-link access
   - Team members can no longer open unrelated contact detail pages by direct URL unless that contact is tied to one of their assigned jobs.
14. Map role filtering
   - Team members now only see their own scheduled jobs on the map, matching the schedule page instead of loading the whole workspace roster.
15. Detail-page related history scoping
   - Team members no longer see other tradies' jobs or unrelated contact history inside shared contact/deal detail pages.
   - Contact detail now filters jobs, feedback, and timeline items down to the tradie's visible assigned jobs.
   - Deal detail now filters the "Past jobs" panel to only that tradie's other assigned jobs for the same customer.
16. Contact mutation guard alignment
   - Contact edit/delete server actions now match the manager-only CRM UI instead of allowing team members to mutate records through direct action calls.
   - This closes the gap between what the pages showed and what the backend would still accept.
17. Schedule truthfulness on failed drops
   - The schedule calendar no longer treats a non-throwing `{ success: false }` deal update as a success.
   - Failed drag/drop updates now show the backend error message and refresh back to server truth instead of leaving a false "Job updated" impression.
18. Deal modal truthfulness and navigation
   - Deal-detail modal "Edit" actions now land on real edit pages instead of looping back to read-only detail screens.
   - The quick-update send button now actually sends the message instead of only working via Enter key in the input.
   - Draft confirmation and invoice saves now respect returned `{ success: false }` errors instead of falsely toasting success.
19. Deal modal related-job scoping
   - The `/api/deals/[id]` modal data route now scopes related customer jobs the same way as the full detail page, so team members do not see other tradies' jobs inside the modal.
20. Billing and photo flow truthfulness
   - The deal billing tab no longer treats a returned `{ success: false }` invoice-creation result as success.
   - Photo upload now has direct component proof for both the success path and the returned backend-error path, so that surface is no longer just assumed from the action code.
21. Settings route coherence proof
   - Legacy settings URLs now have direct redirect coverage to their canonical pages, so users who land on old paths still reach a real destination instead of a dead branch.
   - Billing now has direct route-level proof that team members are blocked before the page loads, not just hidden from the sidebar.
22. Tradie on-my-way guard alignment
   - The `sendOnMyWaySMS` action now scopes through the shared deal-access guard before loading the job, matching the rest of the tradie CRM workflow instead of doing an unscoped read first.

## CRM surface status

### `/crm/dashboard`

- Status: `go`
- Why:
  - Real page with auth, billing, and onboarding gates.
  - Loads workspace, deals, and team members.
  - Backed by working kanban board tests and dashboard layout coverage.
- Evidence:
  - `__tests__/dashboard-layout.test.tsx`
  - `__tests__/kanban-board.test.tsx`

### `/crm/contacts`

- Status: `go`
- Why:
  - Real manager-facing list with search, filtering, pagination, and delete flow.
  - Contact links route into real detail pages.
  - This pass restored the missing create and edit paths.
- Evidence:
  - `__tests__/contacts-client.test.tsx`
  - `__tests__/contact-form.test.tsx`

### `/crm/contacts/new`

- Status: `go`
- Why:
  - Newly added real create page.
  - Supports person or business contact creation and routes to the created record.
- Evidence:
  - `__tests__/contact-form.test.tsx`

### `/crm/contacts/[id]`

- Status: `watch`
- Why:
  - Detail page is real and rich, with job links, notes, feedback, and activity.
  - Usable now that edit path exists.
  - This pass closed a direct-link access hole by scoping contact detail through the contact guard, so tradies cannot browse unrelated customer records by URL.
  - This pass also scoped the visible jobs, feedback, and timeline items on the page itself so tradies do not see other team members' customer history once they are inside a shared contact.
  - Still needs a fuller end-to-end journey test around linked actions and role-specific expectations.
- Evidence:
  - `__tests__/contact-page-access.test.tsx`

### `/crm/contacts/[id]/edit`

- Status: `go`
- Why:
  - Newly added real edit page.
  - Existing edit links now land somewhere correct and save back into CRM.
  - Contact mutation guards now match the page-level permissions, so team members cannot bypass the manager-only edit restriction through direct server action calls.
- Evidence:
  - `__tests__/contact-form.test.tsx`
  - `__tests__/contact-actions.test.ts`

### `/crm/inbox`

- Status: `go`
- Why:
  - Real inbox view with contact selection, thread detail, direct send, and "Tell Tracey" mode.
  - This pass fixed the broken deep-link expectation from contact/deal surfaces.
- Evidence:
  - `__tests__/inbox-view.test.tsx`
- Watch items:
  - Still manager-only at page level.
  - Would benefit from a page-level route test around query-param behavior and permissions.

### `/crm/schedule`

- Status: `watch`
- Why:
  - Real schedule page with direct route-level and component-level coverage for manager vs team-member views.
  - Team members now only see their own jobs and their own lane, which matches the intended restricted workflow better.
  - Failed drag/drop updates now surface real backend rejection messages instead of falsely toasting success.
- Evidence:
  - `__tests__/schedule-page.test.tsx`
  - `__tests__/schedule-calendar.test.tsx`
- Watch items:
  - Still needs end-to-end verification for drag/update side effects like reminders, confirmations, and assignment changes.

### `/crm/map`

- Status: `go`
- Why:
  - Real page with scheduled-job loading, empty state, route mode, and action affordances.
  - Existing interaction coverage is good enough for now.
  - This pass aligned role filtering with the schedule page, so tradies only see their own assigned scheduled jobs instead of the whole workspace map.
- Evidence:
  - `__tests__/map-view.test.tsx`
  - `__tests__/map-page-access.test.tsx`

### `/crm/deals/[id]`

- Status: `watch`
- Why:
  - Real detail page with contact info, notes, photos, billing tab, sync issues, and inbox link.
  - This pass closed a real access hole by routing detail-page access through the scoped deal guard, so team members cannot open arbitrary jobs by direct URL anymore.
  - This pass also scoped the related "Past jobs" panel so tradies do not see other team members' jobs for the same customer.
  - The linked modal actions are now more coherent too: edit buttons go to edit pages, quick-send actually fires from the button, and failed saves no longer pretend they worked.
  - The billing tab now tells the truth when invoice creation is rejected, and the photo-upload surface now has direct proof for both success and returned backend-error handling.
  - The deeper component behavior is covered, but linked actions and end-to-end state changes still need tighter verification.
- Evidence:
  - `__tests__/deal-detail-modal.test.tsx`
  - `__tests__/deal-edit-form.test.tsx`
  - `__tests__/deal-api-route.test.ts`
  - `__tests__/deal-page-access.test.tsx`
  - `__tests__/job-billing-tab.test.tsx`
  - `__tests__/deal-photos-upload.test.tsx`
  - `__tests__/tradie-actions.test.ts`

### `/crm/team`

- Status: `watch`
- Why:
  - Real page with member list and invite management.
  - This pass hid invite and role-management controls for team members so the page matches what they can actually do.
  - Now has direct role-specific rendering coverage, but the deeper invite/revoke/remove flows still need more end-to-end verification.
- Evidence:
  - `__tests__/team-page.test.tsx`

### `/crm/analytics`

- Status: `go`
- Why:
  - Real page with reporting UI and role-aware redirect logic.
  - This pass added a server-side route guard so direct URL access for team members is blocked before render.
- Evidence:
  - `__tests__/crm-route-guards.test.tsx`

### `/crm/settings/*`

- Status: `watch`
- Why:
  - Large real settings surface with many tested actions.
  - Manager-only sidebar discoverability now has direct coverage, so team members no longer see obvious dead-end nav links for Billing and Integrations.
  - Legacy route aliases like old phone, support, SMS template, AI voice, and after-hours paths now have direct proof that they redirect into the canonical settings pages instead of stranding users.
  - Billing access is now proven at the page boundary too, not just inferred from hidden sidebar links.
  - Not fully journey-audited in this pass.
  - Some sections are already stronger than others, so this needs a dedicated settings audit rather than a blanket claim.
- Evidence:
  - `__tests__/settings-layout.test.tsx`
  - `__tests__/settings-route-redirects.test.tsx`

### `/crm/settings/integrations`

- Status: `go`
- Why:
  - Real page and now server-guarded for manager-only access, which matches sidebar visibility.
- Evidence:
  - `__tests__/crm-route-guards.test.tsx`

### `/crm/settings/billing`

- Status: `go`
- Why:
  - Real page with current subscription status and management CTA.
  - Now has direct route-level proof that team members are redirected out before workspace/billing data loads, which matches the CRM navigation rules.
- Evidence:
  - `__tests__/settings-route-redirects.test.tsx`

## Remaining CRM concerns worth auditing next

1. Deals detail and edit as a full journey
   - message customer
   - verify state reflects correctly everywhere
   - tighten any remaining linked-action journey gaps outside the now-covered billing/photo surfaces

2. Schedule journey
   - drag/update interactions
   - confirmation/reminder side effects

3. Team and analytics pages
   - server/client access behavior
   - role-based discoverability
   - empty/error states

4. Settings journey
   - especially phone, agent, inbox/messaging, and business profile settings beyond the now-proven redirect/access paths

## Current blunt verdict

The core CRM is now more trustworthy than it was at the start of this pass.

Most solid right now:

- dashboard / kanban
- contacts list
- contact create/edit
- contact access scoping
- inbox thread selection
- deal access scoping
- schedule access and lane visibility
- map access and route visibility

Still usable but not fully proven:

- deal detail journeys
- contact detail journeys
- schedule side effects
- team
- analytics
- the broader settings surface
