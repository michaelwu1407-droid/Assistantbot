# Agent Operating Truths

This file is the canonical source of truth for all AI agents operating in this repository.
If any other doc, comment, or code conflicts with this file, this file wins.

## Voice Agent Architecture (Canonical)

| Component | Specification |
| --- | --- |
| TTS (Text-to-Speech) | Cartesia Sonic 3 (`sonic-3` or `sonic-3-2026-01-12`) |
| STT (Speech-to-Text) | Deepgram Nova-3 |
| LLM (Logic) | Groq - Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| Voice ID | `a4a16c5e-5902-4732-b9b6-2a48efd2e11b` (Aussie Female) |

## Platform Decision

> **⛔ Retell AI and Vapi are ARCHIVED and INACTIVE. Do NOT use, reference, or re-enable them.**
> - All Retell webhook routes (`/api/retell/*`) return **410 Gone**.
> - The `create-retell-agent.ts` script is guarded with `process.exit(1)`.
> - There are no `RETELL_*` or `VAPI_*` environment variables in production.

- **Active voice stack**: LiveKit Agents + Deepgram (STT) + Groq (LLM) + Cartesia (TTS)
- **Active comms**: Twilio (SMS, phone provisioning, SIP trunking to LiveKit)
- See `lib/comms.ts` for full architecture documentation.
- See `livekit-agent/agent.ts` for the voice agent implementation.

## LiveKit Infra Context (Canonical)

- **Host environment**: Oracle Cloud (OCI) Ubuntu VM at `140.238.198.39`, SSH user `ubuntu`.
- **SSH ingress requirement**: TCP `22` must be open in both OCI security rules and the Ubuntu host firewall. GitHub Actions deploys can still fail with `Connection timed out during banner exchange` if OCI ingress is correct but host `iptables` silently drops new SSH sessions.
- **SSH firewall recovery**: If port `22` is reblocked on the host, restore it with `sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT` and immediately persist it with `sudo netfilter-persistent save`.
- **Deploy triage boundary**: If `journalctl -u ssh` shows accepted GitHub publickey sessions for `ubuntu`, stop debugging OCI ingress and host-firewall reachability. The remaining blocker is in the remote non-interactive shell/runtime path after login.
- **Deploy shell rule**: GitHub Actions deploy commands must not depend on `.bashrc`, `.profile`, prompt setup, or other interactive shell initialization. Bootstrap `PATH`, `node`, `npm`, `sudo`, and `systemd` access explicitly in remote non-interactive shells.
- **Deployment staging path**: The GitHub Actions worker deploy uploads a tarball to `/tmp/earlymark-agent-deploy-${GITHUB_SHA}.tgz` and extracts it into `/opt/earlymark-agent`.
- **Current process model**: Docker is the standardized deployment architecture for the LiveKit core voice infrastructure under `/opt/livekit` (LiveKit, Redis, Caddy, SIP). The current GitHub Actions worker deploy runs the voice workers as native `systemd` services from `/opt/earlymark-agent` using `npm run start:sales` and `npm run start:customer`.
- **Legacy split-worker units**: The old `tracey-sales-agent` and `tracey-customer-agent` unit files have been retired from the repo. The deploy workflow still disables and removes any lingering host copies of those units so legacy `/opt/tracey-agent` drift cannot reclaim the worker path.
- **Automation model**: GitHub Actions deploys `livekit-agent/**` by packaging that folder plus the canonical `earlymark-*.service` files, copying them to the OCI host, installing them into `/opt/earlymark-agent` and `/etc/systemd/system`, validating `/opt/earlymark-agent/.env.local`, reloading `systemd`, and restarting `earlymark-sales-agent` plus `earlymark-customer-agent`.
- **Deploy verification**: The workflow verifies deploy convergence through `/api/internal/voice-fleet-health` and falls back to `systemctl status` plus `journalctl` for `earlymark-sales-agent` and `earlymark-customer-agent` when the heartbeat check fails.
- **Heartbeat target**: Worker heartbeats post to `${NEXT_PUBLIC_APP_URL || APP_URL}/api/internal/voice-agent-status`. In production the worker now fails fast if neither `NEXT_PUBLIC_APP_URL` nor `APP_URL` is set, so `ECONNREFUSED 127.0.0.1:3000` should no longer appear as a silent production fallback.
- **Core containers**: `livekit-livekit-1`, `livekit-redis-1`, `livekit-caddy-1`, and `livekit-sip`.
- **Restart policy**: Core containers use `--restart always` so they survive OCI reboots.
- **Primary SIP log source**: `sudo docker logs -f livekit-sip`
- **Primary agent log source**: `sudo journalctl -u earlymark-sales-agent -u earlymark-customer-agent -n 80 --no-pager`
- **LiveKit config file**: `/etc/livekit.yaml`
- **LiveKit API key**: `APIAooiVTvuVU3w`
- **Local LiveKit URL**: `http://localhost:7880` for CLI commands and agent connections on the box.
- **RTC ports**: TCP `7881`, UDP `50000-60000`
- **TURN**: enabled on `turn.earlymark.ai` with TLS `5349` and UDP `3478`
- **Twilio trunk ID**: `TK9bdf6eb5a95851bb351be8b521287033`
- **SIP signaling**: Port `5060` is open and listening. Twilio origination points to `sip:live.earlymark.ai:5060`.
- **RTP/media**: UDP `10000-20000` must remain open in both OCI security lists and Ubuntu `iptables`, persisted via `netfilter-persistent`.
- **Inbound routing**: SIP dispatch rule `SDR_ZnXjWoZ3v4EC` automatically pushes inbound calls to rooms prefixed with `inbound_`.
- **Server layout note**: `/opt/livekit-agent` exists on the box but is not a git repository and does not contain the active deployable worker.

