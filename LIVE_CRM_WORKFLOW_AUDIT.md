# Live CRM Workflow Audit

Audit date: 2026-04-04

Status note:

- This is a rolling audit log, not guaranteed current truth.
- Some issues listed below may already be fixed in later commits.
- Use this file as a lead list plus evidence trail, then re-verify each item in the current app before making changes.

Environment:

- Live authenticated browser session on `https://www.earlymark.ai`
- Account: `Miguel` (`OWNER`)
- Testing style: end-to-end live UI workflows with fake data only
- Safety rule: no intentional real customer messages or live-provider calls

This file is the practical issue list for the highest-frequency CRM journeys. It is meant to answer three questions:

1. What are the main user scenarios?
2. What should the workflow logic be?
3. What actually happens in the live product today?

## Top scenarios

These are the highest-value CRM scenarios for an owner/admin:

1. Lead intake
   Create a new job and customer from the dashboard.
2. Contact management
   Find the customer again, open the record, edit details, and understand the current job.
3. Job scheduling
   Turn the lead into a scheduled job with an assignee and time, then see that reflected everywhere.
4. Inbox and follow-up
   Jump from the job into the conversation thread and choose between Ask Tracey and direct messaging.
5. Core admin setup
   Understand phone handling and the WhatsApp assistant from Settings without hidden next steps.
6. Communication history and integration context
   See inbound and outbound email, SMS, and calls in the CRM without using real providers.
7. Billing and payment handoff
   Create an invoice from the job and check whether the resulting stage and amount make sense across CRM surfaces.
8. Stage progression and discovery
   Move a fresh fake job through quote, scheduled, completed, and deleted, then test whether search and stage logs make sense.
9. Notifications and quick actions
   Check whether notification follow-up feels actionable and whether assistant quick actions actually do something obvious.
10. Intake validation and partial lead details
   Check whether the app accepts realistic first-contact lead data and whether the form copy matches the real validation rules.
11. Notes and audit trail visibility
   Check whether saved notes become visible in the places a user would expect to find them later.
12. Calendar rescheduling and map planning
   Test schedule interaction directly from the calendar and compare it with the job page and map surface.
13. Contact search, filters, and bulk actions
   Check whether list search/filtering is truthful and whether bulk selection actions actually work.
14. Analytics comprehension
   Check whether reporting filters behave and whether the metrics read like a finished product.
15. Team management and invite flow
   Check whether the team page and invite flow are understandable without actually emailing anyone.
16. Settings admin flows
   Check whether billing, privacy, notifications, and support behave like trustworthy finished product surfaces.
17. Integration connection handoff
   Check whether each provider connect CTA hands off to a valid auth/configuration flow without immediately failing.
18. Modal and card overflow behavior
   Check whether opened cards keep bottom actions reachable through internal vertical scrolling instead of relying on page scroll.
19. Tracey chatbot as an interactive CRM operator
   Stress test whether Tracey can answer CRM questions, mutate CRM state safely, and reason through realistic day-to-day manager/tradie requests.

## Scenario matrix

### 1. Lead intake from dashboard

- Intended workflow:
  - open `/crm/dashboard`
  - click `New Job`
  - create a new contact inline
  - create the job
  - land in a state where the next step is obvious
- Live test:
  - created `ZZZ FLOW Contact 1775274495188`
  - created `ZZZ FLOW Job 1775274495188`
  - created record appeared on dashboard immediately
- Result: `watch`
- What worked:
  - the create modal is discoverable
  - inline new-contact creation works
  - created job appears on the board
- Issues:
  - address capture still feels fragile. In earlier live testing, a typed address of `500 QA Avenue, Sydney NSW` ended up saved as `Sydney Street, Nelson Bay NSW 2315`, which means the current address workflow is not trustworthy unless the user explicitly lands on a valid autocomplete selection.
  - the create flow does not clearly guide the user to the created job or contact after success. The dashboard updates, but the follow-through is weak.
  - the create form labels `EMAIL *` and `PHONE *`, but the real rule is `email or phone required`. Email-only and phone-only creation both worked in live testing, so the field labels are misleading.
  - invalid-email handling was weak. A bad email value did not produce a clear visible explanation during testing; it simply failed to complete the create flow.

### 2. Contact management

- Intended workflow:
  - open `/crm/contacts`
  - find the contact
  - open the record
  - edit the details
  - understand the customer and current job from the detail page
- Live test:
  - opened the new contact from the contacts page
  - edited company and address on `/crm/contacts/[id]/edit`
  - save succeeded and stayed on the edit page with `Contact updated.`
- Result: `watch`
- What worked:
  - contact detail page loads reliably
  - edit page loads and accepts saves
  - current job cross-linking from the contact page works
- Issues:
  - the contacts list is lying about its totals. The page rendered 4 visible rows, the footer said `Showing 8 of 8 contacts (page 1)`, and `Next` was disabled. That is a high-trust bug.
  - both create and edit success paths leave the user on the form with a toast instead of clearly redirecting back to the contact or list.
  - the contact detail page does not surface company or address, even though those fields are editable and important to CRM users.

### 3. Job scheduling and downstream coherence

- Intended workflow:
  - open the job
  - edit title/value/stage/assignee/time
  - move it to `Scheduled`
  - see the new schedule reflected on the job page, contact page, schedule page, and map
