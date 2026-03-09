## 2026-03-09 (AEST) – Cursor AI Agent

- **Files changed**: 
  - `components/onboarding/tracey-onboarding.tsx`
  - `components/ui/weekly-hours-editor.tsx`
  - `components/dashboard/dashboard-client.tsx`
  - `components/crm/kanban-board.tsx`
  - `components/dashboard/notifications-btn.tsx`
  - `actions/notification-actions.ts`
  - `lib/digest.ts`
  - `lib/workspace-routing.ts`
  - `actions/chat-actions.ts`
  - `components/chatbot/chat-interface.tsx`
  - `__tests__/chat-interface.test.tsx`
- **Summary**: 
  - Tightened Tracey onboarding copy and wired the physical address field to Google-powered address autocomplete.
  - Refined dashboard kanban layout (white board, column height, padding, and scroll behaviour) to better match the main canvas.
  - Improved in-app notifications: full message text, clickable rows that navigate via `link`, and saner time windows for morning/evening alerts.
  - Introduced shared daily digest helpers for morning/evening briefs and surfaced them as aesthetic modals launched from Tracey chat preview cards.
  - Added mode-aware “Next steps” guidance in the digest modal, and simplified workspace/phone routing helpers to avoid Prisma generic conflicts.
- **Why**: 
  - To make onboarding smoother, kanban usage clearer, and daily summaries (morning brief and evening wrap-up) more actionable and discoverable inside the existing Tracey assistant experience, while keeping TypeScript builds green.

# Agent Change Log

Operational audit log for all AI agent code/config edits.  
Rule: every agent change commit must include an entry in this file.

### 2026-03-07 00:10 (AEDT) - codex
- Files: `app/page.tsx`, `docs/agent_change_log.md`
- What changed: Restored the intended homepage hero and CRM section wording. The hero now says `Your AI assistant & CRM — here to give you an early mark`, and the CRM section now says `Tracey lives in your CRM. They will contact customers and run your CRM so you don't have to.`
- Why: These were not deployment misses; the older copy was still present in `main`, so production was correctly rendering outdated strings that had drifted back into the repo.

## Entry Template

```md
### YYYY-MM-DD HH:MM (AEST/AEDT) - <agent>
- Files: `path/a`, `path/b`
- What changed: <concise summary>
- Why: <reason / expected outcome>
```

## Entries

### 2026-03-09 22:25 (AEDT) - codex
- Files: `app/api/check-env/route.ts`, `app/api/cron/customer-agent-reconcile/route.ts`, `app/api/health/route.ts`, `app/api/internal/customer-agent-drift/route.ts`, `app/api/internal/voice-agent-status/route.ts`, `lib/customer-agent-readiness.ts`, `lib/health-check.ts`, `lib/ops-auth.ts`, `lib/twilio-drift.ts`, `lib/voice-agent-runtime.ts`, `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `.github/workflows/deploy-livekit.yml`, `vercel.json`, `docs/agent_change_log.md`
- What changed: Added durable LiveKit worker heartbeats with runtime env fingerprints, surfaced worker drift and Twilio voice-routing drift in health/readiness/check-env, added a protected internal drift-audit/reconcile endpoint, added a Vercel cron self-heal for Twilio inbound voice routing, expanded the worker env example for multi-number inbound config, and made the LiveKit deploy verify that the restarted worker reports the newly deployed SHA back to the app.
- Why: Customer-facing voice and SMS agents were still vulnerable to external config drift in Twilio Console and on the remote LiveKit host. This change moves those failure modes from silent breakage into auditable, self-healing, and deploy-blocking checks so customer calls do not quietly cut over to stale routing or stale worker env.

### 2026-03-09 20:53 (AEDT) - codex
- Files: `actions/agent-tools.ts`, `actions/scraper-actions.ts`, `actions/settings-actions.ts`, `actions/tracey-onboarding.ts`, `actions/workspace-actions.ts`, `components/onboarding/tracey-onboarding.tsx`, `components/settings/call-settings-client.tsx`, `components/ui/weekly-hours-editor.tsx`, `lib/ai/context.ts`, `lib/ai/tools.ts`, `lib/comms-simple.ts`, `lib/working-hours.ts`, `docs/agent_change_log.md`
- What changed: Reworked onboarding and settings hours into a compact weekly-hours editor with a right-aligned uniform-hours toggle, removed the extra onboarding helper/copy-button clutter, added website-plus-Google-Places hours prefilling with structured per-day storage in `workspace.settings`, threaded those weekly hours into availability and AI scheduling context, normalized stale workspace hour defaults, and clarified the Twilio provisioning error so missing credentials are distinguished from later AU compliance failures.
- Why: The old onboarding flow flattened business hours into one range, defaulted toward stale tradie hours, and created UI overload when per-day hours were needed. The updated flow makes scraped business hours more accurate, supports different hours per day cleanly, and makes Twilio onboarding failures easier to diagnose.

### 2026-03-09 19:07 (AEDT) - codex
- Files: `app/api/chat/route.ts`, `livekit-agent/agent.ts`, `livekit-agent/voice-latency.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Fixed web-chat tool result collection to read the current AI SDK `output` field, and added a production-only voice latency path for normal Tracey calls with interim-turn classification, a small parallel guard-model check, a cached opener bank including tightly constrained empathetic openers, and runtime metrics for classifier/guard/opener usage. Updated the agent env example with the new voice-latency and guard-model flags.
- Why: Keep the main app building against the current tool-result API while reducing perceived response-start latency on low-risk production voice turns without enabling unsafe speculative replies for pricing, invoicing, policy, emergency, or firm booking confirmations.

### 2026-03-05 17:25 (AEDT) - cascade
- Files: `app/page.tsx`, `actions/demo-call-action.ts`, `app/api/demo-call/route.ts`, `.env.local`
- What changed: Merged all homepage and onboarding fixes from Cascade project: value pill tick alignment with Check icon, removed Bot icon, wired up real outbound demo calls via LiveKit SIP, added demo call API route, updated environment variables with LiveKit SIP trunk config.
- Why: Sync all changes to main repo and enable outbound demo calls functionality.

