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
- **Deployment staging path**: Updated agent code is first copied to `/tmp/livekit-agent/` before deployment.
- **Current process model**: LiveKit core infrastructure runs in Docker under `/opt/livekit`, but the voice agent currently runs as a host process from `/tmp/livekit-agent` using `tsx agent.ts start`.
- **Automation model**: GitHub Actions should deploy by copying `livekit-agent/**` into `/tmp/livekit-agent` and restarting the host process there. Do not assume `/opt/livekit-agent` is a git checkout.
- **Core containers**: `livekit-livekit-1`, `livekit-redis-1`, `livekit-caddy-1`, and `livekit-sip`.
- **Restart policy**: Core containers use `--restart always` so they survive OCI reboots.
- **Primary SIP log source**: `sudo docker logs -f livekit-sip`
- **Primary agent log source**: `tail -f /tmp/agent.log`
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
