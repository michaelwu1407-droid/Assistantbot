# Earlymark Feature Verification

This file exists to keep product truth tighter than "the code looks right."

The live source of truth is the internal admin ops page:

- `/admin/customer-usage?tab=ops#feature-promises`

That view tracks each important promise across four proof layers:

1. `Behavior`
   The logic exists and is covered by code or tests.
2. `Delivery`
   The output reaches the destination it is meant to reach.
3. `Observability`
   Ops can see the last success, last failure, and where it went.
4. `Live proof`
   A real or synthetic event has recently proved the promise works end to end.

## Status meanings

- `verified`
  All four proof layers exist.
- `watch`
  The feature looks real, but one or more proof layers are still partial.
- `gap`
  A critical proof layer is missing, so the promise is still easy to overstate.

## Current rule

No feature promise should be described as fully proven unless it is `verified` on the ops verification table.

If a feature is implemented but still `watch` or `gap`, the UI and marketing copy should describe it honestly as:

- beta
- internal
- partially verified

not as "done" or "fully working everywhere."

## Current priorities

The highest-value reinforcements right now are:

1. Add feature-specific synthetic checks for the WhatsApp assistant, multilingual voice, booking confirmations, and the public job portal.
2. Record explicit delivery events for chatbot feedback emails and booking confirmations.
3. Audit portal opens and WhatsApp round trips so ops can answer "when did this last work in production?"
