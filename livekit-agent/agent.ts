/**
 * Earlymark LiveKit Voice Agent (TypeScript / Node SDK)
 * =====================================================
 * Canonical stack:
 *   STT  -> Deepgram Nova-3
 *   LLM  -> Groq Llama 3.3 70B (OpenAI-compatible endpoint)
 *   TTS  -> Cartesia Sonic 3
 *   Voice ID -> a4a16c5e-5902-4732-b9b6-2a48efd2e11b
 *
 * Features:
 *   - 8-min wrap-up warning + 10-min hard disconnect
 *   - Human handoff tool (on-clock → Twilio dial, off-clock → urgent CRM flag)
 */

import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import * as openai from '@livekit/agents-plugin-openai';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import { AutoSubscribe, WorkerOptions, cli, defineAgent, voice } from '@livekit/agents';
import { z } from 'zod';

loadEnv({ path: '.env.local' });

// ─── Constants ──────────────────────────────────────────────────────

const WRAP_UP_MS = 8 * 60 * 1000;   // 8 minutes
const HARD_CUT_MS = 10 * 60 * 1000; // 10 minutes

const WRAP_UP_SCRIPT =
  "Hey, just to be candid this is taking longer than expected and I'm sorry if I haven't been able to help with everything you need so far. Let me pass this on to my manager so they can better help you ASAP. Did you have anything else you wanted me to share?";

const SYSTEM_PROMPT = `You are Tracey, a friendly and efficient AI receptionist for a trade business. Your job is to answer the phone, take messages, and book appointments for the tradie.

Identity: You are NOT 'Earlymark'. You work for the specific business being called.

Tone: Casual, professional, and Australian.
Accent + Locale:
- Always use Australian English style and wording.
- Do NOT drift into US wording or pronunciation cues.
- Keep the same Australian speaking style for the full call.

Constraint: Keep responses short, punchy, and helpful. Do not yap.

Goal: Capture details/requests for the user and check availability.

IMPORTANT — Call Duration:
- At around 8 minutes you will receive an instruction to wrap up the call. Follow it naturally.
- The call will disconnect at 10 minutes maximum.

TRANSFER RULES:
- If a caller asks to speak to the business owner or a human, confirm first: "Just to confirm — you'd like me to transfer you to [the business owner]?"
- On confirmation, use the transfer_call tool. Do NOT transfer for general enquiries you can handle (quotes, booking, availability).`;

type LatencyAudit = {
  sttMs: number[];
  llmMs: number[];
  llmTtftMs: number[];
  ttsMs: number[];
  ttsTtfbMs: number[];
  eouMs: number[];
  transcriptionDelayMs: number[];
};

function avg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function p95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round(sorted[index]);
}

