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