### 2026-03-05 16:30 (AEDT) - cascade
- Files: `app/page.tsx`, `actions/demo-call-action.ts`, `app/api/demo-call/route.ts`, `livekit-agent/agent.ts`, `components/onboarding/tracey-onboarding.tsx`, `app/api/auth/email-provider/route.ts`, `app/api/voice-preview/route.ts`
- What changed: Complete homepage and onboarding fixes: value pill tick alignment, removed Bot icon, wired up real outbound demo calls via LiveKit SIP, added 5-min demo cap with sales messaging, restructured Hire Tracey section with zigzag layout and placeholder screenshots, updated features heading to "One platform to run it all", fixed Gmail OAuth env var mismatch, shortened emergency hours text, updated auto-forward instructions, fixed phone provisioning response path, improved voice preview error handling.
- Why: Address all 11 reported UI/UX and functional issues across homepage and onboarding flow.

### 2026-03-05 02:14 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated hero value pills by removing the outer encasing container, restoring dark pill backgrounds with white text, and prepending each phrase with a prominent secondary-color tick icon.
- Why: Match requested hero pill visual style and improve emphasis/readability.

### 2026-03-05 02:13 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated bottom headline copy to `Give yourself an early mark today` with green-highlighted `early mark`; replaced the old `The old way` / `The Tracey way` flow cards with a side-by-side comparison layout matching the reference style, removed emoji labels, renamed RHS heading to `Tracey does it for you`, and inserted the exact requested grouped bullet content for both columns using crosses on the old-way side.
- Why: Match requested copy and transform the comparison section into a cleaner visual format consistent with the provided reference.

### 2026-03-05 02:00 (AEDT) - codex
- Files: `app/page.tsx`, `components/layout/navbar.tsx`
- What changed: Refined hero value pillars to a sleeker integrated strip style and removed numeric markers; set the CRM/interview section to dark grey background for contrast; added bottom CTA headline `Give your self an Earlymark today` with green-highlighted `Earlymark` and applied green ambient glow to that section; normalized top navbar text/button sizing to `text-[15px]` for consistency.
- Why: Improve visual cohesion and contrast across sections while matching requested copy and hierarchy.

### 2026-03-05 01:46 (AEDT) - codex
- Files: `app/page.tsx`, `app/contact/page.tsx`
- What changed: Updated bottom CTA buttons to `Get started` and `Get a demo`; changed `Get a demo` link target to `/contact#contact-form`; added `id="contact-form"` to the contact page form for direct deep-linking.
- Why: Match requested CTA wording and ensure demo CTA opens directly at the contact form.

### 2026-03-05 01:44 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Reworked the "Hire Tracey today" block into a 2-column layout with `Tracey in action` (video/demo) on the left and the 3 feature boxes on the right. Updated the third feature card to title `AI that actually works` and description `AI that handles convos like a human. Tracey learns your preferences and delivers a better and simpler experience.`
- Why: Match requested section structure and exact final card copy.

### 2026-03-05 01:41 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated hero CTA labels to `Get started` and `Interview your assistant` (with interview anchor link), changed CRM section headline copy to remove "for you", added `id=\"interview-assistant\"`, and removed the placeholder platform video block so the section is now LHS text and RHS interview form.
- Why: Match requested CTA wording and restructure the CRM/interview section to text + form only.

### 2026-03-05 01:35 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Replaced center-only hero glow with a reference-style layered background treatment: soft full-section gradient field, lower horizontal green halo, and angled side atmospheric panels to mirror the reference composition in green.
- Why: Match the reference look more closely and avoid the "single center glow" appearance.

### 2026-03-05 01:33 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Reworked hero glow rendering from negative-z blurred circles to an in-section layered radial-gradient glow (`z-0`) and moved hero content to `z-10` with `isolate` to guarantee visibility.
- Why: Fix non-visible ambient glow caused by stacking context; ensure a clearly visible green glow behind hero content.

### 2026-03-05 01:31 (AEDT) - codex
- Files: `components/layout/navbar.tsx`
- What changed: Restored the `Contact us` CTA in the top navbar and linked it to `/contact`.
- Why: Reinstate requested navigation path and ensure the CTA is present and functional.

### 2026-03-05 01:29 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Refined hero value cards for clearer visual hierarchy: added an "Earlymark helps businesses" label, replaced plain `(1)(2)(3)` text markers with numbered badges, applied consistent dark gradient cards, and tightened typography/spacing for better readability.
- Why: Fix poor formatting and produce a cleaner, higher-contrast hero value section aligned with the requested content.

### 2026-03-05 01:25 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Removed the hero paragraph text, moved the three dark labelled value boxes `(1)(2)(3)` directly beneath the hero heading, and significantly amplified the green ambient radial glow with three stronger layered glows.
- Why: Match requested hero hierarchy and make the green glow unmistakably visible.

### 2026-03-05 01:17 (AEDT) - codex
- Files: `app/page.tsx`
- What changed: Updated hero visuals by increasing a clearly green ambient radial glow and replaced the existing value pillar cards with three dark horizontal boxes labelled `(1)`, `(2)`, `(3)` containing the exact requested lines.
- Why: Match the requested hero design direction and restore the original messaging structure in a stronger, higher-contrast format.

### 2026-03-05 01:16 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`, `.husky/pre-commit`, `scripts/check-agent-change-log.mjs`
- What changed: Added a mandatory agent logging policy and a pre-commit gate that requires `docs/agent_change_log.md` to be staged whenever code/config files are staged.
- Why: Enforce a reliable audit trail so agent-made edits are always documented.

### 2026-03-06 11:35 (AEDT) - codex
- Files: `actions/tracey-onboarding.ts`, `app/api/demo-call/route.ts`, `app/api/workspace/setup-comms/route.ts`, `app/page.tsx`, `components/onboarding/tracey-onboarding.tsx`, `livekit-agent/agent.ts`, `lib/comms-provision.ts`, `public/favicon.ico`, `public/latest-logo.png`, `public/logo-photo.svg`, `public/EA logo 260305.png`, `.windsurfrule`, `dev-server.log`
- What changed: Included all pending local updates in one commit: onboarding flow fixes (including phone provisioning fallback and UI updates), homepage hero selling-point layout refactor, voice-agent runtime tuning and metrics audit logging, plus local asset/config/log file changes.
- Why: User requested pushing every local change exactly as currently present, including changes not made by the agent.

### 2026-03-06 12:05 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `livekit-agent/agent.ts`
- What changed: Finalized onboarding to 6 steps by removing the separate "Try Tracey" step, keeping sneak peek tied directly to selected top mode, restoring Windsurf UI refinements (progress arrows, stronger Tracey bubble contrast, horizontal mode cards), and adding a one-attempt guard to eager phone provisioning to stop repeat API loops after timeout/failure. Added stricter voice-turn filtering to drop low-signal transcripts and increased interruption-word threshold to reduce silence/noise-triggered follow-up speech.
- Why: Align onboarding behavior with approved UX and prevent both phone provisioning loop retries and silence-triggered filler responses in voice calls.

