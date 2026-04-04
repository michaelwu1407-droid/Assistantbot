# Agent Handoff - 2026-04-05

This is the authoritative resume point for the next AI agent.

## Start Here

1. Open this file first.
2. Then read [docs/agent_change_log.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_change_log.md).
3. Work from the repo root: [C:\Users\micha\Projects\Assistantbot](/C:/Users/micha/Projects/Assistantbot).

## Required Read Order

The next agent should read these files in this order before making assumptions:

1. [docs/agent_handoff_2026-04-05.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_handoff_2026-04-05.md)
- This file is the current source of truth for resume context.

2. [docs/agent_change_log.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_change_log.md)
- Read the newest entries first.
- This gives the implementation timeline and avoids repeating recently finished work.

3. [LIVE_CRM_WORKFLOW_AUDIT.md](/C:/Users/micha/Projects/Assistantbot/LIVE_CRM_WORKFLOW_AUDIT.md)
- Treat this as a live issue list and evidence trail, not perfect truth.
- Some items may already be resolved; verify before acting.

4. [app/api/chat/route.ts](/C:/Users/micha/Projects/Assistantbot/app/api/chat/route.ts)
- This is the core Tracey chat entrypoint and still the most important file for chatbot orchestration behavior.

5. [actions/chat-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/chat-actions.ts)
- This contains the main CRM-facing chat actions and aggregate/query helpers used by Tracey.

6. [lib/ai/pre-classifier.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/pre-classifier.ts)
- This is the intent classifier/hint layer feeding the LLM path.

7. [lib/ai/tools.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/tools.ts)
- This is the tool registry for model-driven CRM operations.

8. [lib/ai/prompt-contract.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/prompt-contract.ts)
- This shapes the system prompt and is critical for keeping Tracey LLM-first while still steering behavior.

9. [lib/ai/triage.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/triage.ts)
- This now reflects the hold-for-review Bouncer policy and should not drift back toward hard auto-decline without an explicit product decision.

10. [lib/digest.ts](/C:/Users/micha/Projects/Assistantbot/lib/digest.ts)
- This is where held-review leads now surface into the evening digest.

11. [components/chatbot/chat-interface.tsx](/C:/Users/micha/Projects/Assistantbot/components/chatbot/chat-interface.tsx)
- This is the main chat UI and includes the assistant-side digest/review presentation.

12. [actions/deal-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/deal-actions.ts)
- High-impact CRM mutations, stage transitions, scheduling/rescheduling, and related messaging hooks live here.

13. [actions/tradie-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/tradie-actions.ts)
- Billing/invoice mutations and route-related tradie actions live here.

14. [components/ui/address-autocomplete.tsx](/C:/Users/micha/Projects/Assistantbot/components/ui/address-autocomplete.tsx)
- Read this before changing address behavior. The silent-autoselect trust issue was intentionally removed.

15. [components/modals/new-deal-modal.tsx](/C:/Users/micha/Projects/Assistantbot/components/modals/new-deal-modal.tsx)
16. [components/modals/new-deal-modal-standalone.tsx](/C:/Users/micha/Projects/Assistantbot/components/modals/new-deal-modal-standalone.tsx)
- These are the main job creation flows affected by the address-trust and validation changes.

17. [app/crm/settings/layout.tsx](/C:/Users/micha/Projects/Assistantbot/app/crm/settings/layout.tsx)
- This contains the settings-page scroll fix. Do not accidentally reintroduce clipped inner-scroll layouts.

18. [lib/deal-utils.ts](/C:/Users/micha/Projects/Assistantbot/lib/deal-utils.ts)
- Shared stage labels and CRM-stage display helpers live here. Reuse this instead of hardcoding user-facing stage text.

## Current Branch / Status

- Branch: `main`
- This handoff was prepared after a clean targeted test pass and is intended to be the resume point after the latest push.

## What Was Just Finished

1. CRM stage-language cleanup
- Shared user-facing stage labels now cover legacy/internal stage names.
- `CONTACTED` is shown as `Quote sent`.
- `NEGOTIATION` is shown as `Scheduled`.
- `PIPELINE` is shown as `Quote sent`.
- `INVOICED` / `ready_to_invoice` is shown as `Awaiting payment`.