- Live test:
  - opened the job from the dashboard
  - moved it from `New request` to `Scheduled`
  - assigned it to `Miguel`
  - set `2026-04-06 10:30`
  - verified the job detail page showed `Apr 6, 2026 10:30 AM`
  - verified the contact page showed the job as `Scheduled`
  - verified inbox system activity showed the stage and schedule update
- Result: `watch`
- What worked:
  - the edit page supports scheduling cleanly
  - scheduling updates propagate to deal detail
  - contact detail and inbox system activity reflect the update
- Issues:
  - the save flow is weak. After saving, the user stays on the edit page with no strong completion signal or redirect.
  - [FIXED 2026-04-05] the schedule page appears to have a timezone or rendering mismatch. The same job 
that shows `Apr 6, 2026 10:30 AM` on the job page showed up on `/crm/schedule` as `8:30 PM`.
    - Note: This was a UTC-anchoring bug in the AI scheduling path. AI-set times were stored as UTC wall-clock times without workspace offset correction. Fixed in `actions/chat-actions.ts` by resolving natural strings against the workspace timezone before persistence. revalidatePath calls were also added to all scheduler-touching actions.
  - the map page says upcoming booked jobs appear on the map, but this journey still needs a clearer way to confirm which job is being shown when it is not scheduled for today.

### 4. Inbox and follow-up

- Intended workflow:
  - jump from a job or contact into the inbox
  - immediately understand whether you are talking to the customer directly or asking Tracey to act
  - send or draft the next action confidently
- Live test:
  - used `Contact them` from the job page
  - landed in `/crm/inbox?contact=...`
  - thread selection worked
  - system activity for the schedule change was visible
  - attempted to use the compose area
- Result: `watch`
- What worked:
  - deep-linking into the right contact thread works
  - system activity is visible and useful
- Issues:
  - the page is still ambiguous between `Ask Tracey` and `Direct Message`.
  - clicking `Direct Message` did not present a clearly different composer state.
  - typing into the visible composer resulted in a Tracey assistant reply instead of an obvious direct-message send attempt, which is a serious usability problem.

### 5. Core admin setup

- Intended workflow:
  - open settings
  - understand call handling choices
  - understand AI assistant scope and WhatsApp setup
  - know the next action to take without guessing
- Live test:
  - opened `/crm/settings`
  - confirmed call handling descriptions and next-step copy
  - opened `/crm/settings/agent`
  - confirmed WhatsApp assistant copy and assistant number
  - verified `Connect via WhatsApp` points to `https://wa.me/61485010634?text=Hi%20Earlymark`
- Result: `go`
- What worked:
  - phone and call-handling copy is clear
  - the current mode communicates the next step
  - the WhatsApp assistant page clearly states that it is for workspace users and shows the number
- Issues:
  - the advanced shell still feels cramped in live production, and the older assistant-panel pill is still visible until the newer local shell fix is deployed

### 6. Communication history and integration context

- Intended workflow:
  - a customer emails, texts, or calls
  - the CRM shows that communication in the right place
  - outbound follow-up is also visible
  - the owner can understand the customer context from inbox, contact, and job surfaces
- Live test:
  - seeded realistic fake inbound and outbound comms for the same fake contact and job:
    - inbound email
    - outbound email
    - inbound SMS
    - outbound SMS
    - outbound call activity
    - inbound voice call transcript
  - checked inbox, contact detail, and job detail on the live app
- Result: `watch`
- What worked:
  - inbox conversation rendering is generally strong once data exists
  - inbound and outbound email, SMS, and call items sort correctly and are readable
  - contact timeline shows the same communication context in a useful chronological way
- Issues:
  - the inbox `Conversations` vs `System Activity` split is not coherent. `Assigned team member updated` and `Deal updated` showed up in `Conversations`, while `System Activity` only showed `Deal created`.
  - the full job detail page does not surface the communication history at all, even though it is one of the main operational pages for a scheduled job.
  - because the global assistant panel is always present, it is still too easy to confuse the CRM inbox composer with the Tracey assistant composer.

### 7. Billing and payment handoff

- Intended workflow:
  - create an invoice from the job
  - see the billing state update consistently across the job, dashboard, and contacts
  - understand what changed and why
- Live test:
  - created a fake invoice line item on the scheduled fake job
  - invoice was created successfully on the job page
  - dashboard and contacts reflected the billing change
- Result: `watch`
- What worked:
  - invoice creation works on the live job page
  - dashboard moved the job into the payment-related bucket
  - contacts list started showing an outstanding amount
  - issuing the draft invoice also worked live and updated the invoice row to `ISSUED`
  - marking the invoice as paid worked and, after refresh, the job resolved to `Completed` across the main surfaces
- Issues:
  - stage labels are not aligned across surfaces. The full job page says `Awaiting payment`, while the contacts list says `Invoiced`.
  - creating the invoice changed the visible job value on the full job page from the original `$456` to the invoice total `$97.9`, which may be correct internally but is not explained clearly enough to the user.
  - after clicking `Mark Paid`, the current job page remained on the older `Awaiting payment` view until refresh, even though the rest of the CRM had already moved on. That is a stale-view/revalidation problem.

### 8. Stage progression and discovery

- Intended workflow:
  - create a new lead
  - move it through `Quote sent`, `Scheduled`, `Completed`, and `Deleted`
  - see those changes reflected consistently in dashboard, contacts, inbox, job detail, and search
