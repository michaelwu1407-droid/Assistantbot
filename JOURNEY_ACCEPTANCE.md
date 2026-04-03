# Earlymark Journey Acceptance

This file is the practical counterpart to `FEATURE_VERIFICATION.md`.

`FEATURE_VERIFICATION.md` answers:

- does the promised behavior exist?
- does it reach the right destination?
- can ops prove it happened?

This file answers the user-side question:

- can the intended person actually find it?
- can they access it?
- can they complete the task?
- does the result make sense?
- is anything important still missing?

## Release gate

A journey is not truly ready until it passes all of these checks:

1. `Discoverability`
   The intended user can find the entry point without insider knowledge.
2. `Access`
   Permissions, auth, numbers, links, and configuration are correct.
3. `Completion`
   The user can finish the task without hidden prerequisites or manual rescue.
4. `Outcome`
   The result lands where it should and is visible to the right party.
5. `Coherence`
   The flow makes logical sense from the user's perspective and does not mislead them.
6. `Follow-through`
   The user does not immediately need another missing feature or manual support step.
7. `Failure handling`
   If it breaks, the user gets a sensible response and the team can see the failure.
8. `Proof`
   There is test coverage plus either live evidence or a synthetic check.

If any of the eight checks are weak, the journey is still `watch` or `gap`, even if the underlying code is correct.

## Current priority journeys

### 1. Admin/tradie -> message Earlymark on WhatsApp

- Intended result:
  A workspace user messages the Earlymark WhatsApp number and gets useful CRM help back in WhatsApp.
- Must prove:
  - the number is shown in-product
  - the phone-auth rule is understandable
  - the user's saved personal mobile is enough to gain access
  - fallback replies are sensible if the agent errors
  - the round-trip is logged and monitorable
- Current known gaps:
  - no WhatsApp-specific delivery proof surface
  - no synthetic full round-trip check

### 2. Admin/tradie -> give feedback in chatbot

- Intended result:
  Feedback becomes a real support/product signal and reaches the team inbox.
- Must prove:
  - obvious feedback language is recognized
  - the chatbot acknowledges it appropriately
  - a support ticket is created
  - the support inbox receives the email
  - support can trace ticket to sender and workspace
- Current known gaps:
  - no dedicated ops row for chatbot-feedback delivery
  - no synthetic end-to-end feedback submission

### 3. End customer -> receive booking confirmation when job is scheduled

- Intended result:
  When a deal enters `Scheduled`, the customer automatically gets the confirmation.
- Must prove:
  - both schedule-entry paths fire it
  - customer-facing content is coherent
  - send outcome is logged
  - failures are visible to ops
- Current known gaps:
  - no dedicated last-success/last-failure monitor for scheduled confirmations

### 4. End customer -> open public job portal

- Intended result:
  A customer opens the portal link and sees the correct status for their own job.
- Must prove:
  - the link is included where expected
  - the page loads from the token
  - the status shown matches real deal state
  - refresh timing is sensible
  - the business contact action is obvious
- Current known gaps:
  - no portal-open audit trail
  - no end-to-end smoke test for token -> render -> status update

### 5. End customer -> speak another language on a Tracey call

- Intended result:
  Tracey continues the call in the caller's language naturally enough to finish the task.
- Must prove:
  - the runtime detects language reliably
  - the spoken reply follows the caller language
  - the flow still books/qualifies correctly
  - non-English failures are observable
- Current known gaps:
  - no multilingual-specific synthetic canary
  - onboarding toggle still behaves like preference capture rather than a strict runtime switch

## Working rule

For each feature we care about, we should keep both of these in sync:

- feature proof: `FEATURE_VERIFICATION.md`
- user journey proof: this file

That gives us two independent questions:

1. Did the system do the right thing?
2. Could the intended person actually use it successfully?

Only when both answers are solid should we treat the feature as fully ready.