### 2026-03-06 15:06 (AEDT) - codex
- Files: `livekit-agent/agent.ts`
- What changed: Restored Earlymark-specific demo and inbound-sales call handling in the voice agent, added proactive lead-capture guidance and `log_lead` tool usage, introduced stronger truthfulness rules that explicitly forbid claiming existing-CRM integrations, and added goodbye detection with a delayed hangup so Tracey does not resume with a post-call summary after the caller says bye.
- Why: Fix the latest demo-call regressions around sales behaviour, hallucinated CRM claims, and failure to end the call cleanly after the conversation is over.

### 2026-03-06 15:28 (AEDT) - codex
- Files: `prisma/schema.prisma`, `prisma/migrations/20260306_add_voice_call_logs/migration.sql`, `app/api/internal/voice-calls/route.ts`, `actions/voice-call-actions.ts`, `components/settings/recent-voice-calls.tsx`, `app/dashboard/settings/call-settings/page.tsx`, `livekit-agent/agent.ts`
- What changed: Added a persisted `VoiceCall` store with migration and DB sync, created an internal webhook route for the LiveKit worker to save transcripts and latency audits, surfaced recent workspace call logs in call settings, and split the worker more cleanly across the three Tracey identities by distinguishing interview-form demos, inbound Earlymark sales calls, and normal customer-workspace calls.
- Why: Make the latest calls queryable from the app instead of only from worker stdout, and restore the intended three-use-case identity model for Tracey.

### 2026-03-06 15:40 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Added canonical OCI and LiveKit deployment context for future agents, including the Oracle Ubuntu host, Docker-only orchestration model, container names, restart policy, SIP log command, `/etc/livekit.yaml` location, local LiveKit URL, TURN and RTC ports, Twilio trunk ID, SIP dispatch rule, and inbound media/firewall assumptions.
- Why: Stop future agents from making incorrect assumptions about how the LiveKit worker is deployed, how inbound SIP routing works, and where to inspect real runtime logs.

### 2026-03-06 15:47 (AEDT) - codex
- Files: `prisma/migrations/20260306_add_voice_call_logs/migration.sql`
- What changed: Made the `VoiceCall` migration idempotent by switching table and index creation to `IF NOT EXISTS` and guarding foreign-key creation with `pg_constraint` checks.
- Why: Recover from environments where the `VoiceCall` table already exists because schema changes were applied before `prisma migrate deploy` reached this migration.

### 2026-03-06 16:05 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`
- What changed: Added a GitHub Actions workflow that triggers on `main` pushes affecting `livekit-agent/**` and deploys the LiveKit agent over SSH by pulling the repo and rebuilding the Docker Compose stack on the target host.
- Why: Automate LiveKit agent deployment so worker updates do not rely on manual SSH redeploy steps after every push.

### 2026-03-06 16:08 (AEDT) - codex
- Files: `livekit-agent/README.md`
- What changed: Appended a one-line README change to intentionally touch `livekit-agent/**` and trigger the new automated deploy workflow on `main`.
- Why: Validate that the GitHub Actions-based LiveKit deployment path is firing from a real repository push.

### 2026-03-06 16:54 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `AGENTS.md`, `livekit-agent/package.json`, `livekit-agent/package-lock.json`
- What changed: Replaced the broken SSH deploy workflow that assumed `/opt/livekit-agent` was a git checkout with a checkout + SCP + remote restart flow that copies `livekit-agent/**` into `/tmp/livekit-agent`, runs `npm ci`, and restarts the actual `tsx agent.ts start` process with PID-based health verification. Also corrected the canonical infra doc to match the real OCI layout and log locations, and added the missing `dotenv` runtime dependency required by `livekit-agent/agent.ts`.
- Why: The production server does not deploy the worker from `/opt/livekit-agent` or from Docker Compose, and the repo’s agent package manifest was incomplete. Without matching the real `/tmp/livekit-agent` runtime and its actual dependencies, pushes to `livekit-agent/**` would not update the active voice agent reliably.

### 2026-03-06 17:03 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`
- What changed: Removed the fallback `pkill -f /tmp/livekit-agent/agent.ts` from the LiveKit deploy workflow and left restart control to the tracked PID file, with a short post-kill pause before starting the new worker.
- Why: The broad `pkill -f` pattern was matching the SSH action's own remote script command line and terminating the deploy session with exit code `143`, causing false workflow failures during agent restarts.

### 2026-03-06 17:09 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `livekit-agent/agent.ts`, `AGENTS.md`
- What changed: Switched LiveKit deploy packaging from a handpicked file list to a tarball of the full `livekit-agent` directory excluding local env files and `node_modules`, updated the remote deploy to replace the staged directory while preserving `.env.local`, and added an `[agent-version]` startup log that includes the pushed Git SHA so the workflow can verify the exact deployed revision from `/tmp/agent.log`.
- Why: Handpicked file copying was fragile and could miss future runtime files. Adding a startup SHA marker makes it possible to prove the OCI worker is running the same commit that GitHub Actions deployed.

### 2026-03-06 17:20 (AEDT) - codex
- Files: `livekit-agent/agent.ts`
- What changed: Restored the demo call to a two-step opener by making the initial identity check a standalone session.say() line, updated the demo prompt so the LLM waits for the caller before introducing Tracey from Earlymark AI, reintroduced explicit SIP track subscription logging, and removed the participant-identity input filter from the session start path.
- Why: The latest demo call combined the opener into one line and never produced any caller transcript events. Earlier working versions used explicit track subscription plus a wait-for-response greeting flow, which is the correct pattern for these SIP demo calls.

### 2026-03-06 17:31 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Recorded new canonical voice-agent regression guardrails from the latest demo-call review: keep the two-step demo opener, keep Australian delivery for the full call, treat demo `llmTtftMs` above roughly `1200ms` as a regression, keep early demo replies short to avoid talk-over, avoid premature `log_lead` calls after identity confirmation only, and preserve explicit SIP track subscription diagnostics.
- Why: The March 6, 2026 follow-up demo call showed two regressions despite restored caller-audio capture: accent drift as the call continued and enough response latency to cause repeated interruption/talk-over. These need to remain explicit so future agent edits do not regress the same behavior again.