- Live test:
  - created `ZZZ STAGE Contact 1775276658539`
  - created `ZZZ STAGE Job 1775276658539`
  - moved it through:
    - `New request` -> `Quote sent`
    - `Quote sent` -> `Scheduled`
    - `Scheduled` -> `Completed`
    - `Completed` -> `Deleted`
  - verified global search can find the fake contact and deal
  - verified keyboard selection from global search opens the expected record
- Result: `watch`
- What worked:
  - stage changes do persist and update the main pages
  - dashboard counts move between buckets
  - deleted jobs drop off the schedule page
  - search indexing is live and useful
- Issues:
  - the contacts list leaks internal stage naming. After moving the job to `Quote sent`, the contacts page labelled the job `Contacted`.
  - inbox activity leaks internal stage names too. It logged `Stage: CONTACTED -> Scheduled` and later `Stage: WON -> Deleted`, even though the user-facing stages were `Quote sent -> Scheduled` and `Completed -> Deleted`.
  - scheduled date display is inconsistent across surfaces. The job detail showed `Apr 7, 2026 2:15 PM`, the dashboard card showed `Apr 8`, and the schedule page showed `12:15 AM`.
  - the command/search dialog has a real mouse-click bug. Clicking the visible `ZZZ FLOW Job 1775274495188` result was reproducibly intercepted by the search input/dialog layer, while keyboard `ArrowDown + Enter` navigation worked and opened the job correctly.

### 9. Notifications and quick actions

- Intended workflow:
  - open notifications
  - understand what needs follow-up
  - clear notifications if handled
  - use assistant quick actions like `Create quote` and see an obvious result
- Live test:
  - opened the notifications panel on dashboard
  - saw a specific unread item: `Post-job follow-up needed`
  - marked all as read successfully
  - tried the assistant `Create quote` quick action from a live job page
- Result: `watch`
- What worked:
  - notifications are specific and tied to real job context
  - `Mark all read` worked and updated the unread state
- Issues:
  - the `Create quote` quick action did not produce any clear visible result in the live UI during testing.
  - the assistant quick-action area still feels separate enough from the main CRM that it is not always obvious what happened after a click.

### 10. Intake validation and partial lead details

- Intended workflow:
  - create a lead even if you only have one contact method
  - understand clearly which fields are truly required
  - get a useful error if a field format is invalid
- Live test:
  - attempted new-job create with an invalid email
  - created a new lead with email only
  - created a new lead with phone only
- Result: `watch`
- What worked:
  - email-only lead creation worked
  - phone-only lead creation worked
  - the underlying data rule is practical for real-world lead capture
- Issues:
  - the form labels still mark both `EMAIL *` and `PHONE *` as required, even though only one is needed.
  - invalid email handling did not surface a strong user-facing explanation during testing.

### 11. Notes and audit trail visibility

- Intended workflow:
  - save a note on a contact or job
  - see it again later in a way that supports day-to-day CRM use
- Live test:
  - saved a note on the fake `ZZZ FLOW` contact
  - refreshed the contact page
  - checked inbox system activity and the linked job page
- Result: `watch`
- What worked:
  - the app confirmed `Notes saved`
- Issues:
  - the saved note did not become clearly visible on the contact page after refresh.
  - the saved note did not appear on the linked job page.
  - the saved note did not appear in the inbox audit surfaces checked during testing.

### 12. Calendar rescheduling and map planning

- Intended workflow:
  - schedule or reschedule a job from the calendar
  - trust the displayed date and time
  - use the map to plan today vs upcoming work
- Live test:
  - clicked the visible schedule event for `ZZZ FLOW Job 1775274495188`
  - dragged it from April 6 to April 9 on the month grid
  - checked the schedule modal, full job page, contact timeline, and map page
- Result: `watch`
- What worked:
  - dragging the month-view event did reschedule the job
  - the contact timeline logged `Job rescheduled`
  - deleted jobs dropped off the schedule page
  - clicking a schedule event opens a richer deal-details surface than the full deal page, including communication history
- Issues:
  - the time mismatch still survives rescheduling. After the drag, the schedule modal showed `Apr 9, 2026 8:30 PM`, while the full job page showed `Apr 9, 2026 10:30 AM`.
  - the dashboard `New Job` modal allows `Scheduled` stage but does not provide an assignee field, even though the app blocks scheduled creation without an assignee. That makes direct create-into-scheduled impossible from that flow.
  - the map page says upcoming jobs are on the map, but when route mode is enabled with no jobs today it switches to `All Done!` and no longer gives a clear way to inspect those upcoming jobs.

### 13. Contact search, filters, and bulk actions

- Intended workflow:
  - search contacts
  - filter by stage/type
  - select contacts for bulk actions like delete or export
- Live test:
  - searched for `ZZZ FLOW`
  - opened the stage filter menu
  - selected a fake contact row
  - attempted bulk delete
- Result: `watch`
- What worked:
  - contact search narrowed the visible list correctly
  - row selection state appears in the toolbar
  - filtered CSV export worked correctly for a single searched contact
- Issues:
  - search still leaves the footer count wrong. With 1 visible contact, the page still said `Showing 11 of 11 contacts (page 1)`.
  - the stage filter surface is not yet proven as a reliable workflow from the live UI; its interaction model is not very clear.
  - bulk `Delete` looked like a no-op in live testing. It did not open a confirmation dialog, show a result, or remove the selected fake contact.