2. Settings-page clipping fix
- [layout.tsx](/C:/Users/micha/Projects/Assistantbot/app/crm/settings/layout.tsx) now uses page-level scrolling instead of trapping settings cards in a clipped inner scroll region.

3. Invoice mutation refresh fix
- Invoice actions in [tradie-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/tradie-actions.ts) now revalidate the main CRM invoice/deal surfaces so state changes like `Mark Paid` are less likely to leave stale UI behind.

4. Address trust fix in job creation
- [address-autocomplete.tsx](/C:/Users/micha/Projects/Assistantbot/components/ui/address-autocomplete.tsx) no longer silently rewrites typed addresses.
- Typed addresses are saved exactly as written unless the user explicitly selects a suggestion.
- Stale coordinates are cleared when a previously selected address is manually edited.

5. Bouncer / triage policy change
- Risky leads are no longer hard-declined.
- They now flow into `HOLD_REVIEW`, create a visible review note/activity, surface in the evening digest, and show a `Needs review` banner on deal cards.
- This matches the current intended product behavior: lean toward review, not automatic rejection.

6. Chat wording alignment
- Tracey remains LLM-first for normal CRM interaction.
- Aggregate CRM replies now use user-facing language such as `Awaiting payment` instead of internal stage terms.

## Key Files By Concern

### Chatbot / Tracey

- [app/api/chat/route.ts](/C:/Users/micha/Projects/Assistantbot/app/api/chat/route.ts)
- [actions/chat-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/chat-actions.ts)
- [lib/ai/pre-classifier.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/pre-classifier.ts)
- [lib/ai/tools.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/tools.ts)
- [lib/ai/prompt-contract.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/prompt-contract.ts)

What to know:
- Chat is intentionally LLM-first.
- Deterministic direct responses exist only for narrow cases.
- The main quality goal is better CRM understanding and execution without degrading natural-language flexibility.

### Lead triage / Bouncer / digests

- [lib/ai/triage.ts](/C:/Users/micha/Projects/Assistantbot/lib/ai/triage.ts)
- [actions/learning-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/learning-actions.ts)
- [lib/digest.ts](/C:/Users/micha/Projects/Assistantbot/lib/digest.ts)
- [components/crm/deal-card.tsx](/C:/Users/micha/Projects/Assistantbot/components/crm/deal-card.tsx)
- [components/chatbot/chat-interface.tsx](/C:/Users/micha/Projects/Assistantbot/components/chatbot/chat-interface.tsx)

What to know:
- The current policy is review-first, not decline-first.
- Held leads should remain visible and actionable for humans.

### Deal/job creation, scheduling, and CRM mutations

- [actions/deal-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/deal-actions.ts)
- [actions/contact-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/contact-actions.ts)
- [actions/tradie-actions.ts](/C:/Users/micha/Projects/Assistantbot/actions/tradie-actions.ts)
- [lib/deal-utils.ts](/C:/Users/micha/Projects/Assistantbot/lib/deal-utils.ts)

What to know:
- This is where most cross-surface trust issues show up.
- Keep user-facing stage language consistent across pages, chat, activities, and reporting.

### Address capture and job creation UX

- [components/ui/address-autocomplete.tsx](/C:/Users/micha/Projects/Assistantbot/components/ui/address-autocomplete.tsx)
- [components/modals/new-deal-modal.tsx](/C:/Users/micha/Projects/Assistantbot/components/modals/new-deal-modal.tsx)
- [components/modals/new-deal-modal-standalone.tsx](/C:/Users/micha/Projects/Assistantbot/components/modals/new-deal-modal-standalone.tsx)

What to know:
- The trust requirement is explicit: typed addresses must not be silently rewritten.

### Settings layout / scroll behavior

- [app/crm/settings/layout.tsx](/C:/Users/micha/Projects/Assistantbot/app/crm/settings/layout.tsx)

What to know:
- The user explicitly reported clipped settings cards/buttons.
- The fix is page-level vertical scroll, not nested scroll traps.

### Verification / audit / live testing references

