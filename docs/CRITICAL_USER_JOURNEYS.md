# Critical User Journeys

This document tracks the highest-impact user journeys we need to validate for
product logic, interpretation, and UX quality, not just technical correctness.

## Validation standard

For each journey we validate:

1. Entry: the user understands what this feature does before acting.
2. Execution: the interaction feels coherent while in progress.
3. Outcome: the success state matches what actually happened.
4. Recovery: if something fails, the next step is clear and reassuring.

## Priority 1 journeys

### 1. Homepage "Interview Tracey" callback flow

Why it matters:
- This is a top-of-funnel trust flow.
- If the promise is unclear or the result is ambiguous, users lose confidence fast.

Acceptance criteria:
- The form clearly communicates that Tracey will call within seconds.
- Validation errors are field-specific and human-readable.
- During submit, the CTA reflects in-progress state.
- On success, the page clearly says a call is happening now.
- On timeout or callback failure, the user is told their details were still captured.
- The recovery path does not make the user wonder whether they need to resubmit.

Current validation:
- Browser coverage now asserts the pre-submit promise and key form affordances.
- Success and timeout messaging still deserve deeper journey coverage in a dedicated follow-up pass.

### 2. Public contact / sales enquiry flow

Why it matters:
- This is the fallback acquisition path when users want a human or sales reply.
- A mismatch between actual callback behavior and success copy is a trust problem.

Acceptance criteria:
- The page makes clear whether the user is sending a message, getting a callback, or both.
- If a phone number is present and a callback is initiated, the success state says so.
- If only email/support handling occurs, the success state says that instead.
- Department selection feels meaningful and not decorative.
- Failures preserve user confidence and give a next step.

Current validation:
- Contact and pricing pages now both reflect `callPlaced`.
- Browser coverage now exists for callback, non-callback, and friendly-error states.

### 3. Sign in -> billing -> setup -> ready workspace

Why it matters:
- This is the revenue path and the most fragile multi-step journey.

Acceptance criteria:
- Redirect logic never strands the user or loops them.
- Users understand why they are on billing, setup, or dashboard.
- Billing success does not feel like a silent redirect with no confirmation.
- Provisioning outcomes are understandable:
  - success: user knows Tracey is live
  - partial success: user knows what still needs attention
  - failure: user knows exactly what to do next

Current validation:
- Good technical coverage on redirects and provisioning APIs.
- Billing success now has dedicated UI/state coverage instead of a silent handoff.
- Onboarding completion now has direct UX coverage for:
  - dedicated number provisioned successfully
  - dedicated number not requested in billing
  - number provisioning failure with clear retry guidance
- Full browser validation of the authenticated post-payment path is still outstanding.

### 4. Missed call -> Tracey handles it -> CRM reflects it

Why it matters:
- This is a core value proposition, not a support feature.

Acceptance criteria:
- Calls handled by Tracey result in clear CRM visibility.
- Urgent escalations produce obvious follow-up tasks.
- Non-urgent calls do not create noisy or confusing artifacts.
- Users can understand what happened without reading logs or raw transcripts.

Current validation:
- Strong backend route coverage.
- Inbox and recent-call UI now have direct user-facing coverage.
- Browser coverage now validates the authenticated handoff from:
  - contacts list
  - contact detail
  - deal detail
  - inbox timeline
- Deeper browser coverage for follow-up actions inside authenticated CRM views is still outstanding.

### 5. New lead -> contact -> deal -> schedule / follow-up

Why it matters:
- This is the main day-to-day operations flow.

Acceptance criteria:
- Lead capture creates the right CRM objects without duplication confusion.
- Deal stage transitions feel predictable.
- Follow-ups and reminders appear like helpful automation, not random system noise.
- Users can always tell what the system did automatically.

Current validation:
- Strong action and route coverage.
- Contacts list now has direct UX coverage for:
  - current lead/job title visibility
  - visible stage and balance context
  - quick call, text, and email next actions
- Follow-up modal now has direct UX coverage for:
  - immediate SMS follow-up using a guided template
  - scheduled phone reminder when the user wants to call later
  - recovery guidance when phone or email details are missing
- Browser coverage now validates:
  - the page-to-page operator handoff from lead row to contact detail to deal detail to inbox timeline
  - the authenticated dashboard path from Chat mode into Advanced mode, opening a real deal card, and scheduling a follow-up reminder inside the deal modal
  - repeat follow-up work on the same deal by clearing an existing reminder before scheduling a new one
  - the inbox communication composer clearly distinguishes Direct SMS from Ask Tracey, preserves drafts when switching modes, and keeps the operator oriented about what sends immediately versus what the AI decides
  - recovery paths when contact data is partial:
    - email-only contacts default the inbox to Ask Tracey, explain why direct SMS is unavailable, and point to Add phone in CRM
    - phone-only contacts keep Direct SMS usable while surfacing that email follow-up is unavailable and pointing to Add email in CRM
    - deal pages without a phone number give a clear Add phone in CRM recovery path instead of leaving call/text actions ambiguous