### 14. Analytics comprehension

- Intended workflow:
  - open analytics
  - understand the top metrics quickly
  - change the date range and trust that the numbers respond meaningfully
- Live test:
  - opened `/crm/analytics`
  - switched from `Last 30 days` to `Last 7 days`
- Result: `watch`
- What worked:
  - the date-range filter does work
  - customer and completed-job counts changed when the range changed
- Issues:
  - the page still contains an unclear metric label: `Status 0`.
  - the page is very thin for a core analytics surface and still feels closer to a KPI stub than a confident reporting page.

### 15. Team management and invite flow

- Intended workflow:
  - open the team page
  - understand who is in the workspace
  - invite a new team member by email or shareable link
- Live test:
  - opened `/crm/team`
  - opened the invite modal
  - generated an invite link without sending email
- Result: `watch`
- What worked:
  - the team page is clean and understandable with a single member
  - `Generate Invite Link` works and creates a pending invite
- Issues:
  - the invite modal reads as though the role is chosen, but in this live flow it appears fixed to `Team Member`.
  - after generating a link with no email entered, the modal says `Invite sent to !`, which is clearly wrong copy.
  - the pending invite row exposes `Open invite link`, but it did not surface as a normal link target during testing, which makes the flow feel less inspectable than it should.
  - clicking `Open invite link` from the pending invite row did not navigate or open a visible target during testing, so that CTA currently feels inert.

### 16. Settings admin flows

- Intended workflow:
  - open billing, privacy, notifications, and help/settings pages
  - use the obvious CTA on each page
  - trust the result and understand what happened
- Live test:
  - opened `/crm/settings/billing`
  - clicked `Manage`
  - opened `/crm/settings/privacy`
  - opened `/crm/settings/data-privacy`
  - clicked `Send test notification`
  - tested the support form on `/crm/settings/help`
- Result: `watch`
- What worked:
  - billing `Manage` did open a real Stripe-hosted billing portal
  - notifications showed a visible `Test notification sent` confirmation
  - the actual nav path for privacy, `/crm/settings/privacy`, is live and readable
- Issues:
  - the legacy URL `/crm/settings/data-privacy` returns `Page Not Found`, so old links or remembered URLs will break even though the current nav item works.
  - the billing portal is clearly branded `Earlymark sandbox`, which may be correct for the current environment but does not feel like a polished production-style handoff.
  - the help/support form has a trust bug: after a filled submit, the page showed both `Failed to send support request. Please try again.` and `Support request sent. We'll get back to you within 24 hours.` at the same time.
  - empty support-form submit did not surface strong inline validation during testing; it just stayed on the page without obvious guidance.

### 17. Integration connection handoff

- Intended workflow:
  - open `/crm/settings/integrations`
  - click a provider connect CTA
  - be handed off to a valid provider auth/configuration flow
- Live test:
  - clicked:
    - `Connect Gmail`
    - `Connect Outlook`
    - `Connect Google Calendar`
    - `Connect Xero`
- Result: `watch`
- What worked:
  - Gmail handoff reached a real Google account chooser
  - Google Calendar handoff reached a real Google account chooser
- Issues:
  - Outlook handoff is misconfigured. The live URL included `client_id=undefined`, which means the connection flow is not correctly configured in this environment.
  - Xero handoff failed immediately with `unauthorized_client` and `Invalid redirect_uri`, which makes the CTA effectively broken.
  - these are not subtle polish issues; they are broken trust points on live connect buttons.

### 18. Modal and card overflow behavior

- Intended workflow:
  - when a large card or modal opens, the page layout should stay sensible
  - if the content is taller than the viewport, the card itself should allow vertical scrolling so bottom actions remain reachable
  - dashboard page scroll should remain reserved for the kanban board, not become the escape hatch for a clipped modal
- Live test:
  - probed common heavy dialogs/cards at `1280x600`, `1280x640`, `1280x720`, `1366x768`, and `1440x900`:
    - dashboard `New Job`
    - team invite modal
    - dashboard/schedule deal details card
    - delete-account confirmation
- Result: `watch`
- What worked:
  - the `New Job` modal uses internal vertical scrolling, and bottom actions become reachable once the modal itself is scrolled.
  - the heavy deal-details card uses an internal scroll region for the lower content/history area.
  - team invite and delete-account fit cleanly without needing scroll down to at least `1280x600`.
- Issues:
  - I have not yet reproduced a confirmed broken no-scroll case in the tested dialogs, but I did confirm that the right product rule is internal card/modal scrolling, not page scrolling.
  - the `New Job` modal can open with its top edge clipped on shorter heights, even though the bottom actions are still reachable via internal scroll. That means the pattern is close, but not perfectly centered.
  - this remains an open investigation because the specific clipped-card case you described has not been cleanly isolated yet.

### 19. Tracey chatbot as an interactive CRM operator

- Intended workflow:
  - user asks Tracey to read CRM information, make safe CRM changes, triage risky leads, and coordinate next steps
  - Tracey should answer with grounded CRM context and execute supported actions without falling into generic refusal loops
- Live test:
  - ran a fresh, dedicated `100`-message stress test in the visible live chat interface using realistic CRM tasks:
    - morning briefing and operational queries
    - stage changes, notes, reminders, quotes, invoices, and safe fake-data creation
    - held-review / Bouncer style lead triage
    - inbox/reply drafting and tradie-style day-start prompts
  - then spot-checked CRM reality after the chat run
