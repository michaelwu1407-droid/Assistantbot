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
import { AutoSubscribe, WorkerOptions, cli, defineAgent, voice, llm as livekitLlm } from '@livekit/agents';
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

Constraint: Keep responses short, punchy, and helpful. Do not yap.

Goal: Capture details/requests for the user and check availability.

IMPORTANT — Call Duration:
- At around 8 minutes you will receive an instruction to wrap up the call. Follow it naturally.
- The call will disconnect at 10 minutes maximum.

TRANSFER RULES:
- If a caller asks to speak to the business owner or a human, confirm first: "Just to confirm — you'd like me to transfer you to [the business owner]?"
- On confirmation, use the transfer_call tool. Do NOT transfer for general enquiries you can handle (quotes, booking, availability).`;

// ─── Agent Entry ────────────────────────────────────────────────────

export default defineAgent({
  entry: async (ctx) => {
    // Defines a tool for the agent to call when transferring to a human
    const transferCallTool: livekitLlm.ToolInfo = {
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

    const llmModel = process.env.VOICE_LLM_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
    const llm = new openai.LLM({
      model: llmModel,
      apiKey: process.env.DEEPINFRA_API_KEY,
      baseURL: 'https://api.deepinfra.com/v1/openai',
    });

    const stt = new deepgram.STT({
      model: 'nova-3',
    });

    const tts = new cartesia.TTS({
      model: 'sonic-3',
      voice: 'a4a16c5e-5902-4732-b9b6-2a48efd2e11b',
    });

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();

    const agent = new voice.Agent({
      instructions: SYSTEM_PROMPT,
      stt,
      llm,
      tts,
    });

    const session = new voice.AgentSession({});
    await session.start({
      agent,
      room: ctx.room,
      inputOptions: { participantIdentity: participant.identity },
    });

    // ── Initial greeting ────────────────────────────────────────────
    await session.generateReply({
      instructions:
        "Greet the caller briefly as Tracey, then ask what they need help with today.",
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