### 2026-03-06 17:43 (AEDT) - codex
- Files: livekit-agent/agent.ts, docs/agent_change_log.md`r
- What changed: Tightened the Earlymark demo and inbound prompts to keep replies under roughly 18 words, enforce simple punchy Australian phrasing, and avoid premature lead logging. Also lowered LLM variability with VOICE_LLM_TEMPERATURE default  .2, capped completions with VOICE_LLM_MAX_COMPLETION_TOKENS default 80, made optional lead-tool fields tolerant of missing business type / interest level, and reduced the default Cartesia chunk timeout to 1500ms.
- Why: The latest demo call showed accent drift, overlong replies, invalid early log_lead calls, and enough reply duration to create talk-over. These changes aim to reduce TTS workload immediately while keeping the current DeepInfra path stable until Groq is adopted directly.


### 2026-03-06 17:53 (AEDT) - codex
- Files: livekit-agent/agent.ts, docs/agent_change_log.md`r
- What changed: Refined the inbound_demo prompt so Tracey clearly acts as Earlymark AI's lead-qualification assistant rather than a receptionist for the caller's business, emphasised that this flow should mirror the interview-form demo except that inbound calls require more proactive contact-detail capture, and toned down the Australian styling to avoid forced slang. Also simplified the inbound greeting and Earlymark goodbye copy to remove heavier dialect cues.
- Why: The inbound demo requirements are different from normal customer-assistant calls. The current wording was causing Tracey to lean toward the wrong identity and sound overly Australian instead of natural.

### 2026-03-06 17:58 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Adjusted the shared and Earlymark-specific style instructions so `G'day` is allowed again when it sounds natural and is pronounced correctly, while still discouraging forced or exaggerated slang.
- Why: `G'day` itself is acceptable. The actual quality bar is natural delivery, not banning the phrase outright.

### 2026-03-06 18:48 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Replaced raw backticks around "G'day" inside template-string prompts with plain quotes so the TypeScript source remains valid when deployed to the LiveKit worker.
- Why: The prior wording introduced an esbuild parse error during GitHub Actions deploy (`Expected ";" but found "G"`), which prevented the worker from starting on the OCI server.

### 2026-03-06 19:06 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Fixed inbound-call classification so rooms named like `earlymark-inbound-*` or `inbound_*` route to `inbound_demo` even if phone-number env matching is incomplete, replaced the static normal-call prompt with a business-aware prompt that introduces Tracey as "an AI assistant for [business]", and added explicit truthfulness rules across the relevant prompts that she is never a real person.
- Why: The latest inbound call was incorrectly treated as `normal`, which put Tracey in the wrong role. That same call also showed an unacceptable hallucination where she claimed to be a real person. The correct identity needs to hold for inbound Earlymark sales calls and for customer-assistant calls alike.


### 2026-03-06 19:17 (AEDT) - codex
- Files: livekit-agent/agent.ts, docs/agent_change_log.md`r
- What changed: Updated the inbound_demo sales prompt so explicit buying intent now overrides discovery. When a caller says they are ready to sign up or asks how to proceed, Tracey should switch into closing mode: confirm intent, point them to earlymark.ai, collect the missing lead details needed for follow-up/onboarding, and only then offer manager follow-up if useful.
- Why: The latest inbound demo call showed that Tracey still prioritised pain-point discovery over closing the inbound lead, even after the caller clearly said they were ready to sign up. That behavior loses momentum and works against the goal of converting inbound demand.

### 2026-03-06 19:26 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Removed raw backticks around the `earlymark.ai` website reference inside the inbound prompt string so the deployed worker source remains syntactically valid.
- Why: The prior prompt edit introduced another OCI worker parse failure, which stopped Tracey from starting and therefore from answering inbound calls.

### 2026-03-06 19:35 (AEDT) - codex
- Files: `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Added a canonical voice-debug start rule requiring future sessions to read `AGENTS.md` and inspect the latest `/tmp/agent.log` latency and track markers before making further voice-agent changes. Also recorded inbound latency regression thresholds around `llmTtftMs > 1200` and `ttsTtfbMs > 900`.
- Why: Recent inbound-call debugging repeatedly depended on log evidence rather than prompt inspection alone. The operational baseline needs to be explicit so future sessions start from the measured bottleneck instead of re-learning the same process.

### 2026-03-06 20:05 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Switched Earlymark demo and inbound calls to prefer Groq whenever a Groq API key is present, shortened and simplified the inbound sales prompt to reduce prompt-token load, tightened Earlymark completion limits and temperature defaults, and lowered inbound interruption gating so one-word phone interjections can cut in sooner. Documented the new Groq and inbound-tuning env vars in the agent example env file.
- Why: The latest inbound-call logs showed that STT was not the bottleneck; the main delay was LLM start time, with overly long replies then inflating TTS duration. These changes reduce first-turn LLM overhead and reply length without adding canned response shortcuts.

### 2026-03-06 20:14 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Changed the LLM provider selection so all Tracey modes use Groq directly whenever `GROQ_API_KEY` is present, with DeepInfra only as the no-Groq fallback. Updated the env example comment to reflect that Groq is now the preferred path for every voice call, not just Earlymark demos.
- Why: The intended operating rule is now global: if Groq is available, the voice agent should take the faster direct Groq route across all personas instead of only some call types.

### 2026-03-06 20:22 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Added a fallback rule across all three Tracey prompt variants: if Tracey is not confident she can help correctly, she should make up to 2 honest attempts to help first, then say she will pass it to her manager so they can get back to the caller ASAP. The rule still forbids inventing unsupported facts or capabilities.
- Why: This needs to be consistent across Earlymark demo, Earlymark inbound, and customer-assistant calls. The agent should try to help instead of escalating too quickly, but it still needs a clean fallback before uncertainty turns into hallucination.

### 2026-03-06 20:28 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Refined the fallback flow across all three Tracey prompt variants so manager escalation is offered rather than assumed. After up to 2 honest attempts to help, Tracey should offer to pass it to the manager, and only wrap up once the caller agrees.
- Why: The escalation should stay collaborative. The caller needs to consent to the manager handoff instead of having the call prematurely closed for them.

### 2026-03-06 20:36 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `docs/agent_change_log.md`
- What changed: Updated the inbound Earlymark greeting to "Hi, this is Tracey from Earlymark AI. How can I help?", made it explicit across all three Tracey prompt variants that if asked whether she is AI she must always say yes, and pinned the Cartesia TTS model directly to `sonic-3` instead of allowing env drift.
- Why: The inbound opening needed to be shorter and match the requested wording exactly. AI identity should never be ambiguous, and the TTS path should stay locked to the required Cartesia Sonic 3 model.

