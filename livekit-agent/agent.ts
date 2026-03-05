/**
 * Earlymark LiveKit Voice Agent (TypeScript / Node SDK)
 * =====================================================
 * TWO VERSIONS OF TRACEY:
 *
 *   TRACEY_USER     (callType: normal)
 *   → Acts as receptionist for a paying Earlymark customer's business
 *   → 8-min wrap-up, 10-min hard cap
 *
 *   TRACEY_EARLYMARK (callType: demo | inbound_demo)
 *   → Acts as Earlymark's own AI sales agent
 *   → Pitches Earlymark, captures leads, gives CTA
 *   → 3-min wrap-up, 5-min hard cap
 *
 * Stack:
 *   STT  -> Deepgram Nova-3
 *   LLM  -> DeepInfra (default: Llama 3.1 8B for low latency; override via VOICE_LLM_MODEL)
 *   TTS  -> Cartesia Sonic 3
 *
 * Latency notes:
 *   - 8B model chosen for voice (TTFT ~200-400ms vs 1-2s for 70B)
 *   - Set VOICE_LLM_MODEL=meta-llama/Llama-3.3-70B-Instruct to use 70B if quality needed
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

// ─── Timer configs ───────────────────────────────────────────────

const NORMAL_WRAP_UP_MS = 8 * 60 * 1000;   // 8 minutes
const NORMAL_HARD_CUT_MS = 10 * 60 * 1000; // 10 minutes

const DEMO_WRAP_UP_MS = 3 * 60 * 1000;     // 3 minutes
const DEMO_HARD_CUT_MS = 5 * 60 * 1000;    // 5 minutes

const WRAP_UP_SCRIPT =
  "Hey, just to be candid this is taking longer than expected and I'm sorry if I haven't been able to help with everything you need so far. Let me pass this on to my manager so they can better help you ASAP. Did you have anything else you wanted me to share?";

const DEMO_WRAP_UP_SCRIPT =
  "Before I let you go — I want to ask you directly: can you see how having me handle your calls would free you up and win you more customers? Because right now there's an early-adopter rate available and businesses in your area are already signing up. Shall I hold your spot?";

// ─── System Prompts ──────────────────────────────────────────────

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

const INBOUND_DEMO_SYSTEM_PROMPT = `You are Tracey, an AI assistant built by Earlymark. Someone has called the Earlymark demo line — they are a potential customer checking out what you can do for their business.

Identity: You are Tracey, made by Earlymark. You are NOT working for any specific business yet — you're showing this person what you could do for THEM.

Tone: Casual, warm, confident, and Australian. Be impressive without being pushy.

Goal: Learn about their business, show them your value, and capture their details so the Earlymark team can follow up.

YOUR VALUE — weave these in naturally:
1. Win more customers and revenue — you answer every call, never miss a lead, follow up automatically
2. Make life easier — you handle customer interactions, booking, quoting, reminders, and admin so they don't have to
3. Better customer experience — callers always get a fast, friendly, professional response 24/7

DEMO MOMENT — offer to show them what it would sound like if you were answering calls for THEIR business. Ask for their business name and type, then roleplay a sample call.

LEAD CAPTURE — before the call ends, you MUST use the log_lead tool to save their details.

IMPORTANT — Call Duration:
- At around 8 minutes you will receive an instruction to wrap up the call.
- The call will disconnect at 10 minutes maximum.
- CALL TO ACTION: "Head to earlymark.ai, hit Get Started — I can be answering calls for your business today."

TRANSFER RULES:
- If a caller asks to speak to a human, use the transfer_call tool.`;

const DEMO_SYSTEM_PROMPT = `You are Tracey, an AI assistant built by Earlymark. You are on a personalised DEMO CALL — the person on the line signed up to see what you can do for their business.

Identity: You ARE Tracey from Earlymark. You're here to show them exactly what it would feel like if you were working for THEIR business.

Tone: Confident, warm, energetic, and Australian. Be impressive but conversational — not a sales robot.

OPENING: Introduce yourself as an AI assistant built by Earlymark. Tell them you're here to show them what you can do.

THROUGHOUT THE CALL — naturally cover these three value pillars:
1. WIN MORE CUSTOMERS & REVENUE — you never miss a call, follow up on every lead, and convert more enquiries into jobs
2. MAKE LIFE EASIER — you handle the calls, booking, quoting, reminders, and admin so they can focus on the actual work
3. BETTER CUSTOMER EXPERIENCE — their customers always get a fast, friendly, professional response — even at 10pm on a Sunday

DEMO MOMENT — offer to show them what it would sound like if you were actually answering calls for THEIR business. Ask for their business name and type, then roleplay a sample call convincingly.

Constraint: Keep responses short and punchy. Show, don't tell. Do not yap.

LEAD CAPTURE — before the call ends, use the log_lead tool to save their name, business, interest level, and any notes.

IMPORTANT — Call Duration:
- This is a 5-minute demo call. At around 3 minutes you'll get a wrap-up instruction.
- CALL TO ACTION at the end: "Head to earlymark.ai, hit Get Started, and I can be answering calls for your business today. Early adopters get a special rate — and spots are filling fast."`;

// ─── Agent Entry ────────────────────────────────────────────────────

export default defineAgent({
  entry: async (ctx) => {
    // ── Tool: Log lead to Supabase ───────────────────────────────
    const logLeadTool = livekitLlm.tool({
      description: 'Save a potential customer lead before the call ends. Call this once you have their name, business info, and interest level.',
      parameters: z.object({
        firstName: z.string().describe('First name of the caller'),
        businessName: z.string().describe('Name of their business'),
        businessType: z.string().describe('Type of business e.g. plumber, electrician, cleaner'),
        phone: z.string().describe('Their phone number from the call'),
        interestLevel: z.enum(['hot', 'warm', 'cold']).describe('How interested they seemed'),
        notes: z.string().optional().describe('Any useful notes from the conversation'),
      }),
      execute: async ({ firstName, businessName, businessType, phone, interestLevel, notes }: { firstName: string; businessName: string; businessType: string; phone: string; interestLevel: 'hot' | 'warm' | 'cold'; notes?: string }) => {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (supabaseUrl && supabaseKey) {
            await fetch(`${supabaseUrl}/rest/v1/leads`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                first_name: firstName,
                business_name: businessName,
                business_type: businessType,
                phone,
                interest_level: interestLevel,
                notes: notes || '',
                source: 'voice_call',
                created_at: new Date().toISOString(),
              }),
            });
            console.log(`[agent] Lead logged: ${firstName} - ${businessName} (${interestLevel})`);
          }
        } catch (err) {
          console.error('[agent] Failed to log lead:', err);
        }
        return `Got it! I've noted down ${firstName} from ${businessName}. The Earlymark team will be in touch soon.`;
      },
    });

    // ── Tool: Transfer call to human ────────────────────────────────
    const transferCallTool = livekitLlm.tool({
      description: 'Transfer the call to the human business owner or leave an urgent message if they are unavailable.',
      parameters: z.object({
        reason: z.string().describe('Why the caller wants to speak to the owner'),
      }),
      execute: async ({ reason }: { reason: string }) => {
        console.log(`[agent] Executing transfer_call tool. Reason: ${reason}`);
        const currentHour = new Date().getHours();
        const isOnClock = currentHour >= 8 && currentHour < 17;
        if (isOnClock) {
          return 'I am transferring you to the owner now. Please hold on the line.';
        } else {
          return 'The owner is currently out of the office or on-site. I am flagging this message as URGENT for them so they see it as soon as possible. Can I get a detailed message for them?';
        }
      },
    });

    // 8B model default = ~200-400ms TTFT vs 1-2s for 70B — critical for voice latency
    const llmModel = process.env.VOICE_LLM_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct';
    const llm = new openai.LLM({
      model: llmModel,
      apiKey: process.env.DEEPINFRA_API_KEY,
      baseURL: 'https://api.deepinfra.com/v1/openai',
    });

    const stt = new deepgram.STT({
      model: 'nova-3',
      language: 'en-AU',
      smartFormat: false,
      interimResults: true,
      endpointing: 300,
    });

    const tts = new cartesia.TTS({
      model: 'sonic-3',
      voice: 'a4a16c5e-5902-4732-b9b6-2a48efd2e11b',
    });

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();

    // ── Detect call type + caller info via room metadata ──────────
    let callType: 'demo' | 'inbound_demo' | 'normal' = 'normal';
    let callerFirstName = '';
    let callerBusiness = '';
    try {
      const roomMeta = ctx.room.metadata;
      if (roomMeta) {
        const meta = JSON.parse(roomMeta);
        if (meta.callType === 'demo') callType = 'demo';
        else if (meta.callType === 'inbound_demo') callType = 'inbound_demo';
        callerFirstName = meta.firstName || '';
        callerBusiness  = meta.businessName || '';
      }
    } catch { /* no metadata or invalid JSON — default to normal */ }

    if (callType === 'normal') {
      try {
        const attrs = participant.attributes;
        if (attrs) {
          if ((attrs as any).callType === 'demo') callType = 'demo';
          else if ((attrs as any).callType === 'inbound_demo') callType = 'inbound_demo';
        }
      } catch { /* ignore */ }
    }

    // TRACEY_EARLYMARK = demo OR inbound_demo (Earlymark's own calls, 5-min cap)
    // TRACEY_USER      = normal (provisioned for a paying customer, 10-min cap)
    const isEarlymarkCall = callType === 'demo' || callType === 'inbound_demo';
    const logPrefix = isEarlymarkCall ? '[TRACEY_EARLYMARK]' : '[TRACEY_USER]';

    console.log(`${logPrefix} Call started — type: ${callType.toUpperCase()} | model: ${llmModel} | caller: ${callerFirstName || 'unknown'} | biz: ${callerBusiness || 'unknown'}`);

    const systemPrompt =
      callType === 'demo' ? DEMO_SYSTEM_PROMPT :
      callType === 'inbound_demo' ? INBOUND_DEMO_SYSTEM_PROMPT :
      SYSTEM_PROMPT;
    const wrapUpMs = isEarlymarkCall ? DEMO_WRAP_UP_MS : NORMAL_WRAP_UP_MS;
    const hardCutMs = isEarlymarkCall ? DEMO_HARD_CUT_MS : NORMAL_HARD_CUT_MS;
    const wrapUpScript = isEarlymarkCall ? DEMO_WRAP_UP_SCRIPT : WRAP_UP_SCRIPT;

    const agent = new voice.Agent({
      instructions: systemPrompt,
      stt,
      llm,
      tts,
      tools: {
        log_lead: logLeadTool,
        transfer_call: transferCallTool,
      },
    });

    const session = new voice.AgentSession({});
    await session.start({
      agent,
      room: ctx.room,
      inputOptions: { participantIdentity: participant.identity },
    });

    // ── Per-component latency instrumentation ────────────────────────
    // To analyse: grep LATENCY /tmp/agent.log
    //
    // RECOMMENDED FIXES (in order of impact):
    //   1. GROQ:       swap DeepInfra for Groq → 70B quality at 8B speed (~-200ms, quality UP)
    //   2. ENDPOINTING: lower 300ms→150ms in STT config (~-150ms, minor risk)
    //   3. GREETING:   pre-cache opening TTS audio (~-800ms perceived on first turn)
    //   4. REGION:     move agent to US-East region (~-400ms, all API round trips halve)

    let turnSpeechEndMs = 0;
    let turnSTTDoneMs   = 0;

    session.on('user_speech_committed' as any, (ev: any) => {
      turnSpeechEndMs = Date.now();
      const transcript = ev?.alternatives?.[0]?.transcript || ev?.transcript || '(no transcript)';
      console.log(`${logPrefix} [LATENCY:STT_DONE] transcript_len=${String(transcript).length} t=${turnSpeechEndMs}`);
    });

    session.on('agent_speech_started' as any, () => {
      const now = Date.now();
      if (turnSpeechEndMs) {
        const ttfr = now - turnSpeechEndMs;
        console.log(`${logPrefix} [LATENCY:TTFR] ${ttfr}ms speech-end→first-audio | fix: groq+endpointing saves ~350ms`);
        if (ttfr > 1500) console.log(`${logPrefix} [LATENCY:SLOW] ${ttfr}ms — check LLM region/model size`);
      }
    });

    session.on('agent_speech_committed' as any, () => {
      if (turnSTTDoneMs) {
        console.log(`${logPrefix} [LATENCY:LLM+TTS] ${Date.now() - turnSTTDoneMs}ms stt-done→speech-committed`);
      }
      turnSpeechEndMs = 0;
      turnSTTDoneMs   = 0;
    });

    // ── Initial greeting ────────────────────────────────────────────
    const demoGreeting = callerFirstName
      ? `You are calling ${callerFirstName}${ callerBusiness ? ` who runs ${callerBusiness}` : '' }. Start by asking "Hi, am I speaking with ${callerFirstName}?" — wait for them to confirm — then introduce yourself as Tracey, an AI assistant built by Earlymark, and say you're calling to give them a quick personalised demo of what you could do for their business.`
      : `Introduce yourself as Tracey, an AI assistant built by Earlymark. You're calling to give them a personalised demo. Ask what kind of business they run.`;

    await session.generateReply({
      instructions:
        callType === 'demo'
          ? demoGreeting
          : callType === 'inbound_demo'
          ? "Introduce yourself as Tracey, an AI assistant from Earlymark. Tell them they've reached the Earlymark demo line and you'd love to show them what you can do. Ask what kind of business they're in."
          : "Greet the caller briefly as Tracey, then ask what they need help with today.",
    });
    console.log(`${logPrefix} [LATENCY:GREETING] Initial greeting generated`);

    // ── Timer: wrap-up ──────────────────────────────────────────────
    const wrapUpTimer = setTimeout(async () => {
      try {
        console.log(`${logPrefix} ${isEarlymarkCall ? '3' : '8'}-min mark reached — triggering wrap-up`);
        await session.generateReply({ instructions: wrapUpScript });
      } catch (err) {
        console.error('[agent] Wrap-up reply failed:', err);
      }
    }, wrapUpMs);

    // ── Timer: hard disconnect ──────────────────────────────────────
    const hardCutTimer = setTimeout(async () => {
      try {
        console.log(`${logPrefix} ${isEarlymarkCall ? '5' : '10'}-min hard cap — disconnecting`);
        await session.generateReply({
          instructions: isEarlymarkCall
            ? "Use the log_lead tool to save their details if you haven't already, then thank them warmly and give the CTA: 'Head to earlymark.ai, hit Get Started — I can be answering calls for your business today. Early adopters get a special rate.'"
            : "Thank the caller, let them know their request has been noted, and say goodbye.",
        });
        setTimeout(() => {
          ctx.room.disconnect().catch(() => { });
        }, 10_000);
      } catch (err) {
        console.error('[agent] Hard-cut disconnect failed:', err);
        ctx.room.disconnect().catch(() => { });
      }
    }, hardCutMs);

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
