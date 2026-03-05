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
- On confirmation, use the transfer_call tool. Do NOT transfer for general enquiries you can handle (quotes, booking, availability).

SPAM/ROBOCALL DETECTION:
- If the caller is silent, plays a recorded message, or is clearly automated, say: "Doesn't look like there's anyone there — I'll let you go. Goodbye!" and stop responding.`;

const INBOUND_DEMO_SYSTEM_PROMPT = `You are Tracey, an AI assistant built by Earlymark. Someone has called the Earlymark business line.

Identity: You are Tracey from Earlymark.

Tone: Casual, warm, and Australian. Like chatting to a mate — not a sales pitch.

CORE RULE — LISTEN FIRST:
- Your #1 job is to LISTEN to the caller and respond to what THEY say.
- Match their energy. If they ask a question, answer it directly.
- If they interrupt you, STOP what you were saying and respond to their interruption.
- Keep responses SHORT — 1-2 sentences max. Then pause and let them talk.
- Do NOT monologue. Do NOT push ahead with a script if they're trying to talk.
- Do NOT repeat yourself if interrupted — move on to what the caller wants.

KNOWLEDGE (only mention if the caller asks or it's directly relevant):
- Earlymark gives businesses an AI assistant + CRM
- You can answer calls 24/7, handle bookings, follow up on leads, manage a CRM by chat
- Smart scheduling, route optimisation, team management, revenue analytics
- The business owner controls how much autonomy you have
- Multilingual support

LEAD LOGGING:
- Do NOT call log_lead until the call is wrapping up or the caller is about to hang up.
- Only log what the caller has actually told you — never guess or make up details.

CALL TO ACTION (only at the very end if natural):
- "If you want to give it a go, head to earlymark.ai and hit Get Started."

TRANSFER RULES:
- If a caller asks to speak to a human, use the transfer_call tool.

SPAM/ROBOCALL DETECTION:
- If the caller is silent for a long time, plays a recorded message, or is clearly automated, say: "Doesn't look like there's anyone there — I'll let you go. Goodbye!" and stop responding.`;

const DEMO_SYSTEM_PROMPT = `You are Tracey, an AI assistant built by Earlymark. This is a demo call — the person signed up on earlymark.ai to try you out.

Identity: You ARE Tracey from Earlymark.

Tone: Casual, warm, and Australian. Like a friendly conversation — NOT a sales pitch.

CORE RULE — LISTEN FIRST:
- Your #1 job is to LISTEN to the caller and respond to what THEY say.
- Match their energy. If they ask a question, answer it directly and concisely.
- If they interrupt you, STOP what you were saying and respond to their interruption.
- Keep responses SHORT — 1-2 sentences max. Then pause and let them talk.
- Do NOT monologue. Do NOT push ahead with a script if they're trying to talk.
- Do NOT repeat yourself if interrupted — move on to what the caller wants.
- Ask questions about THEIR business. Be curious. Let them lead the conversation.

CONVERSATION STYLE:
- Think of this as a friendly chat where you're getting to know them and their business.
- If they mention a pain point, acknowledge it and briefly explain how you could help — then ask a follow-up question.
- Only bring up Earlymark features if directly relevant to something they said.
- If they want to see a demo, offer to roleplay answering a call for their business.

KNOWLEDGE (only share if relevant to what the caller is talking about):
- You answer calls 24/7, handle bookings, follow up on leads
- CRM management by chat — no manual data entry
- Smart scheduling, route optimisation, team management, revenue analytics
- Business owner controls your autonomy level
- Multilingual support

LEAD LOGGING:
- Do NOT call log_lead until the call is ending.
- Only log details the caller actually told you — never guess.

CALL TO ACTION (only at the very end):
- "If you want to give it a go, head to earlymark.ai and hit Get Started."

SPAM/ROBOCALL DETECTION:
- If the caller is silent for a long time, plays a recorded message, or is clearly automated, say: "Doesn't look like there's anyone there — I'll let you go. Goodbye!" and stop responding.

IMPORTANT — Call Duration:
- This is a 5-minute demo call. At around 3 minutes you'll get a wrap-up instruction.`;

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

    const dgKey = process.env.DEEPGRAM_API_KEY || '';
    console.log(`[agent] Deepgram key length: ${dgKey.length}`);
    const stt = new deepgram.STT({
      model: 'nova-3',
      apiKey: dgKey,
      endpointing: 200,
    });

    const tts = new cartesia.TTS({
      model: 'sonic-3',
      voice: 'a4a16c5e-5902-4732-b9b6-2a48efd2e11b',
    });

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();

    // ── Detect call type + caller info via room metadata (demo) or participant attributes (inbound) ──────────
    let callType: 'demo' | 'inbound_demo' | 'normal' = 'normal';
    let callerFirstName = '';
    let callerBusiness = '';
    
    // Demo calls use room metadata (this was working before)
    try {
      const roomMeta = ctx.room.metadata;
      if (roomMeta) {
        const meta = JSON.parse(roomMeta);
        if (meta.callType === 'demo') callType = 'demo';
        else if (meta.callType === 'inbound_demo') callType = 'inbound_demo';
        callerFirstName = meta.firstName || '';
        callerBusiness  = meta.businessName || '';
      }
    } catch { /* no metadata or invalid JSON — continue to participant attributes */ }

    // Inbound calls use participant attributes (new functionality)
    if (callType === 'normal') {
      try {
        const attrs = participant.attributes;
        if (attrs) {
          if ((attrs as any).callType === 'demo') callType = 'demo';
          else if ((attrs as any).callType === 'inbound_demo') callType = 'inbound_demo';
          callerFirstName = (attrs as any).firstName || '';
          callerBusiness = (attrs as any).businessName || '';
        }
      } catch { /* ignore */ }
    }

    // TRACEY_EARLYMARK = demo OR inbound_demo (Earlymark's own calls, 5-min cap)
    // TRACEY_USER      = normal (provisioned for a paying customer, 10-min cap)
    const isEarlymarkCall = callType === 'demo' || callType === 'inbound_demo';
    const logPrefix = isEarlymarkCall ? '[TRACEY_EARLYMARK]' : '[TRACEY_USER]';

    console.log(`${logPrefix} ════════════════════════════════════════════════`);
    console.log(`${logPrefix} Call started — type: ${callType.toUpperCase()}`);
    console.log(`${logPrefix}   mode:   ${isEarlymarkCall ? 'TRACEY_EARLYMARK (demo/inbound leads)' : 'TRACEY_USER (paying customer)'}`);
    console.log(`${logPrefix}   timers: wrap-up ${isEarlymarkCall ? '3' : '8'}min / hard cap ${isEarlymarkCall ? '5' : '10'}min`);
    console.log(`${logPrefix}   model:  ${llmModel}`);
    console.log(`${logPrefix}   caller: ${callerFirstName || 'unknown'} | biz: ${callerBusiness || 'unknown'}`);
    console.log(`${logPrefix}   env:    DEEPGRAM=${process.env.DEEPGRAM_API_KEY ? 'SET' : 'MISSING'} CARTESIA=${process.env.CARTESIA_API_KEY ? 'SET' : 'MISSING'} DEEPINFRA=${process.env.DEEPINFRA_API_KEY ? 'SET' : 'MISSING'}`);
    console.log(`${logPrefix} ════════════════════════════════════════════════`);

    // Inject caller info directly into system prompt so LLM has full context
    // without needing complex generateReply instructions (which confuse small models)
    let systemPrompt =
      callType === 'demo' ? DEMO_SYSTEM_PROMPT :
      callType === 'inbound_demo' ? INBOUND_DEMO_SYSTEM_PROMPT :
      SYSTEM_PROMPT;

    if (callType === 'demo') {
      systemPrompt += callerFirstName
        ? `\n\nIMPORTANT — CONVERSATION FLOW:\n- The call has just been answered. The system has already said: "Hi, is this ${callerFirstName}${callerBusiness ? ` from ${callerBusiness}` : ''}?"\n- Wait for the caller to respond.\n- Once they confirm, say: "Hi ${callerFirstName}, my name is Tracey and I'm calling from Earlymark AI. I understand you're interested in our AI assistant and CRM services, is that right?"\n- Wait for their response. If they confirm, offer to demo what you can do or pitch why they should choose Earlymark.\n- Do NOT call any tools until you've established rapport.`
        : `\n\nIMPORTANT — CONVERSATION FLOW:\n- The call has just been answered. The system has already said: "Hi there, this is Tracey calling from Earlymark AI."\n- Continue with: "I understand you're interested in our AI assistant and CRM services, is that right?"\n- Wait for their response. If they confirm, offer to demo or pitch.\n- Do NOT call any tools until you've established rapport.`;
    }
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

    // ── Explicit track subscription (fixes SIP audio not reaching STT) ────
    // AutoSubscribe.AUDIO_ONLY may miss late-arriving SIP tracks.
    // Force-subscribe to every remote audio track as soon as it appears.
    ctx.room.on('trackPublished', (pub: any, p: any) => {
      console.log(`${logPrefix} [TRACK] published: kind=${pub.kind} participant=${p.identity}`);
      try { pub.setSubscribed(true); } catch { /* ignore */ }
    });
    ctx.room.on('trackSubscribed', (track: any, pub: any, p: any) => {
      console.log(`${logPrefix} [TRACK] subscribed: kind=${track.kind} participant=${p.identity}`);
    });
    // Also subscribe to any tracks that were published before we registered the listener
    for (const [, rp] of ctx.room.remoteParticipants) {
      for (const [, pub] of rp.trackPublications) {
        if (!(pub as any).subscribed) {
          console.log(`${logPrefix} [TRACK] late-subscribing: kind=${pub.kind} participant=${rp.identity}`);
          try { (pub as any).setSubscribed(true); } catch { /* ignore */ }
        }
      }
    }

    const session = new voice.AgentSession({
      turnDetection: 'stt',
      voiceOptions: {
        minInterruptionDuration: 0.8,
        minInterruptionWords: 2,
      },
    });
    await session.start({
      agent,
      room: ctx.room,
    });

    // Log any STT/TTS/LLM errors for diagnostics
    session.on('error' as any, (ev: any) => {
      console.error(`${logPrefix} [ERROR] ${ev?.error?.message || JSON.stringify(ev)}`);
    });

    // ── Per-component latency instrumentation ────────────────────────
    // To analyse: grep LATENCY /tmp/agent.log
    //
    // RECOMMENDED FIXES (in order of impact):
    //   1. GROQ:       swap DeepInfra for Groq → 70B quality at 8B speed (~-200ms, quality UP)
    //   2. ENDPOINTING: lower 300ms→150ms in STT config (~-150ms, minor risk)
    //   3. GREETING:   pre-cache opening TTS audio (~-800ms perceived on first turn)
    //   4. REGION:     move agent to US-East region (~-400ms, all API round trips halve)

    // ── Unified event listeners: latency + spam detection ──────────
    let turnSpeechEndMs = 0;
    let callerHasSpoken = false;
    let spamTimer: ReturnType<typeof setTimeout> | null = null;

    session.on('user_speech_committed' as any, (ev: any) => {
      callerHasSpoken = true;
      turnSpeechEndMs = Date.now();
      const transcript = ev?.alternatives?.[0]?.transcript || ev?.transcript || '(no transcript)';
      console.log(`${logPrefix} [LATENCY:STT_DONE] transcript_len=${String(transcript).length}`);
    });

    session.on('agent_speech_started' as any, () => {
      if (turnSpeechEndMs) {
        const ttfr = Date.now() - turnSpeechEndMs;
        console.log(`${logPrefix} [LATENCY:TTFR] ${ttfr}ms speech-end→first-audio`);
        if (ttfr > 1500) console.log(`${logPrefix} [LATENCY:SLOW] ${ttfr}ms — check LLM region/model size`);
      }
    });

    session.on('agent_speech_committed' as any, () => {
      if (turnSpeechEndMs) {
        console.log(`${logPrefix} [LATENCY:FULL_TURN] ${Date.now() - turnSpeechEndMs}ms stt-done→speech-committed`);
      }
      turnSpeechEndMs = 0;
      // Start spam timer after first agent utterance if caller hasn't spoken
      if (!callerHasSpoken && !spamTimer) {
        spamTimer = setTimeout(() => {
          if (!callerHasSpoken) {
            console.log(`${logPrefix} [SPAM] No caller speech 30s after greeting — disconnecting`);
            ctx.room.disconnect().catch(() => {});
          }
        }, 30_000);
      }
    });

    ctx.room.on('disconnected', () => { if (spamTimer) clearTimeout(spamTimer); });

    // ── Initial greeting ────────────────────────────────────────────
    // Use session.say() for line 1 — bypasses LLM entirely, guaranteed delivery
    const greetingLine1 = callerFirstName
      ? `Hi, is this ${callerFirstName}${callerBusiness ? ` from ${callerBusiness}` : ''}?`
      : `Hi there, this is Tracey calling from Earlymark AI.`;
    session.say(greetingLine1, { allowInterruptions: false });
    console.log(`${logPrefix} [GREETING] Line 1 spoken via session.say(): "${greetingLine1}"`);
    console.log(`${logPrefix} [GREETING] Waiting for user response before LLM takes over`);

    // ── Timer: wrap-up ──────────────────────────────────────────────
    const wrapUpTimer = setTimeout(async () => {
      try {
        console.log(`${logPrefix} ${isEarlymarkCall ? '3' : '8'}-min mark reached — triggering wrap-up`);
        await session.generateReply({ userInput: `[SYSTEM: ${wrapUpScript}]` });
      } catch (err) {
        console.error('[agent] Wrap-up reply failed:', err);
      }
    }, wrapUpMs);

    // ── Timer: hard disconnect ──────────────────────────────────────
    const hardCutTimer = setTimeout(async () => {
      try {
        console.log(`${logPrefix} ${isEarlymarkCall ? '5' : '10'}-min hard cap — disconnecting`);
        await session.generateReply({
          userInput: isEarlymarkCall
            ? "[SYSTEM: Time is up. Log the lead now with the log_lead tool if you haven't already. Then thank them and give the CTA: Head to earlymark.ai, hit Get Started.]"
            : "[SYSTEM: Time is up. Thank the caller, confirm their request has been noted, and say goodbye.]",
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