- Result: `gap`
- What worked:
  - the chat honored the QA safety instruction not to send outbound SMS/email/calls unless explicitly told to
  - some grounded lookups worked:
    - `Car Start` was identified as rotting/attention-needed
    - completed-job lookup for `ZZZ FLOW` worked in some later prompts
  - at least one real mutation did happen:
    - a new draft invoice `INV-ALEX-000002` was created on [ZZZ FLOW deal](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-verify-flow-deal.png)
- Issues:
  - the chatbot is not reliable enough yet as an interactive CRM operator.
  - the 100-message run produced heavy refusal and fallback behavior:
    - `53` responses were direct refusal/unsupported-style failures
    - `16` responses fell into vague draft-loop language like `Here’s what I got — edit anything before confirming.`
  - basic CRM retrieval is inconsistent. Even exact job/contact names like `ZZZ FLOW Job 1775274495188` often triggered `I can't filter by "ZZZ" jobs` instead of a grounded answer.
  - action coverage is uneven:
    - contact creation failed
    - fake job creation failed
    - notes on contacts generally failed
    - scheduling and reminder creation failed
    - quote creation often failed
    - some invoice work did execute
  - response truthfulness is weak in places:
    - Tracey said it added a note to `ZZZ QA Job`, but the live job page still showed `Notes No notes yet.`
    - Tracey said it could not create several records, and spot-checking confirmed those records did not exist.
  - Bouncer-style reasoning is not implemented coherently yet:
    - risky inbound leads often produced a generic draft-card style response instead of `hold silently for review` behavior
    - evening-brief style summarization for held leads failed with `I do not have enough information`
  - team/tradie operational reasoning is weak:
    - team-member or future-schedule style prompts often failed even when the data existed in CRM
  - the chatbot still behaves too much like a limited tool router instead of a capable CRM copilot

## Priority issues

### High

1. Contacts count and pagination are wrong
   - Repro:
     - open `/crm/contacts`
   - Actual:
     - 4 visible rows
     - footer says `Showing 8 of 8 contacts (page 1)`
     - `Next` is disabled
   - Why it matters:
     - this makes the CRM feel untrustworthy immediately

2. Schedule page time does not match job detail time
   - Repro:
     - schedule a job for `Apr 6, 2026 10:30 AM`
     - compare `/crm/deals/[id]` with `/crm/schedule`
   - Actual:
     - job detail shows `10:30 AM`
     - schedule month view showed `8:30 PM`
   - Why it matters:
     - this is a core operational trust bug

3. Inbox direct-message flow is ambiguous
   - Repro:
     - open a contact thread in `/crm/inbox`
     - click `Direct Message`
     - type into the visible composer
   - Actual:
     - the page does not show a clearly distinct direct-message mode
     - the message went into the Tracey assistant conversation instead
   - Why it matters:
     - users cannot confidently tell whether they are messaging the customer or the assistant

4. Address entry is not trustworthy unless autocomplete is explicit
   - Repro:
     - create a new job with a free-typed address that does not end in an explicit picked suggestion
   - Actual:
     - a Sydney test address was saved as a Nelson Bay address in earlier live testing
   - Why it matters:
     - this can send jobs to the wrong place

5. Inbox `Conversations` and `System Activity` are misclassified
   - Repro:
     - open `/crm/inbox?contact=<id>`
     - compare `Conversations` and `System Activity`
   - Actual:
     - `Assigned team member updated` and `Deal updated` appeared in `Conversations`
     - `System Activity` only showed `Deal created`
   - Why it matters:
     - users cannot trust the inbox tabs to separate customer communications from system changes

6. Billing stage labels are inconsistent across pages
   - Repro:
     - create an invoice from `/crm/deals/[id]`
     - compare the job page and the contacts list
   - Actual:
     - the full job page says `Awaiting payment`
     - the contacts list says `Invoiced`
   - Why it matters:
     - users should not have to guess whether those labels mean the same stage or different stages

7. User-facing stages leak internal CRM names
   - Repro:
     - move a job through `Quote sent`, `Scheduled`, `Completed`, and `Deleted`
     - compare contacts and inbox activity
   - Actual:
     - contacts showed `Contacted` for a `Quote sent` job
     - inbox activity showed `CONTACTED -> Scheduled`
     - later inbox activity showed `WON -> Deleted` after a `Completed -> Deleted` user action
   - Why it matters:
     - users should never need to interpret hidden internal stage keys

8. Scheduled dates shift by page
   - Repro:
     - schedule a job for `April 7, 2026 2:15 PM`
     - compare job detail, dashboard, and schedule
   - Actual:
     - job detail: `Apr 7, 2026 2:15 PM`
     - dashboard card: `Apr 8`
     - schedule page: `12:15 AM`
   - Why it matters:
     - this is an operational trust bug, not just formatting polish

9. Assistant quick actions do not always show a clear outcome
   - Repro:
     - open a live job page
     - click `Create quote` in the assistant quick-action panel
   - Actual:
     - no obvious visible result or workflow change appeared on the page during testing
   - Why it matters:
     - users need immediate feedback if a quick action is meant to help them

10. Intake labels do not match the real validation rule
   - Repro:
     - open `New Job`
     - inspect the client fields
     - create one lead with only email and another with only phone
   - Actual:
     - labels show `EMAIL *` and `PHONE *`
     - helper text says `* Email or phone required`
     - both email-only and phone-only creation worked
   - Why it matters:
     - the UI tells the user a stricter rule than the backend actually enforces

