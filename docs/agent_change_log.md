# Agent Change Log

Operational audit log for all AI agent code/config edits.  
Rule: every agent change commit must include an entry in this file.

## Entry Template

```md
### YYYY-MM-DD HH:MM (AEST/AEDT) - <agent>
- Files: `path/a`, `path/b`
- What changed: <concise summary>
- Why: <reason / expected outcome>
```

## Entries

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