function isMeaningfulUserTurn(rawTranscript: string): boolean {
  const transcript = rawTranscript.trim().toLowerCase();
  if (!transcript) return false;
  if (!/[a-z0-9]/i.test(transcript)) return false;

  const normalized = transcript.replace(/[^a-z0-9\s']/gi, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return false;

  const allowedShort = new Set(["yes", "no", "yeah", "yep", "nope", "ok", "okay", "sure"]);
  if (allowedShort.has(normalized)) return true;

  const filler = new Set(["uh", "um", "ah", "er", "erm", "hmm", "mm", "mhm", "huh"]);
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 1 && filler.has(tokens[0])) return false;

  return normalized.length >= 4 || tokens.length >= 2;
}

// ─── Agent Entry ────────────────────────────────────────────────────

export default defineAgent({
  entry: async (ctx) => {
    // Defines a tool for the agent to call when transferring to a human
    const transferCallTool = {
      name: "transfer_call",
      description: "Transfer the call to the human business owner or leave an urgent message if they are unavailable.",
      parameters: z.object({
        reason: z.string().describe("Why the caller wants to speak to the owner"),
      }),
      execute: async ({ reason }) => {
        console.log(`[agent] Executing transfer_call tool. Reason: ${reason}`);

        // In a full implementation, we would query the Earlymark API.
        // For the agent worker, we return a simulated/fallback instruction
        // since we are not directly connected to the Prisma DB in the worker scope.

        const currentHour = new Date().getHours();
        const isOnClock = currentHour >= 8 && currentHour < 17; // Mock 8am to 5pm

        if (isOnClock) {
          // If Twilio SIP REFER or <Dial> bridging is set up on the PBX side:
          return "I am transferring you to the owner now. Please hold on the line.";
        } else {
          return "The owner is currently out of the office or on-site. I am flagging this message as URGENT for them so they see it as soon as possible. Can I get a detailed message for them?";
        }
      },
    };

    const llmProvider = (process.env.VOICE_LLM_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "deepinfra")).toLowerCase();
    const llmModel = process.env.VOICE_LLM_MODEL || (llmProvider === "groq" ? "llama-3.3-70b-versatile" : "meta-llama/Meta-Llama-3.1-8B-Instruct");
    const llmApiKey = llmProvider === "groq" ? process.env.GROQ_API_KEY : process.env.DEEPINFRA_API_KEY;
    const llmBaseURL = llmProvider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.deepinfra.com/v1/openai";
    if (!llmApiKey) {
      throw new Error(`[agent] Missing API key for provider '${llmProvider}'.`);
    }

    const llm = new openai.LLM({
      model: llmModel,
      apiKey: llmApiKey,
      baseURL: llmBaseURL,
    });

    const stt = new deepgram.STT({
      model: (process.env.VOICE_STT_MODEL as any) || 'nova-3',
      language: process.env.VOICE_STT_LANGUAGE || "en-AU",
      interimResults: false,
      endpointing: Number(process.env.VOICE_STT_ENDPOINTING_MS || 350),
      noDelay: true,
      punctuate: true,
      smartFormat: true,
    });

    const tts = new cartesia.TTS({
      model: process.env.VOICE_TTS_MODEL || "sonic-3",
      voice: process.env.VOICE_TTS_VOICE_ID || "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
      language: process.env.VOICE_TTS_LANGUAGE || "en-AU",
      chunkTimeout: Number(process.env.VOICE_TTS_CHUNK_TIMEOUT_MS || 3000),
    });

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();

    const agent = new voice.Agent({
      instructions: SYSTEM_PROMPT,
      stt,
      llm,
      tts,
      tools: {
        transfer_call: transferCallTool,
      },
      turnDetection: "vad",
      minConsecutiveSpeechDelay: Number(process.env.VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS || 300),
    });

    const latencyAudit: LatencyAudit = {
      sttMs: [],
      llmMs: [],
      llmTtftMs: [],
      ttsMs: [],
      ttsTtfbMs: [],
      eouMs: [],
      transcriptionDelayMs: [],
    };

    const session = new voice.AgentSession({
      turnDetection: "vad",
      voiceOptions: {
        preemptiveGeneration: true,
        minEndpointingDelay: Number(process.env.VOICE_MIN_ENDPOINTING_DELAY_MS || 280),
        maxEndpointingDelay: Number(process.env.VOICE_MAX_ENDPOINTING_DELAY_MS || 1200),
        minInterruptionDuration: Number(process.env.VOICE_MIN_INTERRUPTION_DURATION_MS || 400),
        minInterruptionWords: Number(process.env.VOICE_MIN_INTERRUPTION_WORDS || 2),
        allowInterruptions: true,
      },
    });
    await session.start({
      agent,
      room: ctx.room,
      inputOptions: { participantIdentity: participant.identity },
    });

    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      const metrics = ev.metrics as any;
      if (!metrics?.type) return;
      switch (metrics.type) {
        case "stt_metrics":
          latencyAudit.sttMs.push(Number(metrics.durationMs || 0));
          break;
        case "llm_metrics":
          latencyAudit.llmMs.push(Number(metrics.durationMs || 0));
          latencyAudit.llmTtftMs.push(Number(metrics.ttftMs || 0));
          break;
        case "tts_metrics":
          latencyAudit.ttsMs.push(Number(metrics.durationMs || 0));
          latencyAudit.ttsTtfbMs.push(Number(metrics.ttfbMs || 0));
          break;
        case "eou_metrics":
          latencyAudit.eouMs.push(Number(metrics.endOfUtteranceDelayMs || 0));
          latencyAudit.transcriptionDelayMs.push(Number(metrics.transcriptionDelayMs || 0));
          break;
      }
      console.log(`[voice-metric] ${JSON.stringify(metrics)}`);
    });

    // Prevent silence/noise from becoming a real user turn that triggers assistant replies.
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      if (!ev.isFinal) return;
      const transcript = (ev.transcript || "").trim();
      if (!isMeaningfulUserTurn(transcript)) {
        console.log(`[voice-filter] Dropping low-signal transcript: "${transcript}"`);
        session.clearUserTurn();
      }
    });

    // ── Initial greeting ────────────────────────────────────────────
    await session.say("G'day, you've reached Tracey. How can I help today?", {
      allowInterruptions: true,
      addToChatCtx: true,
    });

    // ── Timer: 8-min wrap-up ────────────────────────────────────────
    const wrapUpTimer = setTimeout(async () => {
      try {
        console.log('[agent] 8-min mark reached — triggering wrap-up');
        await session.generateReply({ instructions: WRAP_UP_SCRIPT });
      } catch (err) {
        console.error('[agent] Wrap-up reply failed:', err);
      }
    }, WRAP_UP_MS);

    // ── Timer: 10-min hard disconnect ───────────────────────────────
    const hardCutTimer = setTimeout(async () => {
      try {
        console.log('[agent] 10-min mark reached — disconnecting');
        await session.generateReply({
          instructions: "Thank the caller for their time, let them know their message will be passed on, and say goodbye.",
        });
        // Give 10 seconds for the goodbye, then force close
        setTimeout(() => {
          ctx.room.disconnect().catch(() => { });
        }, 10_000);
      } catch (err) {
        console.error('[agent] Hard-cut disconnect failed:', err);
        ctx.room.disconnect().catch(() => { });
      }
    }, HARD_CUT_MS);

    // Clean up timers when room disconnects naturally
    ctx.room.on('disconnected', () => {
      clearTimeout(wrapUpTimer);
      clearTimeout(hardCutTimer);
      console.log(
        `[voice-audit] ${JSON.stringify({
          room: ctx.room.name,
          participant: participant.identity,
          samples: {
            stt: latencyAudit.sttMs.length,
            llm: latencyAudit.llmMs.length,
            tts: latencyAudit.ttsMs.length,
            eou: latencyAudit.eouMs.length,
          },
          latency: {
            sttAvgMs: avg(latencyAudit.sttMs),
            llmAvgMs: avg(latencyAudit.llmMs),
            llmP95Ms: p95(latencyAudit.llmMs),
            llmTtftAvgMs: avg(latencyAudit.llmTtftMs),
            ttsAvgMs: avg(latencyAudit.ttsMs),
            ttsP95Ms: p95(latencyAudit.ttsMs),
            ttsTtfbAvgMs: avg(latencyAudit.ttsTtfbMs),
            eouAvgMs: avg(latencyAudit.eouMs),
            transcriptionDelayAvgMs: avg(latencyAudit.transcriptionDelayMs),
          },
        })}`
      );
    });
  },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(
    new WorkerOptions({
      agent: fileURLToPath(import.meta.url),
      numIdleProcesses: 1,
      initializeProcessTimeout: 60_000,
    }),
  );
}