11. Notes can be saved without becoming meaningfully visible
   - Repro:
     - save a note on a contact
     - refresh the contact page
     - check the related inbox and job surfaces
   - Actual:
     - the app confirms the save
     - the note does not become clearly visible where a user would expect it
   - Why it matters:
     - notes are a basic CRM function and should be boringly reliable

12. Dashboard `Scheduled` creation is a dead end
   - Repro:
     - open `New Job`
     - choose `Scheduled`
     - fill date and contact details
   - Actual:
     - the app errors with `Assign a team member when creating a job in Scheduled stage.`
     - the modal does not provide an assignee field there
   - Why it matters:
     - the UI offers a path it does not actually let the user complete

13. Calendar reschedule updates the date but not a trustworthy time
   - Repro:
     - drag a scheduled job from April 6 to April 9 in month view
     - compare schedule modal vs full job page
   - Actual:
     - schedule modal: `Apr 9, 2026 8:30 PM`
     - full job page: `Apr 9, 2026 10:30 AM`
   - Why it matters:
     - this is operationally unsafe

14. Map route mode hides the upcoming-work story
   - Repro:
     - open `/crm/map` when there are no jobs scheduled today but there are future jobs
     - enable route mode
   - Actual:
     - the page changes to `All Done!`
     - the earlier `2 upcoming jobs are on the map too` context disappears
   - Why it matters:
     - the page stops helping the user plan ahead just when route mode should help most

15. Bulk contact delete appears to do nothing
   - Repro:
     - select a fake contact row
     - click `Delete`
   - Actual:
     - no confirmation dialog
     - no visible result
     - the contact remains in the list
   - Why it matters:
     - bulk actions need clear and reliable follow-through

16. Analytics contains at least one unfinished metric label
   - Repro:
     - open `/crm/analytics`
   - Actual:
     - the page shows `Status 0`
   - Why it matters:
     - analytics should not make users guess what a metric means

17. Invite-link flow shows broken success copy
   - Repro:
     - open team invite modal
     - click `Generate Invite Link` without entering an email
   - Actual:
     - the modal says `Invite sent to !`
   - Why it matters:
     - this undermines confidence in an otherwise useful invite path

18. Schedule modal and full deal page disagree on the same booking time
   - Repro:
     - click a scheduled job from the month calendar
     - compare the inline deal details with the full `/crm/deals/[id]` page
   - Actual:
     - schedule modal showed `Apr 9, 2026 8:30 PM`
     - full deal page showed `Apr 9, 2026 10:30 AM`
   - Why it matters:
     - users cannot trust which surface is the source of truth

19. `Mark Paid` leaves the current job page stale until refresh
   - Repro:
     - click `Mark Paid` on a draft invoice
   - Actual:
     - dashboard/contact state moved forward immediately
     - the current job page still showed the older stage until reload
   - Why it matters:
     - users should not need a manual refresh to trust a critical billing action

20. Pending invite `Open invite link` appears inert
   - Repro:
     - generate an invite link
     - click `Open invite link` from the team page
   - Actual:
     - no visible navigation or popup occurred during testing
   - Why it matters:
     - a share-link workflow should be directly inspectable by the user who created it

### Medium

1. Contact create and edit success flows are weak
   - save succeeds, but the user stays on the form with a toast instead of being clearly taken to the result

2. Contact detail page is missing important business context
   - company and address are editable, but not surfaced on the main contact record

3. Advanced dashboard shell still feels cramped in production
   - assistant panel opens in a way that compresses the main CRM canvas
   - the newer split-diamond panel toggle and persisted closed-first behavior are not live yet

4. Production console hygiene is noisy
   - repeated CSP errors for `blob:` workers
   - blocked Google stylesheet loads on the map page
   - deprecated Google Maps and Places APIs are still in use

5. Full job detail is missing communication context
   - the contact page and inbox show email/SMS/call history
   - the full `/crm/deals/[id]` page does not
   - this makes the main job view weaker than it should be for real-day operations

6. Invoice creation changes the visible job value without explanation
   - after the fake invoice was created, the job page value changed from `$456` to `$97.9`
   - this might be the intended final invoice value, but the UI does not explain the shift well enough

7. Search is stronger with keyboard than mouse
  - global search returns the right records
  - keyboard selection worked cleanly
  - direct mouse clicking on a visible result is now a reproducible bug, not just a vague rough edge

8. Notifications are stronger than the assistant quick actions
   - the notification panel gave a clear next step and responded correctly to `Mark all read`
   - the assistant quick-action area was much less explicit about outcomes

9. Intake validation rule is practical, but the copy is not
  - the underlying `email or phone` rule is good
  - the labels still make the workflow feel stricter than it really is

10. Notes currently feel less trustworthy than other activity
  - communication activity is visible
  - saved notes are much harder to find again

11. Schedule interaction is more capable than it first looks, but still not trustworthy
   - dragging in month view does work
   - the resulting time is still inconsistent across surfaces

12. Contact search is stronger than contact filters and bulk actions
  - search narrowed the list correctly
  - filters/bulk delete were much less convincing in live use

13. Analytics responds, but still feels undercooked
   - the range filter works
   - the labels and overall depth still do not feel final

14. Team management is mostly clean, but invite polish is not there yet
  - the link path works
  - the generated copy and role framing need tightening

