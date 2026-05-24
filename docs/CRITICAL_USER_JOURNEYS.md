# Critical User Journeys — Product-Level Acceptance

> This file is the **product-level acceptance contract** for the
> highest-impact tradie + customer journeys. It captures the *intent*
> of each journey (what "good" looks like from the user's perspective),
> not the row-by-row test status. For row-by-row state and proof, see
> `USE_CASE_TEST_MATRIX.md`.

## How this file relates to the rest of the doc set

| File | What lives here | What lives there |
|------|------------------|------------------|
| **`CRITICAL_USER_JOURNEYS.md`** (this) | Product acceptance criteria for the top journeys. Prose, not tables. The "what does it mean for this journey to be ready?" | — |
| `USE_CASE_TEST_MATRIX.md` | Every surface, every 8-gate row, current state. The "is row X green today?" | — |
| `JOURNEY_ACCEPTANCE.md` | The 8-check journey gate definition (D · A · C · O · 🧠 · ↪ · 🛡 · 📋) | — |
| `FEATURE_VERIFICATION.md` | The 4-layer proof model (Behavior · Delivery · Observability · Live-proof) | — |
| `CLAUDE.md` | Cross-cutting product + design policies (tradie cognitive load, Tracey-number identity, design tokens, mobile rules) | — |

This file used to also track "current validation" status per journey.
That was redundant with the matrix and is removed. Status now lives in
the matrix; pull it from there.

## Validation standard (applies to every journey below)

For each journey we validate, in priority order:

1. **Entry** — the user understands what this feature does *before*
   acting.
2. **Execution** — the interaction feels coherent while in progress
   (reassuring loading copy, no dead spinners, no unexplained delays).
3. **Outcome** — the success state matches what actually happened. We
   never let the UI lie about whether something was sent / placed /
   saved.
4. **Recovery** — if something fails, the next step is clear and
   reassuring. The user is never left wondering whether to resubmit.

Each journey's row in `USE_CASE_TEST_MATRIX.md` cross-checks the same
criteria against the 8 journey-acceptance gates.

## Priority 1 journeys

### 1. Homepage "Interview Tracey" callback flow

**Why it matters.** This is a top-of-funnel trust flow. If the promise
is unclear or the result is ambiguous, users lose confidence fast and
never sign up.

**Acceptance criteria.**

- The form clearly communicates that Tracey will call within seconds.
- Validation errors are field-specific and human-readable (not generic
  "Invalid input").
- During submit, the CTA reflects in-progress state.
- On success, the page clearly says a call is happening now.
- On timeout or callback failure, the user is told their details were
  still captured.
- The recovery path does not make the user wonder whether they need to
  resubmit.

Matrix rows: `acq-01`, `acq-02`.

### 2. Public contact / sales enquiry flow

**Why it matters.** This is the fallback acquisition path when users
want a human or sales reply. A mismatch between actual callback
behaviour and success copy is a trust problem.

**Acceptance criteria.**

- The page makes clear whether the user is sending a message, getting
  a callback, or both.
- If a phone number is present and a callback is initiated, the
  success state says so.
- If only email/support handling occurs, the success state says that
  instead.
- Department selection feels meaningful and not decorative — every
  option must actually route somewhere different.
- Failures preserve user confidence and give a next step.

Matrix rows: `acq-05`, `acq-06`, `acq-07`, `acq-08`, `acq-09`,
`logic-13`.

### 3. Sign in → billing → setup → ready workspace

**Why it matters.** This is the revenue path and the most fragile
multi-step journey.

**Acceptance criteria.**

- Redirect logic never strands the user or loops them.
- Users understand why they are on billing, setup, or dashboard.
- Billing success does not feel like a silent redirect with no
  confirmation.
- Provisioning outcomes are understandable:
  - success — user knows Tracey is live
  - partial success — user knows what still needs attention
  - failure — user knows exactly what to do next, including a clear
    retry path
- Resuming the flow after the user closes the browser lands them on
  the right step with reassuring "welcome back" copy.

Matrix rows: `onb-03` through `onb-17`, `auth-meta`.

### 4. Missed call → Tracey handles it → CRM reflects it

**Why it matters.** This is the core value proposition, not a support
feature. The tradie's confidence in the product is set here.

**Acceptance criteria.**

- Calls handled by Tracey result in clear CRM visibility (contact,
  transcript, deal where applicable).
- Urgent escalations produce obvious follow-up tasks.
- Non-urgent calls do not create noisy or confusing artifacts.
- Users can understand what happened without reading logs or raw
  transcripts.
- The operator handoff from contacts list → contact detail → deal
  detail → inbox timeline is continuous and never loses context.

Matrix rows: `voice-01..03`, `lead-04`, `crm-08..10`, `crm-23`,
`crm-27..28`.

### 5. New lead → contact → deal → schedule / follow-up

**Why it matters.** This is the main day-to-day operations flow. If
this feels rigid or noisy, the product loses its trust on day one.

**Acceptance criteria.**

- Lead capture creates the right CRM objects without duplication
  confusion.
- Deal stage transitions feel predictable.
- Follow-ups and reminders appear like helpful automation, not random
  system noise.
- Users can always tell what the system did automatically vs. what
  they need to do themselves.
- Recovery paths are clear when contact data is partial (email-only,
  phone-only, no phone on a deal page).
- Repeat follow-up work on the same deal preserves the prior reminder
  context, not silent overwrites.

Matrix rows: `lead-01..14`, `crm-08..16`, `crm-21..22`, `comm-01..09`,
`crm-19..20` (currently 🔴 — kanban drag broken).

## Where this file used to track findings

Historical "Finding 1..5" entries (pricing flow callback copy,
contact-flow intent before submit, billing success UI, onboarding
completion failure guidance, day-to-day CRM follow-up coverage) all
resolved and now live as ✅ rows in the matrix:

- Finding 1 → `acq-05`, `acq-06`
- Finding 2 → `acq-05` entry-time copy
- Finding 3 → `onb-05`
- Finding 4 → `onb-09..11`
- Finding 5 → `crm-08`, `comm-04..08`

If you want to see the original prose for these findings, the file at
this version in git history (commit before 2026-05-24) has them in
full. We do not re-narrate them here.