## Current product-level findings

### Finding 1: Pricing enquiry flow hid callback behavior

Severity: resolved

Files:
- [pricing page](C:/Users/micha/Projects/Assistantbot/app/pricing/page.tsx)
- [contact route](C:/Users/micha/Projects/Assistantbot/app/api/contact/route.ts)

Issue:
- The pricing page posts to `/api/contact`.
- `/api/contact` can initiate a Tracey callback when `phone` is provided.
- Unlike the dedicated contact page, the pricing page ignored `callPlaced` and always showed a generic "message sent" state.

User impact:
- A user could receive an immediate call without the UI telling them to expect it.
- That weakens trust and makes the product feel inconsistent.

Resolution:
- Pricing now uses the same success-state branching as the contact page.
- Browser coverage now asserts both callback and message-only outcomes.

### Finding 2: Contact flow intent was not explicit before submission

Severity: resolved

Files:
- [contact page](C:/Users/micha/Projects/Assistantbot/app/contact/page.tsx)
- [pricing page](C:/Users/micha/Projects/Assistantbot/app/pricing/page.tsx)

Issue:
- The callback behavior was only revealed after success.
- A user could reasonably think they were only sending a message.

User impact:
- The callback could feel surprising rather than helpful.

Resolution:
- Both contact and pricing pages now explain the callback option before submit.
  - "Add your phone if you want Tracey to call you back immediately."

### Finding 3: Billing success was technically correct but UX-light

Severity: resolved

File:
- [billing success page](C:/Users/micha/Projects/Assistantbot/app/billing/success/page.tsx)

Issue:
- The route verified Stripe, updated the workspace, ran provisioning, and immediately redirected.
- There was no explicit success UI for the user on that page.

User impact:
- The user could feel bounced around rather than reassured.
- Provisioning outcomes were not surfaced in a clear, dedicated success moment.

Resolution:
- `/billing/success` now renders an explicit success/provisioning transition before routing to `/auth/next`.
- The transition has direct tests for:
  - paid vs unpaid session handling
  - provisioned vs no-number-requested copy
  - auto-redirect and manual continue

### Finding 4: Onboarding completion needed clearer failure guidance

Severity: resolved

File:
- [Tracey onboarding](C:/Users/micha/Projects/Assistantbot/components/onboarding/tracey-onboarding.tsx)

Issue:
- The final onboarding step handled provisioning states technically, but the primary CTA became too vague when number setup failed.
- Users could reach a finish step where the system knew what was wrong, but the button language still felt like a generic waiting state.

User impact:
- A user could be unsure whether they should wait, retry, or contact support.
- "No number requested" and "number setup failed" are very different outcomes and need different guidance.

Resolution:
- The activation button now explicitly tells the user to fix number setup when provisioning fails.
- The finish-step journey is now tested for:
  - no-number-requested onboarding completion
  - failed provisioning with retry guidance

### Finding 5: The day-to-day CRM follow-up path needed stronger operator-level validation

Severity: improved

Files:
- [contacts client](C:/Users/micha/Projects/Assistantbot/components/crm/contacts-client.tsx)
- [stale deal follow-up modal](C:/Users/micha/Projects/Assistantbot/components/crm/stale-deal-follow-up-modal.tsx)

Issue:
- We had good backend confidence that leads became contacts and deals, but weaker proof that an operator could scan the CRM and know what to do next.
- The most common path is not "create a record"; it is "understand the row in front of me, then follow up confidently."

User impact:
- If the row does not surface job, stage, and balance clearly, follow-up work becomes slower and more error-prone.
- If the follow-up modal does not clearly support "send now" versus "remind me to call later," the workflow feels rigid.

Resolution:
- Contacts list coverage now asserts that job title, stage, balance, and quick action links are visible together.
- Follow-up modal coverage now asserts both:
  - send-now SMS flow via template
  - schedule-later phone reminder flow
- Browser coverage now asserts that a seeded lead can be followed from the contacts list through the contact page, the deal page, and into the inbox timeline without losing context.

## Next automation targets

1. Browser tests for the authenticated post-payment setup path
2. Browser tests for follow-up execution from inside authenticated CRM surfaces
3. Browser tests for CRM visibility after call handling and automation
4. Manual mobile walkthroughs for acquisition, onboarding completion, and core CRM follow-up flows