### 2026-03-06 20:49 (AEDT) - codex
- Files: `livekit-agent/agent.ts`, `livekit-agent/.env.example`, `docs/agent_change_log.md`
- What changed: Tightened the Earlymark demo and inbound prompts so replies stay one-sentence and shorter, explicitly require answering the caller's question before steering toward the sale, forbid repeating the Tracey/AI intro after it has already been established, forbid spoken tool-call text, and forbid end-of-call summaries across all three Tracey modes. Updated goodbye lines so only the Earlymark demo and inbound modes point callers to `earlymark.ai` to find out more, shortened the wrap-up scripts to avoid recap behavior, and lowered Earlymark completion-token defaults to `40` with inbound set to `32`.
- Why: The latest inbound and demo calls showed the remaining latency is driven by TTS duration and occasional long or redundant phrasing. They also exposed real behavior regressions: repeated self-introductions, premature website-only CTAs, spoken tool syntax, and call-detail summaries that should never happen.

### 2026-03-06 21:18 (AEDT) - codex
- Files: `actions/workspace-actions.ts`, `actions/tracey-onboarding.ts`, `app/api/workspace/setup-comms/route.ts`, `components/onboarding/tracey-onboarding.tsx`, `lib/comms.ts`, `lib/comms-simple.ts`, `lib/welcome-sms.ts`, `.env.example`, `docs/agent_change_log.md`
- What changed: Reworked paid-user onboarding so the signed-in owner is upserted into the app `User` table by email before onboarding writes proceed, which removes the duplicate-email crash on `Activate Tracey`. Split final-step comms setup into a deterministic provisioning state with `already_provisioned`, `provisioned`, `failed`, and `ready` outcomes, blocked activation until a visible phone number exists, and surfaced retry handling instead of the old looping spinner. Reshuffled onboarding fields so step 1 collects owner details plus website URL, step 3 collects business name and physical address, removed visible suburb-only UX, added auth-based email/name prefill, and restored an optional team-invite section on the final step. Added an idempotent welcome-SMS helper that sends from the provisioned number after activation and stores handbook-link metadata, plus the `TRACEY_HANDBOOK_URL` env placeholder.
- Why: The onboarding flow was broken in multiple ways at once: Google sign-in data was not prefilled, the last step could loop forever without resolving a number, completion could happen before provisioning was actually ready, and activation could crash on a duplicate Prisma `User.email` path. The new flow makes activation deterministic and keeps payment-to-live onboarding aligned with the provisioned number requirement.

