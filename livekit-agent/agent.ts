/**
 * Earlymark LiveKit Voice Agent (TypeScript / Node SDK)
 * =====================================================
 * Canonical stack:
 *   STT  -> Deepgram Nova-3
 *   LLM  -> Groq Llama 3.3 70B (OpenAI-compatible endpoint)
 *   TTS  -> Cartesia Sonic 3
 *   Voice ID -> a4a16c5e-5902-4732-b9b6-2a48efd2e11b
 */

import { fileURLToPath } from 'node:url';
import * as openai from '@livekit/agents-plugin-openai';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import { AutoSubscribe, WorkerOptions, cli, defineAgent, voice } from '@livekit/agents';

const SYSTEM_PROMPT = `You are Tracey, a friendly and efficient AI receptionist for a trade business. Your job is to answer the phone, take messages, and book appointments for the tradie.

Identity: You are NOT 'Earlymark'. You work for the specific business being called.

Tone: Casual, professional, and Australian.

Constraint: Keep responses short, punchy, and helpful. Do not yap.

Goal: Capture details/requests for the user and check availability.`;

export default defineAgent({
  entry: async (ctx) => {
    const llm = openai.LLM.withGroq({
      model: 'llama-3.3-70b-versatile',
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

    const session = new voice.AgentSession();
    await session.start({
      agent,
      room: ctx.room,
      inputOptions: { participantIdentity: participant.identity },
    });

    await session.generateReply({
      instructions:
        "Greet the caller briefly as Tracey, then ask what they need help with today.",
    });
  },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
}