15. Some richer data appears only in modal surfaces
  - the schedule-click deal details showed comms/history that the full deal page did not
  - that makes the product feel internally inconsistent even when the data exists

16. Export is better than delete in contacts bulk actions
   - filtered CSV export behaved correctly
   - bulk delete was much less trustworthy

17. Deal-details card actions are not fully trustworthy
  - `Contact them` works and lands in the correct inbox thread
  - but the `Edit` action under `Contact details` routed to the deal edit page instead of the contact edit page
  - that makes the card labels harder to trust

17. Support form gives contradictory delivery feedback
   - Repro:
     - open `/crm/settings/help`
     - fill subject and message
     - click `Send support request`
   - Actual:
     - the page showed both a failure message and a success message after the same submit
   - Why it matters:
     - users cannot trust whether their request actually reached support

18. Outlook connect is misconfigured in live settings
   - Repro:
     - open `/crm/settings/integrations`
     - click `Connect Outlook`
   - Actual:
     - the live OAuth URL contains `client_id=undefined`
   - Why it matters:
     - the connect button is effectively broken and looks unfinished

19. Xero connect is broken in live settings
   - Repro:
     - open `/crm/settings/integrations`
     - click `Connect Xero`
   - Actual:
     - Xero immediately responds with `unauthorized_client` and `Invalid redirect_uri`
   - Why it matters:
     - this is a hard failure on a live integration CTA

20. Old privacy URL is dead
  - Repro:
     - open `/crm/settings/data-privacy`
   - Actual:
     - the page returns `Page Not Found`
   - Why it matters:
     - old links, docs, or user memory can still land on a dead route even though `/crm/settings/privacy` works

21. Deal-details card has a mislabeled edit path
   - Repro:
     - open the `ZZZ FLOW` deal-details card from the dashboard
     - click the first `Edit` under `Contact details`
   - Actual:
     - the app routes to `/crm/deals/[id]/edit`, the deal edit screen
   - Why it matters:
     - the UI promises contact editing but sends the user to job editing instead

22. Tracey cannot reliably operate on named CRM records
   - Repro:
     - ask Tracey exact questions about `ZZZ FLOW Job 1775274495188` or `ZZZ FLOW Contact 1775274495188`
   - Actual:
     - many responses fall back to `I can't filter by "ZZZ" jobs/contacts` even when the exact record name is provided
   - Why it matters:
     - this undermines the core promise that Tracey makes the CRM interactive

23. Tracey mutation reliability is inconsistent
   - Repro:
     - ask Tracey to create contacts/jobs, add notes, move stages, create reminders, and prepare invoices
   - Actual:
     - contact and job creation failed
     - stage changes often failed
     - note creation often failed or claimed success without visible CRM change
     - one invoice draft was actually created on `ZZZ FLOW`
   - Why it matters:
     - users cannot trust whether Tracey actually changed CRM state

24. Tracey does not handle Bouncer review logic yet
   - Repro:
     - give Tracey risky inbound leads and instruct it not to reply, but to hold for review/evening brief
   - Actual:
     - it often produced generic draft-card style responses or claimed insufficient information
     - it did not behave like a silent review queue operator
   - Why it matters:
     - this is one of the main promised AI workflow behaviors

## Evidence