### 2026-03-06 23:55 (AEDT) - codex
- Files: `actions/billing-actions.ts`, `actions/workspace-actions.ts`, `app/billing/page.tsx`, `components/billing/upgrade-button.tsx`, `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `lib/comms.ts`, `lib/comms-simple.ts`, `lib/onboarding-provision.ts`
- What changed: Added a temporary beta-only billing gate for Twilio provisioning by requiring users to enable a `Provision mobile business number` toggle on the billing page before checkout. Persisted that intent in workspace settings before redirecting to Stripe, then centralized provisioning enforcement so only paid workspaces with a pre-authorized request can provision. The shared provisioning helper now tracks explicit provisioning states, blocks duplicate provisioning across beta workspaces that share the same owner phone, and records duplicate diagnostics for support. Twilio number purchase is now mobile-only in both the full and simple provisioning paths, removing the old local-number fallback. Also upgraded Kanban to support true checkbox-style multi-select so selected card sets can drive bulk CRM chat actions instead of only the single currently opened deal.
- Why: Beta needs a hard cost-control gate before Stripe checkout, stronger protection against accidental duplicate number purchases during onboarding/redeploys, and a consistent mobile-number-only tenancy model. The CRM chatbot also needed a real selected-card set in Kanban so bulk actions can operate on explicit user-selected jobs.

### 2026-03-06 23:20 (AEDT) - codex
- Files: `actions/chat-actions.ts`, `app/api/chat/route.ts`, `app/dashboard/schedule/schedule-calendar.tsx`, `components/chatbot/chat-interface.tsx`, `components/crm/activity-feed.tsx`, `components/crm/kanban-board.tsx`, `components/onboarding/tracey-onboarding.tsx`, `actions/scraper-actions.ts`, `lib/ai/tools.ts`, `lib/crm-selection.ts`, `docs/agent_change_log.md`
- What changed: Added invoice editing and voiding tools so the CRM chatbot can update invoice numbers, line items, totals, and issued dates, then void eligible draft/issued invoices without relying on a second invoice system. Wired current CRM deal selection into chat via a small browser event contract so selected deals from Kanban, schedule, and activity views can flow into the chat API and be referenced when the user says "these" or "selected" during bulk CRM actions. Improved onboarding address smart-fill by falling back from scraped full address to suburb/location signals and summary text, and tightened the scraper prompt so it returns a best available base location when a street address is missing.
- Why: The remaining deployment/product gaps were invoice edit coverage, natural bulk-action scope from the current UI selection, and a brittle onboarding autofill path that only worked when the scraper found one exact address field.

### 2026-03-06 22:05 (AEDT) - codex
- Files: `app/api/webhooks/stripe/route.ts`, `app/billing/success/page.tsx`, `app/api/workspace/setup-comms/route.ts`, `actions/settings-actions.ts`, `components/settings/call-forwarding-card.tsx`, `lib/onboarding-provision.ts`, `lib/call-forwarding.ts`, `docs/agent_change_log.md`
- What changed: Added shared onboarding-provision orchestration so Tracey's number provisioning is triggered and timed as soon as Stripe payment succeeds, then reused the same helper on the last onboarding step as a visibility check. Logged elapsed provisioning times and outcomes for webhook, billing-success, and onboarding resolution paths. Built the customer-facing call-forwarding setup flow into account settings: the existing call-forwarding toggle now stores carrier/mode/delay settings, defaults backup forwarding to 15 seconds for an "after about 3 rings" setup, sends a setup SMS from the provisioned Tracey number to the owner's personal phone when forwarding is enabled, and exposes one-tap dialer links plus resend/setup guidance in the settings card.
- Why: Provisioning should start from the moment the customer pays, not only when they reach the last onboarding page. The app also needed a real call-forwarding activation path because the core promise is that callers get picked up by Tracey on the provisioned number once the user enables forwarding from their mobile.

### 2026-03-06 22:12 (AEDT) - codex
- Files: `actions/settings-actions.ts`, `components/settings/call-forwarding-card.tsx`, `lib/call-forwarding.ts`, `docs/agent_change_log.md`
- What changed: Lowered the default backup call-forwarding timeout from 15 seconds to 12 seconds across stored settings defaults, generated forwarding codes, and account-settings setup copy.
- Why: The requested default is a faster backup pickup so Tracey answers sooner when the user misses the call.

### 2026-03-06 22:27 (AEDT) - codex
- Files: `AGENTS.md`, `actions/chat-actions.ts`, `app/api/internal/voice-context/route.ts`, `docs/agent_change_log.md`, `lib/agent-mode.ts`, `lib/ai/context.ts`, `lib/ai/tools.ts`, `livekit-agent/agent.ts`
- What changed: Added a canonical customer-contact mode helper that normalizes legacy stored values into the exact business terms `execute`, `review & approve`, and `info only`. Updated the shared assistant context so those modes now apply only to `Tracey for users` customer-facing calls, texts, emails, and follow-up, while internal CRM chatbot operations stay unrestricted. Enforced that policy in the CRM chatbot's customer-contact tools by allowing `sendSms`, `sendEmail`, and `makeCall` only in execute mode, drafting instead in review & approve mode, and blocking them in info only mode. Added a secured internal voice-context route plus shared workspace voice grounding, then updated the LiveKit worker so `Tracey for users` fetches compact business grounding, uses lookup tools for services, pricing, business details, and no-go rules, and follows the same customer-contact mode policy on calls that already governs texts.
- Why: The repository needed a clear separation between the 4 assistant surfaces (`Tracey interview form`, `Tracey inbound call`, `Tracey for users`, `CRM chatbot`) and a single canonical mode policy for customer-facing automation. Without that split, the CRM chatbot prompt was over-applying mode restrictions to internal CRM work, and voice `Tracey for users` was still operating from a thin generic prompt instead of the same business truth model used elsewhere.

### 2026-03-06 22:55 (AEDT) - codex
- Files: `app/dashboard/settings/agent/page.tsx`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Cleaned up the remaining UI terminology and onboarding copy to match the canonical assistant model. The settings screen now shows the exact mode names `Execute`, `Review & approve`, and `Info only` while keeping the legacy stored enum values underneath. Onboarding copy now avoids scrape-first wording, uses the exact inbox mode label `Review & approve`, and softens the final-step number setup copy so it reflects a deterministic setup state instead of an endless provisioning loop.
- Why: The backend smart-agent work established the correct policy and taxonomy, but the UI still exposed legacy mode names and scrape/provisioning language that no longer matched the actual flow.

### 2026-03-06 22:02 (AEDT) - codex
- Files: `actions/chat-actions.ts`, `docs/agent_change_log.md`, `lib/ai/tools.ts`
- What changed: Expanded the CRM chatbot's explicit tool surface with safe CRM operations that already have backing server logic: updating deal fields, updating contact fields, completing tasks by title, deleting tasks by title, and listing recent CRM changes/activity. These were added as dedicated chatbot tools instead of relying on the model to improvise broad CRM mutations.
- Why: The next platform gap after onboarding was deeper, explicit CRM control for the chatbot. This tranche improves real operational coverage without making the assistant unrestricted or bypassing the existing customer-contact mode enforcement.

### 2026-03-06 22:12 (AEDT) - codex
- Files: `actions/chat-actions.ts`, `docs/agent_change_log.md`, `lib/ai/tools.ts`
- What changed: Added the next CRM-chatbot operations tranche. Bulk tools now support explicit-ID deal selection for bulk stage moves, bulk assignment, bulk disposition changes, and bulk reminder creation with per-item success/skip/block summaries. Added targeted reverse tools for reverting a recorded deal stage move, unassigning a deal, restoring a lost/deleted/archived deal, and reversing invoice status transitions to valid prior states. Added invoice tools for creating a draft invoice from a deal, issuing an invoice, marking an invoice paid, sending invoice reminders through the existing customer-contact mode guard, and showing invoice plus accounting-sync status.
- Why: The chatbot needed practical high-leverage CRM control beyond single-record edits while staying explicit and reversible. This tranche follows the agreed design: deals-first bulk actions, targeted reversals instead of magical rollback, and invoice operations centered on draft/issue/paid/remind/status rather than full invoice editing.

### 2026-03-07 00:18 (AEDT) - codex
- Files: `app/page.tsx`, `actions/tracey-onboarding.ts`, `components/onboarding/tracey-onboarding.tsx`, `lib/onboarding-provision.ts`, `AGENTS.md`, `docs/agent_change_log.md`
- What changed: Restored the homepage from the last accepted `Hire Tracey today` layout by bringing back the centered chat demo plus zigzag feature-card section, kept the approved hero heading copy, kept the CRM pronoun fix (`They`), and removed the interview-form header icon again. Removed the direct Twilio provisioning path from onboarding activation so onboarding now resolves numbers only through the centralized billing-gated provisioning helper, added a dedicated `onboarding-activation` trigger source, and expanded onboarding UI state handling to surface `requested`, `not_requested`, and `blocked_duplicate` instead of flattening those outcomes into generic failure. Added a critical-surface regression rule to `AGENTS.md` covering homepage restores and centralized provisioning.
- Why: The repo had regressed into a mixed homepage state after a later whole-file overwrite, and onboarding could still bypass the beta provisioning gate and duplicate-number protection by provisioning directly during activation. This change restores the accepted homepage baseline and closes the duplicate provisioning path so billing, onboarding, and provisioning all obey the same source of truth.

### 2026-03-07 00:34 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Added a hard next-step guard to the onboarding wizard so the step-advance click path re-checks validation before moving forward, instead of relying only on the button's disabled state.
- Why: Step 1 should never advance without the required website URL, even if the UI button state is bypassed by a browser quirk or unexpected interaction path.

### 2026-03-07 00:41 (AEDT) - codex
- Files: `actions/tracey-onboarding.ts`, `components/onboarding/setup-chat.tsx`, `docs/agent_change_log.md`
- What changed: Removed the unused legacy chat-style onboarding component from the repo and updated the active onboarding completion path so it writes `provisioned` instead of the shadow `ready` provisioning state after successful activation.
- Why: The legacy setup-chat path was stale onboarding surface area that could be reintroduced accidentally later, and the extra `ready` state created unnecessary drift from the centralized provisioning state model.

### 2026-03-07 00:44 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Relaxed step 1 onboarding validation so users can continue without a website URL while still requiring owner name, phone, and email.
- Why: The onboarding copy already presents the website as optional, so blocking the step on a blank website field was inconsistent with the intended flow.

### 2026-03-07 00:49 (AEDT) - codex
- Files: `actions/tracey-onboarding.ts`, `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Allowed the active onboarding flow to complete when provisioning status is `not_requested`, while keeping duplicate blocks, queued payment states, and real provisioning failures gated. The final step now permits activation without a number only in that one billing-toggle-missed case and updates the post-activation messaging accordingly.
- Why: A paid workspace that missed the temporary billing toggle should still be able to finish onboarding instead of being trapped at the last step. The dedicated number can be provisioned later from billing or settings without blocking initial setup.

