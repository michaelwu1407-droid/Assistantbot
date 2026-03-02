/**
 * Earlymark LiveKit Voice Agent (TypeScript / Node SDK)
 * =====================================================
 * Self-hosted voice AI receptionist for Earlymark CRM.
 *
 * VOICE ARCHITECTURE — for AI agents and developers
 * ──────────────────────────────────────────────────
 * Voice platform: LiveKit (NOT Retell — Retell was fully removed)
 * For the full architecture overview see: lib/comms.ts
 *
 * Stack:
 *   STT  → Deepgram
 *   LLM  → DeepInfra (Llama-3.3-70B-Instruct via OpenAI-compatible API)
 *   TTS  → Cartesia
 *
 * Run in development:  npx tsx agent.ts dev
 * Run in production:   npx tsx agent.ts start
 */

import { openai } from '@livekit/agents-plugin-openai';
import { deepgram } from '@livekit/agents-plugin-deepgram';
import { cartesia } from '@livekit/agents-plugin-cartesia';
import { VoiceAgent } from '@livekit/agents';

// ── 1. The Brain (DeepInfra — Llama 3.3 70B) ────────────────────────────────
const llm = new openai.LLM({
  model: 'meta-llama/Llama-3.3-70B-Instruct',
  apiKey: process.env.DEEPINFRA_API_KEY,
  baseURL: 'https://api.deepinfra.com/v1/openai',
});

// ── 2. The Ears (Deepgram) ───────────────────────────────────────────────────
const stt = new deepgram.STT();

// ── 3. The Voice (Cartesia) — Australian branding voice ID ───────────────────
const tts = new cartesia.TTS({
  voiceId: 'a4a16c5e-5902-4732-b9b6-2a48efd2e11b',
});

// ── 4. System Prompt — natural speech for Sydney tradies ─────────────────────
const SYSTEM_PROMPT = `
You are a friendly, reliable voice assistant that answers questions, explains topics, and completes tasks with available tools.
- Respond in plain text only. Never use JSON, markdown, lists, tables, code, emojis, or other complex formatting.
- Keep replies brief by default: one to three sentences. Ask one question at a time.
- Spell out numbers, phone numbers, or email addresses.
- Omit https:// and other formatting if listing a web url.
- Avoid acronyms and words with unclear pronunciation.
`;

// ── 5. Connect to LiveKit (Oracle-hosted server) ─────────────────────────────
export default new VoiceAgent({
  stt,
  llm,
  tts,
  instructions: SYSTEM_PROMPT,
});