- [LIVE_CRM_WORKFLOW_AUDIT.md](/C:/Users/micha/Projects/Assistantbot/LIVE_CRM_WORKFLOW_AUDIT.md)
- [docs/live_chatbot_regression.md](/C:/Users/micha/Projects/Assistantbot/docs/live_chatbot_regression.md)
- [scripts/run-live-chatbot-regression.mjs](/C:/Users/micha/Projects/Assistantbot/scripts/run-live-chatbot-regression.mjs)
- [scripts/run-live-chatbot-hotspots.mjs](/C:/Users/micha/Projects/Assistantbot/scripts/run-live-chatbot-hotspots.mjs)

What to know:
- Use these as the continuation point for live verification.
- Do not invent a parallel workflow if these already cover the scenario.

## Targeted Tests Already Run

These passed in the final verification pass for this batch:

```powershell
npx vitest run __tests__/chat-route.test.ts __tests__/chat-actions.test.ts __tests__/triage.test.ts __tests__/digest.test.ts __tests__/deal-utils.test.ts __tests__/contact-actions.test.ts __tests__/deal-actions.test.ts __tests__/tradie-actions.test.ts __tests__/settings-layout.test.tsx __tests__/new-deal-modal.test.tsx __tests__/new-deal-modal-standalone.test.tsx
```

## Most Important Product Decisions To Preserve

1. Tracey chat should remain LLM-first.
- Do not turn the chatbot into a mostly deterministic command engine.
- Small direct fast paths are fine for narrow policy or exact high-confidence cases, but normal CRM orchestration should stay model-led.

2. Bouncer should prefer hold/review over decline.
- Outside-area, wrong-trade, partial-details, missing-address, and similar risky leads should generally be held for review rather than auto-rejected.
- If unresolved, they should surface in review workflows such as the evening digest.

3. User-facing labels matter.
- Avoid leaking legacy internal stage names like `CONTACTED`, `NEGOTIATION`, `PIPELINE`, `INVOICED`, or `ready_to_invoice` into visible UI or chat responses.

4. Typed addresses must be trustworthy.
- Do not reintroduce silent autocomplete rewriting.

5. Settings pages should vertically scroll at the page level.
- Do not bring back clipped bottom actions in settings by restoring nested inner scroll containers.

6. User-facing stage text should come from shared helpers.
- Prefer [deal-utils.ts](/C:/Users/micha/Projects/Assistantbot/lib/deal-utils.ts) or the existing label maps over new ad hoc strings.

## What Is Still Outstanding

These are the highest-value remaining areas to continue:

1. Live CRM workflow polish
- Continue the live authenticated workflow audit on the common operational paths:
- lead intake
- contact management
- scheduling/rescheduling
- inbox/direct-message vs Ask Tracey clarity
- invoicing/billing review
- map/route mode

2. Chatbot quality against real CRM operations
- Keep improving output quality and logical correctness first.
- Focus on whether Tracey actually completes CRM work and answers CRM questions clearly, not just latency.
- Reuse the existing live regression harnesses instead of inventing a new ad hoc method.

3. Provider-backed live verification
- Voice/LiveKit
- SMS/Twilio
- email/Resend or inbound email flow
- Repo-side mocked/readiness tests exist, but real provider end-to-end proof is still a separate outstanding step.

4. Remaining UI trust issues from the live workflow audit
- The live workflow audit file exists at [LIVE_CRM_WORKFLOW_AUDIT.md](/C:/Users/micha/Projects/Assistantbot/LIVE_CRM_WORKFLOW_AUDIT.md), but treat it as a working audit log, not perfect truth.
- Some entries in it may already be resolved.
- Use it as a lead list, then verify each issue against the current app before acting.

## Known Likely Open Problems To Re-Verify

These were either still open or needed reconfirmation in the live product:

1. Contact list count / pagination trust mismatch
- The visible rows and footer count did not always agree in the live CRM.

2. Cross-page schedule time consistency
- The same job time was previously rendered differently across the deal page, dashboard, and schedule.

3. Inbox mode clarity
- `Direct Message` vs `Ask Tracey` still needed product-quality validation to make sure the visible composer matches the actual send mode.