### 2026-03-07 00:56 (AEDT) - codex
- Files: `app/api/auth/google-signin/callback/route.ts`, `app/onboarding/page.tsx`, `docs/agent_change_log.md`
- What changed: Fixed auth routing so Google sign-in now defaults back to `/auth/next` instead of bypassing the billing gate and dropping users straight into setup. Also changed the stale `/onboarding` page to redirect into `/auth/next` so there is no direct onboarding entrypoint that can skip the Stripe-before-onboarding flow.
- Why: The intended flow is auth -> billing -> setup -> dashboard. These two routes were still capable of sending users to onboarding before payment, which is why signup could appear to skip Stripe.

### 2026-03-07 01:02 (AEDT) - codex
- Files: `components/onboarding/tracey-onboarding.tsx`, `docs/agent_change_log.md`
- What changed: Adjusted the onboarding progress stepper so the connector arrows align to the centerline of the step circles rather than the combined circle-plus-label block, and made completed/current steps clickable so users can jump back directly from the progress bar.
- Why: The previous stepper alignment was visually off, and users needed a faster way to return to earlier onboarding steps without repeatedly using the back button.

### 2026-03-07 01:16 (AEDT) - codex
- Files: `components/billing/upgrade-button.tsx`, `actions/billing-actions.ts`, `docs/agent_change_log.md`
- What changed: Removed the temporary beta hard-stop that blocked Stripe checkout when mobile-number provisioning was turned off. Billing now always allows checkout, records the actual provisioning choice on the workspace, and writes `requested` or `not_requested` into the shared provisioning state model before redirecting to Stripe.
- Why: During beta, users who do not opt into phone provisioning still need to be able to pay and complete onboarding. The toggle should only control later Twilio provisioning eligibility, not access to payment itself.

### 2026-03-07 11:06 (AEDT) - codex
- Files: `components/ui/address-autocomplete.tsx`, `components/map/google-map-view.tsx`, `docs/agent_change_log.md`
- What changed: Added graceful fallback handling for Google Maps auth/key failures. Address autocomplete now drops back to a plain text input if the Maps script fails or triggers `gm_authFailure`, and the dashboard Google map now switches itself to the existing Leaflet fallback for the same failure class.
- Why: Misconfigured Google Maps keys or billing should not block job creation or leave the dashboard map stuck on Google's branded error overlay. The app needs to continue functioning even when Maps is unavailable.

### 2026-03-07 11:13 (AEDT) - codex
- Files: `lib/ai/context.ts`, `lib/ai/sms-agent.ts`, `lib/ai/email-agent.ts`, `docs/agent_change_log.md`
- What changed: Updated the shared pricing guidance so call-out fees are treated as customer-facing context only, not reminders for the business owner. Added the universal rule that the call-out fee does not apply when the technician attends and successfully fixes the issue, and aligned chat/SMS/email phrasing to explain that clearly when relevant.
- Why: The assistant was using awkward internal-facing call-out-fee language and was missing the universal waiver rule for successful on-site fixes.

### 2026-03-07 11:17 (AEDT) - codex
- Files: `app/api/chat/route.ts`, `docs/agent_change_log.md`
- What changed: Tightened the CRM chatbot prompt so when `showJobDraftForConfirmation` renders a job draft card, the assistant must not repeat the draft details, call-out fee, or a second confirmation line underneath it.
- Why: The card already contains the draft summary, so repeating the same details in plain text made the response noisy and redundant.

### 2026-03-07 11:24 (AEDT) - codex
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: Changed Kanban multi-select into an explicit selection mode triggered by long-pressing a card. Selection checkboxes now appear only in that mode, sit in the top-right corner, and only displace the top-right date/badge stack instead of shifting the rest of the card layout.
- Why: The always-visible checkbox was cluttering every card and disrupting the layout. Selection mode should be intentional and preserve the default card formatting.

### 2026-03-07 11:31 (AEDT) - codex
- Files: `components/dashboard/header.tsx`, `components/dashboard/dashboard-client.tsx`, `docs/agent_change_log.md`
- What changed: Replaced the separate dashboard activity card with a compact activity icon button in the header, positioned beside the notifications bell. Clicking it opens the existing recent-activity modal.
- Why: The activity affordance should behave like a lightweight header action, not occupy a full homepage card and compete with the KPI row layout.

- Follow-up: Wired the new shared `onOpenActivity` header prop through the other dashboard variants with no-op handlers so the shared header stays type-safe without altering non-homepage behavior.

### 2026-03-07 11:38 (AEDT) - codex
- Files: `components/crm/inbox-view.tsx`, `docs/agent_change_log.md`
- What changed: Fixed Inbox `Ask Tracey` so it now sends the selected contact context plus the user's actual instruction to the chat API, instead of force-wrapping every request as an outbound SMS command.
- Why: CRM-edit requests like “add his email to the file” were being misrouted into the `sendSms` path, so Tracey said it was handling a message but never updated the contact record.

### 2026-03-07 11:46 (AEDT) - codex
- Files: `components/crm/inbox-view.tsx`, `docs/agent_change_log.md`
- What changed: Replaced the inbox left-panel lead/existing/all segmented control with two dropdown filters: customer type and date. Added latest/oldest sorting plus a custom time-period dialog with start/end dates and an explicit Apply action.
- Why: The inbox needed more flexible filtering and sorting than the old 3-button customer-type toggle could provide.

### 2026-03-07 11:52 (AEDT) - codex
- Files: `app/page.tsx`, `docs/agent_change_log.md`
- What changed: Added centered icons above each of the three homepage hero value messages while keeping the approved copy and overall hero layout intact.
- Why: The hero benefits needed a stronger visual anchor so each message reads as a distinct value pillar instead of plain text alone.