- [workflow-contacts-count-mismatch.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contacts-count-mismatch.png)
- [workflow-deal-detail-scheduled-1030am.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-deal-detail-scheduled-1030am.png)
- [workflow-schedule-shows-830pm.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-schedule-shows-830pm.png)
- [workflow-mocked-comms-inbox.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-mocked-comms-inbox.png)
- [workflow-mocked-comms-inbox-system-activity.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-mocked-comms-inbox-system-activity.png)
- [workflow-mocked-comms-contact.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-mocked-comms-contact.png)
- [workflow-mocked-comms-deal.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-mocked-comms-deal.png)
- [workflow-invoice-created.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-invoice-created.png)
- [workflow-dashboard-after-invoice.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-dashboard-after-invoice.png)
- [workflow-stage-quote-job.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-quote-job.png)
- [workflow-stage-quote-dashboard.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-quote-dashboard.png)
- [workflow-stage-quote-contacts.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-quote-contacts.png)
- [workflow-stage-scheduled-job.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-scheduled-job.png)
- [workflow-stage-scheduled-dashboard.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-scheduled-dashboard.png)
- [workflow-stage-scheduled-contacts.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-scheduled-contacts.png)
- [workflow-stage-scheduled-inbox.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-scheduled-inbox.png)
- [workflow-stage-scheduled-schedule.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-scheduled-schedule.png)
- [workflow-stage-completed-job.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-completed-job.png)
- [workflow-stage-completed-dashboard.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-completed-dashboard.png)
- [workflow-stage-completed-contacts.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-completed-contacts.png)
- [workflow-stage-completed-inbox.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-completed-inbox.png)
- [workflow-stage-deleted-job.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-deleted-job.png)
- [workflow-stage-deleted-dashboard.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-deleted-dashboard.png)
- [workflow-stage-deleted-contacts.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-deleted-contacts.png)
- [workflow-stage-deleted-inbox.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-stage-deleted-inbox.png)
- [workflow-global-search-stage.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-global-search-stage.png)
- [workflow-global-search-keyboard-nav.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-global-search-keyboard-nav.png)
- [workflow-global-search-click-failure.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-global-search-click-failure.png)
- [workflow-global-search-keyboard-success.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-global-search-keyboard-success.png)
- [workflow-notifications-panel.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-notifications-panel.png)
- [workflow-notifications-mark-read.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-notifications-mark-read.png)
- [workflow-create-quote-action.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-create-quote-action.png)
- [workflow-new-job-invalid-email.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-new-job-invalid-email.png)
- [workflow-new-job-blank-email.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-new-job-blank-email.png)
- [workflow-new-job-phone-only.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-new-job-phone-only.png)
- [workflow-contact-note-added.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contact-note-added.png)
- [workflow-inbox-after-contact-note.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-inbox-after-contact-note.png)
- [workflow-deal-after-contact-note.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-deal-after-contact-note.png)
- [workflow-contact-note-after-refresh-bottom.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contact-note-after-refresh-bottom.png)
- [workflow-schedule-event-click.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-schedule-event-click.png)
- [workflow-schedule-drag-reschedule-attempt.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-schedule-drag-reschedule-attempt.png)
- [workflow-map-route-mode.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-map-route-mode.png)
- [workflow-contacts-search-proper.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contacts-search-proper.png)
- [workflow-contacts-stage-filter-menu.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contacts-stage-filter-menu.png)
- [workflow-contacts-stage-filter-deleted.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contacts-stage-filter-deleted.png)
- [workflow-contacts-bulk-delete.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contacts-bulk-delete.png)
- [workflow-analytics-overview.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-analytics-overview.png)
- [workflow-analytics-range-menu.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-analytics-range-menu.png)
- [workflow-analytics-range-change.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-analytics-range-change.png)
- [workflow-team-page.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-team-page.png)
- [workflow-team-invite-modal.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-team-invite-modal.png)
- [workflow-team-generate-link.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-team-generate-link.png)
- [workflow-team-open-invite-link-source.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-team-open-invite-link-source.png)
- [workflow-invoice-issue-action.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-invoice-issue-action.png)
- [workflow-invoice-edit-action.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-invoice-edit-action.png)
- [workflow-contacts-export-csv.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contacts-export-csv.png)
- [contacts-export.csv](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/contacts-export.csv)
- [contacts-export-filtered.csv](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/contacts-export-filtered.csv)
- [workflow-contacts-export-filtered.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contacts-export-filtered.png)
- [workflow-team-open-invite-link-result.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-team-open-invite-link-result.png)
- [workflow-invoice-mark-paid.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-invoice-mark-paid.png)
- [workflow-dashboard-after-mark-paid.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-dashboard-after-mark-paid.png)
- [workflow-contact-after-mark-paid.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-contact-after-mark-paid.png)
- [workflow-settings-billing.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-billing.png)
- [workflow-settings-billing-manage.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-billing-manage.png)
- [workflow-settings-data-privacy.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-data-privacy.png)
- [workflow-settings-data-privacy-legacy.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-data-privacy-legacy.png)
- [workflow-settings-notifications-test.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-notifications-test.png)
- [workflow-settings-notifications-after-click.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-notifications-after-click.png)
- [workflow-settings-help-send-support-empty.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-help-send-support-empty.png)
- [workflow-settings-help-support-form-result.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-help-support-form-result.png)
- [workflow-settings-account-delete-debug.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-settings-account-delete-debug.png)
- [workflow-automations-new-rule.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-automations-new-rule.png)
- [workflow-automations-create-rule-result.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-automations-create-rule-result.png)
- [workflow-overflow-dashboard-new-job-600.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-overflow-dashboard-new-job-600.png)
- [workflow-overflow-team-invite-600.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-overflow-team-invite-600.png)
- [workflow-overflow-schedule-event-600.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-overflow-schedule-event-600.png)
- [workflow-overflow-delete-account-600.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-overflow-delete-account-600.png)
- [workflow-dashboard-card-open-600.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-dashboard-card-open-600.png)
- [workflow-detail-card-contact-them.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-detail-card-contact-them.png)
- [workflow-detail-card-edit-contact.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-detail-card-edit-contact.png)
- [workflow-detail-card-edit-job.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflow-detail-card-edit-job.png)
- [overflow-thresholds.json](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/overflow-thresholds.json)
- [modal-scroll-probe.json](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/modal-scroll-probe.json)
- [chatbot-stress-100-results.json](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-stress-100-results.json)
- [chatbot-stress-100-batch1.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-stress-100-batch1.png)
- [chatbot-probe.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-probe.png)
- [chatbot-verify-contact38.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-verify-contact38.png)
- [chatbot-verify-flow-deal.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-verify-flow-deal.png)
- [chatbot-verify-wf-deal.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-verify-wf-deal.png)
- [chatbot-verify-qa-deal.png](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/chatbot-verify-qa-deal.png)
- [workflows.json](/C:/Users/micha/Projects/Assistantbot/test-results/live-workflows/workflows.json)

## Current verdict

The live CRM is usable, but it is not yet at the standard of "everything works, makes sense, and looks complete."

The biggest workflow problems right now are:

1. trust mismatches between what the UI says and what the data actually shows
2. a direct-message inbox flow that is too easy to misunderstand
3. weak follow-through after successful create or edit actions
4. Tracey is not yet reliable enough as an interactive CRM copilot

The next best move is to fix the high-severity trust issues first, then rerun this exact workflow matrix on the live product.