4. Deal detail page polish
- Some card heights and section breathing room were poor.
- A recent fix addressed the overall deal-page height/scroll pattern, but this should still be rechecked in the live app.

5. Chatbot quality on real CRM commands
- The big remaining question is still whether Tracey consistently performs and explains CRM actions the way a real user expects.
- Continue with real-user prompts, not toy prompts.

## Recommended Resume Sequence

1. Read this handoff.
2. Read the latest entry in [docs/agent_change_log.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_change_log.md).
3. Open [LIVE_CRM_WORKFLOW_AUDIT.md](/C:/Users/micha/Projects/Assistantbot/LIVE_CRM_WORKFLOW_AUDIT.md) only as a reference list of suspected live issues.
4. Reproduce each still-open item in the live authenticated app before changing code.
5. For chatbot work, keep the LLM-first architecture intact and improve prompt/context/tool quality before adding more deterministic routing.
6. After each fix, update the change log and rerun only the relevant targeted suites first, then any broader regression if the change touches shared behavior.

## Tests To Read Before Editing

These tests capture the most relevant recent intent and should be read before touching the corresponding areas:

- [__tests__/chat-route.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/chat-route.test.ts)
- [__tests__/chat-actions.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/chat-actions.test.ts)
- [__tests__/triage.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/triage.test.ts)
- [__tests__/digest.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/digest.test.ts)
- [__tests__/deal-utils.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/deal-utils.test.ts)
- [__tests__/deal-actions.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/deal-actions.test.ts)
- [__tests__/tradie-actions.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/tradie-actions.test.ts)
- [__tests__/settings-layout.test.tsx](/C:/Users/micha/Projects/Assistantbot/__tests__/settings-layout.test.tsx)
- [__tests__/new-deal-modal.test.tsx](/C:/Users/micha/Projects/Assistantbot/__tests__/new-deal-modal.test.tsx)
- [__tests__/new-deal-modal-standalone.test.tsx](/C:/Users/micha/Projects/Assistantbot/__tests__/new-deal-modal-standalone.test.tsx)

## Useful Existing Harnesses / Places To Resume

- Live chatbot regression docs:
  - [docs/live_chatbot_regression.md](/C:/Users/micha/Projects/Assistantbot/docs/live_chatbot_regression.md)
- Live chatbot runners:
  - [run-live-chatbot-regression.mjs](/C:/Users/micha/Projects/Assistantbot/scripts/run-live-chatbot-regression.mjs)
  - [run-live-chatbot-hotspots.mjs](/C:/Users/micha/Projects/Assistantbot/scripts/run-live-chatbot-hotspots.mjs)
- CRM workflow audit reference:
  - [LIVE_CRM_WORKFLOW_AUDIT.md](/C:/Users/micha/Projects/Assistantbot/LIVE_CRM_WORKFLOW_AUDIT.md)

## Important Local-Only Caution

If these files are still dirty in the local worktree when you resume, treat them as unrelated and do not accidentally revert or bundle them unless the user explicitly asks:

- [Shell.tsx](/C:/Users/micha/Projects/Assistantbot/components/layout/Shell.tsx)
- [store.ts](/C:/Users/micha/Projects/Assistantbot/lib/store.ts)
- [playwright.config.ts](/C:/Users/micha/Projects/Assistantbot/playwright.config.ts)
- [shell-store.test.ts](/C:/Users/micha/Projects/Assistantbot/__tests__/shell-store.test.ts)

## Definition Of Done For The Next Agent

Do not stop at “tests pass.” The target is:

- the workflow works
- it makes sense to the user
- the wording is crisp and trustworthy
- data stays coherent across pages
- the chatbot answers accurately and performs CRM actions correctly
- logs/docs are updated so another agent can continue without guessing

## One-Sentence Resume Instruction For The Next Agent

Resume from [docs/agent_handoff_2026-04-05.md](/C:/Users/micha/Projects/Assistantbot/docs/agent_handoff_2026-04-05.md), keep Tracey LLM-first, verify any remaining live CRM issue before changing code, and continue improving workflow trust, chatbot correctness, and cross-page coherence without reintroducing silent data mutation or clipped layouts.