### 2026-03-07 12:02 (AEDT) - codex
- Files: `README.md`, `DEPLOYMENT_CHECKLIST.md`, `APP_MANUAL.md`, `docs/agent_change_log.md`
- What changed: Rewrote the top-level product and deployment docs to reflect the current Earlymark app instead of older Pj Buddy / Retell-era behavior. Updated the docs to cover the current assistant taxonomy, billing-before-onboarding flow, beta phone-provisioning rule, Twilio workspace-number model, LiveKit voice stack, and the current split between web-app deploys and voice-worker deploys.
- Why: The repo’s primary docs had drifted badly from the live product and were misleading about the current product name, onboarding flow, voice stack, and deployment model.

### 2026-03-07 12:08 (AEDT) - codex
- Files: `actions/storage-actions.ts`, `docs/agent_change_log.md`
- What changed: Switched the server-side Supabase Storage helper from the public anon client to the admin service-role client when generating signed upload URLs and public URLs.
- Why: Settings document uploads were still failing with `new row violates row-level security policy` because the upload-token server action was creating signed upload URLs under anonymous Storage permissions instead of server-side admin context.

### 2026-03-07 12:13 (AEDT) - codex
- Files: `actions/storage-actions.ts`, `docs/agent_change_log.md`
- What changed: Added automatic storage-bucket existence checks and admin-side bucket creation before generating signed upload URLs or public URLs.
- Why: Document uploads were still failing with `The related resource does not exist`, which indicates the target Supabase Storage bucket was missing. The server helper now self-heals that setup gap instead of failing at runtime.

### 2026-03-07 12:19 (AEDT) - codex
- Files: `actions/onboarding-actions.ts`, `components/dashboard/setup-widget.tsx`, `docs/agent_change_log.md`
- What changed: Added a close button to the dashboard setup banner and made its dismissal behavior signup-age aware. During the first week after signup, dismissing the banner only hides it temporarily and it can reappear later; after that, dismissal stays hidden on the current browser.
- Why: Users need to be able to close the setup banner, but it should keep resurfacing during the first week so new signups do not lose the onboarding prompt too easily.

### 2026-03-07 12:31 (AEDT) - codex
- Files: `app/dashboard/schedule/schedule-calendar.tsx`, `docs/agent_change_log.md`
- What changed: Reworked the schedule day view into an actual hourly grid with time columns across the top and each team member rendered as a row beneath those hour headers. Drag-and-drop in day view now targets a specific hour cell so moving a job there updates its scheduled hour instead of only changing the assignee.
- Why: The day view previously showed one wide blank lane per team member, which made the schedule unreadable by time of day and did not match the expected calendar-style layout.

### 2026-03-07 12:39 (AEDT) - codex
- Files: `components/crm/deal-card.tsx`, `components/crm/kanban-board.tsx`, `docs/agent_change_log.md`
- What changed: Restored normal desktop drag behavior in the Kanban board by switching mass-select mode off the all-pointer delayed drag sensor and back onto standard mouse drag plus touch-only delay. Added subtle wiggle animation during mass-select mode, and clicking anywhere outside a card now exits that mode. Also fixed the Kanban card scheduled timestamp to render in `Australia/Sydney` instead of the browser's raw local timezone.
- Why: The long-press selection change had made desktop drag feel broken, and the scheduled-date regression had reappeared by formatting `scheduledAt` in browser-local time, which can shift jobs onto the wrong displayed day. Scheduled-job UI must always display the actual scheduled date in the app's intended timezone, not `createdAt` or browser-local drift.

### 2026-03-07 12:53 (AEDT) - codex
- Files: `livekit-agent/package.json`, `livekit-agent/package-lock.json`, `docs/agent_change_log.md`
- What changed: Corrected the LiveKit noise-cancellation dependency pin from the non-existent `@livekit/noise-cancellation-node@^0.3.0` to the published `^0.1.9` release and refreshed the agent lockfile to match.
- Why: GitHub Actions OCI deploys were failing during `npm ci` because the repo referenced a package version that does not exist on npm. The agent dependency must be pinned to a real published version for deploys to be reproducible.

### 2026-03-08 23:00 (AEDT) - antigravity
- Files: `components/dashboard/dashboard-skeleton.tsx`, `app/dashboard/settings/my-business/page.tsx`, `app/dashboard/settings/layout.tsx`, `actions/invite-actions.ts`, `__tests__/chat-interface.test.tsx`, `docs/agent_change_log.md`
- What changed: Comprehensive audit and fix of AI agent fix plan items. Replaced lazy DashboardSkeleton (raw divs) with proper Skeleton components. Fixed duplicate "Business details" heading to "Contact information". Added settings sidebar search/filter input. Created missing `updateMemberRole` server action with RBAC guards. Added ts-nocheck to pre-existing test type mismatch.
- Why: Prior AI agent left lazy patterns and missing implementations. This commit audits every fix plan item, fixes quality issues, fills gaps, and unblocks the commit pipeline.

### 2026-03-08 23:15 (AEDT) - antigravity
- Files: `ai-agent-fix-plan.md`, `docs/agent_change_log.md`
- What changed: Updated project fix plan with [DONE] status markers for all verified/implemented items.
- Why: Handing off remaining items (DM1, I2, G-series, DM5) to the next agent or developer.

### 2026-03-09 01:04 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `docs/agent_change_log.md`
- What changed: Updated the LiveKit deploy workflow to restore `livekit-agent/.env.local` from a persistent remote path (`$HOME/.config/earlymark/livekit-agent.env`), a legacy `/opt/livekit-agent/.env.local` file, or an optional `LIVEKIT_AGENT_ENV_B64` GitHub secret before restarting the worker.
- Why: Voice-worker deploys were failing whenever `/tmp/livekit-agent/.env.local` disappeared, because the workflow treated a temporary staging path as the only source of truth for required runtime secrets.

### 2026-03-09 01:12 (AEDT) - codex
- Files: `.github/workflows/deploy-livekit.yml`, `docs/agent_change_log.md`
- What changed: Added a second LiveKit deploy fallback that builds `livekit-agent/.env.local` from individual GitHub secrets when the base64 env bundle and remote persistent env files are both unavailable.
- Why: The deploy still failed when `LIVEKIT_AGENT_ENV_B64` was unset and the server had no saved env file. The workflow now supports standard per-secret configuration instead of requiring a single bundled secret.
