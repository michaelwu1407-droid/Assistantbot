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
  - Still needs a dedicated page-level journey test, not just component-level coverage.

### `/crm/contacts/[id]/edit`

- Status: `go`
- Why:
  - Newly added real edit page.
  - Existing edit links now land somewhere correct and save back into CRM.
- Evidence:
  - `__tests__/contact-form.test.tsx`

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
  - Real schedule page with role-aware filtering.
  - Appears logically sound from code, but this pass did not add direct schedule-page tests.
- Watch items:
  - Needs end-to-end verification for team-member filtering and schedule interactions.

### `/crm/map`

- Status: `go`
- Why:
  - Real page with scheduled-job loading, empty state, route mode, and action affordances.
  - Existing interaction coverage is good enough for now.
- Evidence:
  - `__tests__/map-view.test.tsx`

### `/crm/deals/[id]`

- Status: `watch`
- Why:
  - Real detail page with contact info, notes, photos, billing tab, sync issues, and inbox link.
  - The deeper component behavior is covered, but page-level navigation and linked actions still need tighter verification.
- Evidence:
  - `__tests__/deal-detail-modal.test.tsx`
  - `__tests__/deal-edit-form.test.tsx`

### `/crm/team`

- Status: `watch`
- Why:
  - Real page with member list and invite management.
  - Actions enforce owner/manager permissions, but the page itself is client-rendered and not yet strongly page-tested.

### `/crm/analytics`

- Status: `watch`
- Why:
  - Real page with reporting UI and role-aware redirect logic.
  - This pass did not verify the full analytics fetch/report journey end to end.

### `/crm/settings/*`

- Status: `watch`
- Why:
  - Large real settings surface with many tested actions.
  - Not fully journey-audited in this pass.
  - Some sections are already stronger than others, so this needs a dedicated settings audit rather than a blanket claim.

## Remaining CRM concerns worth auditing next

1. Deals detail and edit as a full journey
   - open from dashboard
   - edit
   - save
   - message customer
   - verify state reflects correctly everywhere

2. Schedule journey
   - manager view
   - team-member restricted view
   - drag/update interactions
   - confirmation/reminder side effects

3. Team and analytics pages
   - server/client access behavior
   - role-based discoverability
   - empty/error states

4. Settings journey
   - especially phone, agent, inbox/messaging, and business profile settings

## Current blunt verdict

The core CRM is now more trustworthy than it was at the start of this pass.

Most solid right now:

- dashboard / kanban
- contacts list
- contact create/edit
- inbox thread selection
- map

Still usable but not fully proven:

- deal detail journeys
- schedule
- team
- analytics
- the broader settings surface