## Voice Agent Performance Notes

- **LLM target**: Llama `3.3 70B`, tuned for sub-`800ms` conversational latency.
- **STT endpointing target**: Deepgram endpointing tuned to `200ms` when balancing speed against unnatural interruptions.

## Voice Agent Regression Guardrails

- **Demo opener**: For `demo` calls, line 1 must be only `Hi, is this [name] from [business]?` via `session.say()`. After the caller answers, Tracey should then introduce herself as `Tracey from Earlymark AI`. Do not collapse those into one sentence again.
- **Australian delivery**: Tracey must stay Australian for the full call. Do not drift into US-style phrasing, cadence, or pronunciation cues as the conversation continues.
- **Latency ceiling**: Treat `llmTtftMs > 1200` as a regression for the demo flow. The March 6, 2026 demo-call log showed overlap and interruption once turn latency rose into the `1351-2276ms` range.
- **Turn shape**: Demo-call replies should stay short, especially immediately after the caller confirms identity. Long first replies increase talk-over risk on phone calls.
- **Lead capture timing**: Do not call `log_lead` immediately after the caller says only `yes` or confirms identity. Wait until there is enough real information to satisfy the schema and reflect genuine interest.
- **SIP audio safety**: Keep explicit remote-track subscription logging/handling in place for SIP demo calls. If logs show no `voice-user-turn` events after greeting, inspect `[TRACK] published/subscribed` first.

## Assistant Taxonomy (Canonical)

- **Tracey interview form**: Earlymark outbound demo assistant triggered from the website interview form.
- **Tracey inbound call**: Earlymark inbound sales assistant handling callers who ring Earlymark.
- **Tracey for users**: Assistant for Earlymark customers when handling that customer's callers or texts.
- **CRM chatbot**: Internal operator-facing assistant inside the CRM app.

## Customer-Contact Modes (Canonical)

- Canonical mode names are **execute**, **review & approve**, and **info only**.
- These modes apply to **Tracey for users** across both customer calls and customer texts.
- The **CRM chatbot** itself is not globally constrained by these 3 modes for internal CRM work.
- When the **CRM chatbot** is asked to contact a customer, it is acting as **Tracey for users**, so the current customer-contact mode applies.

## Voice Debug Start Rule

- Before any new voice-agent debugging session, read this file and inspect the latest `/tmp/agent.log` entries for `[voice-turn]`, `[voice-audit]`, `[voice-user-turn]`, and `[TRACK]` lines first.
- Treat the latest measured bottleneck as the starting point. Do not guess from prompts alone when logs already show whether the delay is in STT, LLM TTFT, or TTS.
- For inbound Earlymark calls, treat `llmTtftMs > 1200` or `ttsTtfbMs > 900` as a regression threshold worth fixing.

## Critical Surface Regression Rule

- Treat `app/page.tsx`, onboarding provisioning flow, and billing-to-provisioning handoff as critical surfaces. Do not do broad overwrite commits on these files without comparing against the last known-good accepted commit first.
- Homepage restores must start from the last accepted good commit for the relevant section, then re-apply newer approved copy changes on top. Do not partially fix a mixed file from memory.
- Twilio provisioning must stay centralized through `lib/onboarding-provision.ts`. Do not add or keep direct provisioning paths in onboarding actions, settings, or other side routes that bypass the billing gate and duplicate-provision checks.

## Mandatory Session Check

- Always run `tsc` to check for TypeScript compile errors in every session before finalizing code changes.

## Agent Change Logging (Mandatory)

- Every agent-authored code/config change must include a same-commit entry in `docs/agent_change_log.md`.
- Required fields per entry: timestamp (AEST/AEDT), agent name, files changed, summary of what changed, and why.
- If staged changes include code/config paths and no staged update to `docs/agent_change_log.md`, the commit must fail.
- `CHANGELOG.md` remains product-release facing; `docs/agent_change_log.md` is the operational audit log for all agent edits.

## Tracey System Prompt (Canonical)

"You are Tracey, a friendly and efficient AI receptionist for a trade business. Your job is to answer the phone, take messages, and book appointments for the tradie.

Identity: You are NOT 'Earlymark'. You work for the specific business being called.

Tone: Casual, professional, and Australian.

Constraint: Keep responses short, punchy, and helpful. Do not yap.

Goal: Capture details/requests for the user and check availability."

## Latency & Performance Guidelines (Critical)

The AI assistant must be highly responsive to maintain a natural conversation flow. Pay strict attention to "cold start" and "warm up" delays.

**Recent Findings & Optimizations (March 2026):**
1. **Middleware Overhead:** Do NOT call blocking DB operations (like `supabase.auth.getUser()`) in `middleware.ts` for `/api/*` routes. This adds 150-300ms of pre-processing lag. Next.js API routes natively extract auth securely.
2. **Parallel Preprocessing:** In `api/chat/route.ts`, `buildAgentContext` and `fetchMemoryContext` must run concurrently via `Promise.all()`. Database queries inside `buildAgentContext` must also run concurrently, including user role/auth lookups. No sequential waterfalls!
3. **Database Region:** The `DATABASE_URL` pooler must map to the same region as the Vercel function (`ap-southeast-2` / Sydney).
4. **Server-Timing Headers:** The chat API should return `Server-Timing` headers mapping the exact durations of `preprocessing`, `llm_startup`, and `tool_calls` for easy browser-based latency profiling.
5. **Tool Calls:** The `searchWorkspaceKnowledge` tool has been removed to drop a ~1.2s lag spike; context (rules, faqs, documents) is now aggressively injected into the system prompt during the `buildAgentContext` phase instead.
