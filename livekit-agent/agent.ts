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
 *   - Normal business receptionist mode for customer workspaces
 *   - Earlymark sales/demo mode for inbound and outbound demo calls
 *   - 8-min wrap-up + 10-min hard disconnect for normal calls
 *   - 3-min wrap-up + 5-min hard disconnect for Earlymark demo calls
 *   - Goodbye detection with delayed hangup to stop post-call rambling
 *   - Per-turn latency attribution logs
 */

import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import * as openai from '@livekit/agents-plugin-openai';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import { AutoSubscribe, WorkerOptions, cli, defineAgent, llm as livekitLlm, voice } from '@livekit/agents';
import { z } from 'zod';

loadEnv({ path: '.env.local' });

const DEPLOY_GIT_SHA = process.env.DEPLOY_GIT_SHA || "unknown";
console.log(`[agent-version] ${JSON.stringify({ gitSha: DEPLOY_GIT_SHA, startedAt: new Date().toISOString() })}`);

const NORMAL_WRAP_UP_MS = 8 * 60 * 1000;
const NORMAL_HARD_CUT_MS = 10 * 60 * 1000;
const DEMO_WRAP_UP_MS = 3 * 60 * 1000;
const DEMO_HARD_CUT_MS = 5 * 60 * 1000;
const GOODBYE_DISCONNECT_BUFFER_MS = 5000;

const WRAP_UP_SCRIPT =
  "Hey, just to be candid this is taking longer than expected and I'm sorry if I haven't been able to help with everything you need so far. Let me pass this on to my manager so they can better help you ASAP. Did you have anything else you wanted me to share?";

const DEMO_WRAP_UP_SCRIPT =
  "Before we wrap up, move the call toward a clear next step. Briefly restate the caller's pain point, ask for the best contact details if still missing, and encourage either a consultation with an Earlymark AI manager or signing up at earlymark.ai.";

type CallType = "demo" | "inbound_demo" | "normal";

type LatencyAudit = {
  sttMs: number[];
  llmMs: number[];
  llmTtftMs: number[];
  ttsMs: number[];
  ttsTtfbMs: number[];
  eouMs: number[];
  transcriptionDelayMs: number[];
};

type PendingUserTurn = {
  transcript: string;
  createdAt: number;
  language: string | null;
};

type TurnAudit = {
  speechId: string;
  turnIndex: number;
  source: string;
  userInitiated: boolean;
  transcript: string | null;
  transcriptCreatedAt: number | null;
  transcriptLanguage: string | null;
  speechCreatedAt: number;
  eouMs: number;
  transcriptionDelayMs: number;
  onUserTurnCompletedDelayMs: number;
  llmMs: number;
  llmTtftMs: number;
  ttsMs: number;
  ttsTtfbMs: number;
};

type CallerContext = {
  callType: CallType;
  firstName: string;
  businessName: string;
  phone: string;
  calledPhone: string;
};

type TranscriptTurn = {
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

type LeadCapture = {
  toolUsed: boolean;
  payloads: Array<Record<string, unknown>>;
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

function maxByValue(entries: Array<[string, number]>): [string, number] {
  return entries.reduce((best, current) => (current[1] > best[1] ? current : best), entries[0] ?? ["none", 0]);
}

function summarizeTurnLatency(turn: TurnAudit) {
  const measuredTotalMs =
    turn.eouMs +
    turn.transcriptionDelayMs +
    turn.onUserTurnCompletedDelayMs +
    turn.llmTtftMs +
    turn.ttsTtfbMs;

  const [bottleneck, bottleneckMs] = maxByValue([
    ["end_of_utterance", turn.eouMs],
    ["transcription", turn.transcriptionDelayMs],
    ["turn_callback", turn.onUserTurnCompletedDelayMs],
    ["llm_ttft", turn.llmTtftMs],
    ["tts_ttfb", turn.ttsTtfbMs],
  ]);

  return {
    speechId: turn.speechId,
    turnIndex: turn.turnIndex,
    source: turn.source,
    userInitiated: turn.userInitiated,
    transcript: turn.transcript,
    transcriptLanguage: turn.transcriptLanguage,
    timings: {
      eouMs: turn.eouMs,
      transcriptionDelayMs: turn.transcriptionDelayMs,
      onUserTurnCompletedDelayMs: turn.onUserTurnCompletedDelayMs,
      llmMs: turn.llmMs,
      llmTtftMs: turn.llmTtftMs,
      ttsMs: turn.ttsMs,
      ttsTtfbMs: turn.ttsTtfbMs,
      measuredTotalMs,
    },
    bottleneck,
    bottleneckMs,
  };
}

function normalizeTranscript(rawTranscript: string): string {
  return rawTranscript
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s']/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/'/g, "")
    .trim();
}

function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function phoneMatches(left?: string | null, right?: string | null): boolean {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (!a || !b) return false;
  return a === b || a.replace(/^\+/, "") === b.replace(/^\+/, "");
}

function getKnownEarlymarkNumbers(): string[] {
  return [
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER,
    process.env.EARLYMARK_PHONE_NUMBER,
    process.env.TWILIO_PHONE_NUMBER,
  ].filter(Boolean) as string[];
}

function resolveCallType(initialCallType: CallType, calledPhone: string, roomName: string): CallType {
  if (initialCallType !== "normal") return initialCallType;
  if (roomName.startsWith("earlymark-inbound-") || roomName.startsWith("inbound_")) {
    return "inbound_demo";
  }
  if (getKnownEarlymarkNumbers().some((number) => phoneMatches(number, calledPhone))) {
    return "inbound_demo";
  }
  return "normal";
}

function getRepresentedBusinessName(callType: CallType, caller: CallerContext): string {
  if (callType === "demo" || callType === "inbound_demo") return "Earlymark AI";
  return caller.businessName || "the business";
}

function buildNormalPrompt(caller: CallerContext): string {
  const businessName = getRepresentedBusinessName("normal", caller);
  return `You are Tracey, an AI assistant for ${businessName}.

Role:
- You work for ${businessName}, not for Earlymark.
- You are an AI assistant, not a real person.
- Never say or imply that you are human, a real person, or "not AI".
- If asked whether you are AI, always say yes.

Tone: Casual, professional, and Australian.
Accent + Locale:
- Always use Australian English style and wording.
- Do NOT drift into US wording or pronunciation cues.
- Keep the same Australian speaking style for the full call.
- "G'day" is fine occasionally if it sounds natural and is pronounced correctly. Do not force it.

Constraint:
- Keep responses short, punchy, and helpful.
- Do not yap.

Goal:
- Capture details and requests for ${businessName}, answer common questions, and help with bookings or next steps when appropriate.
- If you are not confident you can help correctly, make up to 2 honest attempts to help first, then offer to pass it to your manager so they can get back to the caller ASAP. If the caller agrees, wrap the call up briefly.

Transfer rules:
- If a caller asks to speak to the business owner or a human, confirm first.
- On confirmation, use the transfer_call tool.
- Do not transfer general enquiries you can handle yourself.

IMPORTANT - Call Duration:
- At around 8 minutes you will receive an instruction to wrap up the call. Follow it naturally.
- The call will disconnect at 10 minutes maximum.`;
}

function isMeaningfulUserTurn(rawTranscript: string): boolean {
  const normalized = normalizeTranscript(rawTranscript);
  if (!normalized) return false;
  if (!/[a-z0-9]/i.test(normalized)) return false;

  const allowedShort = new Set(["yes", "no", "yeah", "yep", "nope", "ok", "okay", "sure"]);
  if (allowedShort.has(normalized)) return true;

  const filler = new Set(["uh", "um", "ah", "er", "erm", "hmm", "mm", "mhm", "huh"]);
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 1 && filler.has(tokens[0])) return false;

  return normalized.length >= 4 || tokens.length >= 2;
}

function isGoodbyeTurn(rawTranscript: string): boolean {
  const normalized = normalizeTranscript(rawTranscript);
  if (!normalized) return false;

  const exactGoodbyes = new Set([
    "bye",
    "bye bye",
    "goodbye",
    "see ya",
    "see you",
    "catch ya",
    "talk soon",
    "talk later",
    "have a good one",
    "thats all",
    "that is all",
    "thats it",
    "that is it",
    "all good bye",
    "all good thanks bye",
    "thanks bye",
    "thank you bye",
    "thanks tracey bye",
    "thank you tracey bye",
    "okay bye",
    "ok bye",
    "alright bye",
    "all right bye",
    "cheers bye",
    "no worries bye",
  ]);

  if (exactGoodbyes.has(normalized)) return true;

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length > 8) return false;

  return /^((okay|ok|alright|all right|no worries|thanks|thank you|cheers|perfect|great|awesome|sweet|too easy)\s+)*(bye|bye bye|goodbye|see ya|see you|catch ya|talk soon|talk later|have a good one|thats all|that is all|thats it|that is it)(\s+(mate|tracey))?$/.test(normalized);
}

function buildDemoPrompt(caller: CallerContext): string {
  return `You are Tracey, an AI assistant from Earlymark AI.

This is an outbound interview-form demo call. The person on the line asked to try Tracey via the website.

Identity:
- Introduce yourself as "Tracey, an AI assistant from Earlymark AI."
- You are a live example of the product, but you are not the manager.
- If the caller wants human follow-up, push toward a consultation with an Earlymark AI manager.
- You are an AI assistant, not a real person. Never say or imply otherwise.
- If asked whether you are AI, always say yes.

Tone and style:
- Casual, warm, confident, and Australian.
- Keep replies under 18 words unless the caller explicitly asks for more detail.
- Use simple, punchy sentences.
- Usually speak in 1 short sentence, then pause. At most 2 short sentences.
- Ask one focused question at a time.
- Listen first, but do not stay passive. Lead the conversation toward a next step.
- Keep Australian wording throughout the full call. Do not drift into US phrasing or cadence.
- "G'day" is fine occasionally if it sounds natural and is pronounced correctly. Do not force it.

Primary goals:
- Identify the caller's pain points around missed calls, slow lead follow-up, admin load, quoting, booking, and customer response times.
- Proactively capture lead details before the call ends: first name, business name, business type, best phone number, and email if they are open to sharing it.
- Move them toward one of two outcomes: a consultation with an Earlymark AI manager, or signing up on the website.

Sales behaviour:
- Ask what sort of business they run and how they currently handle incoming calls and leads.
- If they mention a pain point, briefly connect it to Earlymark AI and then ask a follow-up question.
- Do not wait until the very end to collect details. Start collecting them once the caller shows any interest.
- If contact details are still missing near the end, ask directly and politely for the best number and email for a follow-up.
- Before the call ends, use the log_lead tool once you have enough real information.
- Do not call log_lead straight after the caller only confirms their identity or says hello.
- Do not call log_lead unless you have at least first name, business name, phone, and one real pain point or follow-up reason.

Call to action:
- Encourage either a demo/consultation with an Earlymark AI manager or signing up at earlymark.ai.
- Natural CTA examples:
  - "If you'd like, I can have an Earlymark AI manager follow up with you."
  - "If you want to move quickly, you can head to earlymark.ai and sign up there."
  - "Would you rather book a consultation with the manager, or jump in via the website?"

Truthfulness rules:
- Never invent features, integrations, pricing, implementation timelines, or guarantees.
- Do NOT claim that Earlymark AI integrates into the caller's existing CRM. That is not currently true.
- If asked about CRM integrations or any unsupported feature, say you do not want to overstate it and an Earlymark AI manager can walk them through what is currently supported.
- Only mention capabilities that are actually supported and already established in this prompt.
- If you are unsure how to help correctly, make up to 2 honest attempts to help without inventing facts, then offer to pass it to an Earlymark AI manager so they can get back to the caller ASAP. Only wrap up once the caller agrees.

Capabilities you may discuss when relevant:
- Tracey answers calls 24/7 so businesses miss fewer leads.
- Tracey helps with customer communication and admin.
- Tracey helps create a faster, friendlier customer experience.
- Earlymark AI aims to reduce manual follow-up and help convert more enquiries.

Known caller details:
- First name: ${caller.firstName || "unknown"}
- Business name: ${caller.businessName || "unknown"}
- Phone: ${caller.phone || "unknown"}
- Treat these as known only if listed here. If something is unknown, ask for it instead of guessing.

Important:
- The system has already opened the call with: "Hi, is this ${caller.firstName || "there"}${caller.businessName ? ` from ${caller.businessName}` : ""}?"
- Wait for the caller to answer before giving your own introduction.
- After they respond, introduce yourself as "Hi, this is Tracey from Earlymark AI" and then continue naturally into the demo conversation.
- After that introduction, keep the next reply very short: 1 short sentence plus 1 short question.
- Do not combine the identity-check line and the Earlymark introduction into one opening sentence.
- This is a personalised demo. Make it feel like they are trying the product for their own business.
- If the caller says goodbye or clearly ends the conversation, keep the farewell brief.
- Do not launch into a long summary at the end of the call.
- This call will be wrapped at around 3 minutes and disconnected at 5 minutes if still active.`;
}

function buildInboundDemoPrompt(caller: CallerContext): string {
  return `You are Tracey, an AI assistant from Earlymark AI.

This is an inbound Earlymark AI sales call.

Identity:
- Introduce yourself as "Tracey, an AI assistant for Earlymark AI."
- You work for Earlymark AI, not for the caller's business.
- You are an AI assistant, not a real person. Never say otherwise.
- If asked whether you are AI, always say yes.

Style:
- Keep replies under 12 words for the first substantive answer.
- After that, keep replies under 18 words unless asked for detail.
- Use simple, punchy sentences.
- Usually 1 short sentence, then pause.
- Keep Australian delivery natural, never exaggerated.

Goals:
- Explain what Earlymark AI does.
- Capture lead details: first name, business name, best phone, email, business type.
- Move the caller toward earlymark.ai or a manager follow-up.

Rules:
- This is a lead-qualification and conversion call, not a receptionist call.
- If the caller asks what Earlymark does, answer briefly first, then ask 1 short question.
- If the caller is ready to sign up or asks how to sign up, switch to closing mode immediately.
- In closing mode: confirm intent, point them to earlymark.ai, collect missing details, log the lead.
- Do not delay a sign-up request with more discovery questions.
- Do not call log_lead unless you have at least first name, business name, phone, and a real follow-up reason.
- Never invent integrations, pricing, timelines, or unsupported features.
- If you are unsure how to help correctly, make up to 2 honest attempts to help without inventing unsupported facts, then offer to pass it to an Earlymark AI manager so they can get back to the caller ASAP. Only wrap up once the caller agrees.

Known caller details:
- First name: ${caller.firstName || "unknown"}
- Business name: ${caller.businessName || "unknown"}
- Phone: ${caller.phone || "unknown"}
- Called Earlymark number: ${caller.calledPhone || "unknown"}

Important:
- Keep the conversation focused on what Earlymark AI can do and the next step.
- Point them to earlymark.ai whenever they ask how to proceed or are ready to buy.
- Keep farewells brief.
- This call will be wrapped at around 3 minutes and disconnected at 5 minutes if still active.`;
}

function buildEarlymarkPrompt(callType: CallType, caller: CallerContext): string {
  return callType === "demo" ? buildDemoPrompt(caller) : buildInboundDemoPrompt(caller);
}

function getGreeting(callType: CallType, caller: CallerContext): string {
  if (callType === "demo" && caller.firstName) {
    return `Hi, is this ${caller.firstName}${caller.businessName ? ` from ${caller.businessName}` : ""}?`;
  }
  if (callType === "demo") {
    return "Hi there.";
  }
  if (callType === "inbound_demo") {
    return "Hi, this is Tracey from Earlymark AI. How can I help?";
  }
  const businessName = getRepresentedBusinessName("normal", caller);
  return `Hi, you've reached ${businessName}. I'm Tracey, an AI assistant for ${businessName}. How can I help today?`;
}

function getGoodbyeLine(callType: CallType): string {
  if (callType === "demo" || callType === "inbound_demo") {
    return "Thanks for your time. You can head to earlymark.ai, or an Earlymark AI manager can follow up. Bye for now.";
  }
  return "No worries. Thanks for calling. Bye for now.";
}

function extractTextFromConversationItem(item: any): string | null {
  const text = typeof item?.textContent === "string" ? item.textContent.trim() : "";
  return text || null;
}

async function persistVoiceCall(payload: {
  callId: string;
  callType: CallType;
  roomName: string;
  participantIdentity: string;
  callerPhone?: string;
  calledPhone?: string;
  callerName?: string;
  businessName?: string;
  transcriptTurns: TranscriptTurn[];
  transcriptText: string;
  latency: Record<string, unknown>;
  leadCapture: LeadCapture;
  metadata: Record<string, unknown>;
  startedAt: string;
  endedAt: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.NODE_ENV === "production" ? "https://earlymark.ai" : "http://localhost:3000");
  const secret = process.env.VOICE_AGENT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET;

  if (!appUrl || !secret) {
    console.warn("[agent] Skipping call persistence because APP URL or webhook secret is missing.");
    return;
  }

  const route = `${appUrl.replace(/\/$/, "")}/api/internal/voice-calls`;
  const response = await fetch(route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-voice-agent-secret": secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Voice call persistence failed: ${response.status} ${body}`);
  }
}

export default defineAgent({
  entry: async (ctx) => {
    const callStartedAt = new Date();
    const callId = `${ctx.room.name}:${callStartedAt.getTime()}`;

    const logLeadTool = livekitLlm.tool({
      description: "Save a potential Earlymark lead before the call ends. Only log details the caller actually provided.",
      parameters: z.object({
        firstName: z.string().describe("First name of the caller"),
        businessName: z.string().describe("Business name"),
        businessType: z.string().optional().describe("Business type, e.g. plumber or electrician, if actually known"),
        phone: z.string().describe("Best phone number for follow-up"),
        interestLevel: z.enum(["hot", "warm", "cold"]).optional().describe("How interested the caller seemed"),
        email: z.string().optional().describe("Best email for follow-up if provided"),
        notes: z.string().optional().describe("Real notes from the call. No guessing."),
      }),
      execute: async ({ firstName, businessName, businessType, phone, interestLevel, email, notes }) => {
        const safeBusinessType = (businessType || "").trim();
        const safeInterestLevel = interestLevel || "warm";
        const safeNotes = (notes || "").trim();
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

          if (supabaseUrl && supabaseKey) {
            await fetch(`${supabaseUrl}/rest/v1/leads`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                first_name: firstName,
                business_name: businessName,
                business_type: safeBusinessType,
                phone,
                email: email || "",
                interest_level: safeInterestLevel,
                notes: safeNotes,
                source: "voice_call",
                created_at: new Date().toISOString(),
              }),
            });
          }
          console.log(`[agent] Lead logged: ${firstName} - ${businessName} (${safeInterestLevel})`);
        } catch (err) {
          console.error("[agent] Failed to log lead:", err);
        }

        return `Got it. I've noted ${firstName} from ${businessName} for follow-up.`;
      },
    });

    const transferCallTool = {
      name: "transfer_call",
      description: "Transfer the call to the human business owner or leave an urgent message if they are unavailable.",
      parameters: z.object({
        reason: z.string().describe("Why the caller wants to speak to the owner"),
      }),
      execute: async ({ reason }) => {
        console.log(`[agent] Executing transfer_call tool. Reason: ${reason}`);

        const currentHour = new Date().getHours();
        const isOnClock = currentHour >= 8 && currentHour < 17;

        if (isOnClock) {
          return "I am transferring you to the owner now. Please hold on the line.";
        }

        return "The owner is currently out of the office or on-site. I am flagging this message as URGENT for them so they see it as soon as possible. Can I get a detailed message for them?";
      },
    };

    const stt = new deepgram.STT({
      model: (process.env.VOICE_STT_MODEL as any) || "nova-3",
      language: process.env.VOICE_STT_LANGUAGE || "en-AU",
      interimResults: true,
      endpointing: Number(process.env.VOICE_STT_ENDPOINTING_MS || 250),
      noDelay: true,
      punctuate: true,
      smartFormat: true,
    });

    const tts = new cartesia.TTS({
      model: "sonic-3",
      voice: process.env.VOICE_TTS_VOICE_ID || "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
      language: process.env.VOICE_TTS_LANGUAGE || "en-AU",
      chunkTimeout: Number(process.env.VOICE_TTS_CHUNK_TIMEOUT_MS || 1500),
    });

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();

    let callType: CallType = "normal";
    let callerFirstName = "";
    let callerBusiness = "";
    let callerPhone = "";
    let calledPhone = "";

    try {
      const roomMeta = ctx.room.metadata;
      if (roomMeta) {
        const meta = JSON.parse(roomMeta) as Record<string, string>;
        if (meta.callType === "demo") callType = "demo";
        if (meta.callType === "inbound_demo") callType = "inbound_demo";
        callerFirstName = meta.firstName || "";
        callerBusiness = meta.businessName || "";
        callerPhone = meta.phone || "";
        calledPhone = meta.calledPhone || "";
      }
    } catch {
      // Ignore invalid room metadata.
    }

    try {
      const attrs = (participant.attributes || {}) as Record<string, string>;
      if (attrs.callType === "demo") callType = "demo";
      if (attrs.callType === "inbound_demo") callType = "inbound_demo";
      callerFirstName = callerFirstName || attrs.firstName || "";
      callerBusiness = callerBusiness || attrs.businessName || "";
      callerPhone =
        callerPhone ||
        attrs.phone ||
        attrs.phoneNumber ||
        attrs["sip.phoneNumber"] ||
        attrs["sip.phone_number"] ||
        "";
      calledPhone =
        calledPhone ||
        attrs["sip.trunkPhoneNumber"] ||
        attrs["sip.calledNumber"] ||
        attrs["sip.to"] ||
        attrs["sip.toNumber"] ||
        attrs["sip.called_number"] ||
        "";
    } catch {
      // Ignore invalid participant attributes.
    }

    if (!callerPhone && participant.identity.startsWith("demo-caller-")) {
      callerPhone = participant.identity.replace("demo-caller-", "");
    }

    callType = resolveCallType(callType, calledPhone, ctx.room.name);

    const caller: CallerContext = {
      callType,
      firstName: callerFirstName,
      businessName: callerBusiness,
      phone: callerPhone,
      calledPhone,
    };

    const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
    const llmProvider = (
      process.env.GROQ_API_KEY
        ? "groq"
        : (
            isEarlymarkCall
              ? (process.env.EARLYMARK_VOICE_LLM_PROVIDER || "deepinfra")
              : (process.env.VOICE_LLM_PROVIDER || "deepinfra")
          )
    ).toLowerCase();
    const llmModel =
      (isEarlymarkCall ? process.env.EARLYMARK_VOICE_LLM_MODEL : process.env.VOICE_LLM_MODEL) ||
      (llmProvider === "groq" ? "llama-3.3-70b-versatile" : "meta-llama/Meta-Llama-3.1-8B-Instruct");
    const llmApiKey = llmProvider === "groq" ? process.env.GROQ_API_KEY : process.env.DEEPINFRA_API_KEY;
    const llmBaseURL = llmProvider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.deepinfra.com/v1/openai";
    if (!llmApiKey) {
      throw new Error(`[agent] Missing API key for provider '${llmProvider}'.`);
    }
    const llmTemperature = Number(
      isEarlymarkCall
        ? (process.env.EARLYMARK_VOICE_LLM_TEMPERATURE || 0.1)
        : (process.env.VOICE_LLM_TEMPERATURE || 0.2)
    );
    const llmMaxCompletionTokens = Number(
      callType === "inbound_demo"
        ? (process.env.INBOUND_VOICE_LLM_MAX_COMPLETION_TOKENS || 48)
        : isEarlymarkCall
          ? (process.env.EARLYMARK_VOICE_LLM_MAX_COMPLETION_TOKENS || 64)
          : (process.env.VOICE_LLM_MAX_COMPLETION_TOKENS || 80)
    );
    const llm = new openai.LLM({
      model: llmModel,
      apiKey: llmApiKey,
      baseURL: llmBaseURL,
      temperature: llmTemperature,
      maxCompletionTokens: llmMaxCompletionTokens,
    });

    const logPrefix = isEarlymarkCall ? "[TRACEY_EARLYMARK]" : "[TRACEY_USER]";
    const systemPrompt = isEarlymarkCall ? buildEarlymarkPrompt(callType, caller) : buildNormalPrompt(caller);
    const greeting = getGreeting(callType, caller);
    const wrapUpMs = isEarlymarkCall ? DEMO_WRAP_UP_MS : NORMAL_WRAP_UP_MS;
    const hardCutMs = isEarlymarkCall ? DEMO_HARD_CUT_MS : NORMAL_HARD_CUT_MS;
    const wrapUpScript = isEarlymarkCall ? DEMO_WRAP_UP_SCRIPT : WRAP_UP_SCRIPT;
    const hardCutInstructions = isEarlymarkCall
      ? "Time is up. If you already have enough real details, use the log_lead tool now. Give a brief farewell and push one clear CTA: manager follow-up or earlymark.ai."
      : "Thank the caller for their time, let them know their message will be passed on, and say goodbye.";

    console.log(`${logPrefix} Call started ${JSON.stringify({
      callId,
      room: ctx.room.name,
      participant: participant.identity,
      callType,
      callerFirstName,
      callerBusiness,
      callerPhone,
      calledPhone,
      llmProvider,
      llmModel,
    })}`);

    const agent = new voice.Agent({
      instructions: systemPrompt,
      stt,
      llm,
      tts,
      tools: {
        log_lead: logLeadTool,
        transfer_call: transferCallTool,
      },
      turnDetection: "stt",
      minConsecutiveSpeechDelay: Number(process.env.VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS || 180),
    });

    // Explicitly subscribe to SIP audio tracks as they arrive.
    // Earlier regressions showed that relying on the default path can leave STT with no caller audio.
    ctx.room.on("trackPublished", (pub: any, p: any) => {
      console.log(`${logPrefix} [TRACK] published: kind=${pub.kind} participant=${p.identity}`);
      try { pub.setSubscribed(true); } catch { /* ignore */ }
    });
    ctx.room.on("trackSubscribed", (track: any, _pub: any, p: any) => {
      console.log(`${logPrefix} [TRACK] subscribed: kind=${track.kind} participant=${p.identity}`);
    });
    for (const [, remoteParticipant] of ctx.room.remoteParticipants) {
      for (const [, pub] of remoteParticipant.trackPublications) {
        console.log(`${logPrefix} [TRACK] existing: kind=${pub.kind} participant=${remoteParticipant.identity}`);
        try { pub.setSubscribed(true); } catch { /* ignore */ }
      }
    }

    const latencyAudit: LatencyAudit = {
      sttMs: [],
      llmMs: [],
      llmTtftMs: [],
      ttsMs: [],
      ttsTtfbMs: [],
      eouMs: [],
      transcriptionDelayMs: [],
    };
    const pendingUserTurns: PendingUserTurn[] = [];
    const turnAudits = new Map<string, TurnAudit>();
    const transcriptTurns: TranscriptTurn[] = [];
    const transcriptItemIds = new Set<string>();
    const leadCapture: LeadCapture = { toolUsed: false, payloads: [] };
    let turnCounter = 0;
    let isDisconnecting = false;
    let goodbyeTimer: ReturnType<typeof setTimeout> | null = null;
    let wrapUpTimer: ReturnType<typeof setTimeout> | null = null;
    let hardCutTimer: ReturnType<typeof setTimeout> | null = null;

    const getOrCreateTurnAudit = (speechId: string) => {
      const existing = turnAudits.get(speechId);
      if (existing) return existing;

      const turn: TurnAudit = {
        speechId,
        turnIndex: ++turnCounter,
        source: "unknown",
        userInitiated: false,
        transcript: null,
        transcriptCreatedAt: null,
        transcriptLanguage: null,
        speechCreatedAt: Date.now(),
        eouMs: 0,
        transcriptionDelayMs: 0,
        onUserTurnCompletedDelayMs: 0,
        llmMs: 0,
        llmTtftMs: 0,
        ttsMs: 0,
        ttsTtfbMs: 0,
      };
      turnAudits.set(speechId, turn);
      return turn;
    };

    const logTurnSummary = (speechId: string) => {
      const turn = turnAudits.get(speechId);
      if (!turn) return;
      console.log(`[voice-turn] ${JSON.stringify({ callId, room: ctx.room.name, participant: participant.identity, ...summarizeTurnLatency(turn) })}`);
    };

    const session = new voice.AgentSession({
      turnDetection: "stt",
      voiceOptions: {
        preemptiveGeneration: true,
        minEndpointingDelay: Number(process.env.VOICE_MIN_ENDPOINTING_DELAY_MS || 180),
        maxEndpointingDelay: Number(process.env.VOICE_MAX_ENDPOINTING_DELAY_MS || 700),
        minInterruptionDuration: Number(process.env.VOICE_MIN_INTERRUPTION_DURATION_MS || 250),
        minInterruptionWords: Number(
          callType === "inbound_demo"
            ? (process.env.INBOUND_VOICE_MIN_INTERRUPTION_WORDS || 1)
            : (process.env.VOICE_MIN_INTERRUPTION_WORDS || 2)
        ),
        allowInterruptions: true,
      },
    });
    await session.start({
      agent,
      room: ctx.room,
    });

    session.on(voice.AgentSessionEventTypes.SpeechCreated, (ev) => {
      const speechId = ev.speechHandle.id;
      const turn = getOrCreateTurnAudit(speechId);
      turn.source = ev.source;
      turn.userInitiated = ev.userInitiated;
      turn.speechCreatedAt = ev.createdAt;

      const pendingTurn = pendingUserTurns.shift();
      if (pendingTurn) {
        turn.transcript = pendingTurn.transcript;
        turn.transcriptCreatedAt = pendingTurn.createdAt;
        turn.transcriptLanguage = pendingTurn.language;
      }

      console.log(
        `[voice-speech] ${JSON.stringify({
          callId,
          room: ctx.room.name,
          participant: participant.identity,
          speechId,
          turnIndex: turn.turnIndex,
          source: ev.source,
          userInitiated: ev.userInitiated,
          transcript: turn.transcript,
        })}`
      );
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
          if (metrics.speechId) {
            const turn = getOrCreateTurnAudit(metrics.speechId);
            turn.llmMs = Number(metrics.durationMs || 0);
            turn.llmTtftMs = Number(metrics.ttftMs || 0);
          }
          break;
        case "tts_metrics":
          latencyAudit.ttsMs.push(Number(metrics.durationMs || 0));
          latencyAudit.ttsTtfbMs.push(Number(metrics.ttfbMs || 0));
          if (metrics.speechId) {
            const turn = getOrCreateTurnAudit(metrics.speechId);
            turn.ttsMs = Number(metrics.durationMs || 0);
            turn.ttsTtfbMs = Number(metrics.ttfbMs || 0);
            logTurnSummary(metrics.speechId);
          }
          break;
        case "eou_metrics":
          latencyAudit.eouMs.push(Number(metrics.endOfUtteranceDelayMs || 0));
          latencyAudit.transcriptionDelayMs.push(Number(metrics.transcriptionDelayMs || 0));
          if (metrics.speechId) {
            const turn = getOrCreateTurnAudit(metrics.speechId);
            turn.eouMs = Number(metrics.endOfUtteranceDelayMs || 0);
            turn.transcriptionDelayMs = Number(metrics.transcriptionDelayMs || 0);
            turn.onUserTurnCompletedDelayMs = Number(metrics.onUserTurnCompletedDelayMs || 0);
          }
          break;
      }

      console.log(`[voice-metric] ${JSON.stringify({ callId, room: ctx.room.name, participant: participant.identity, ...metrics })}`);
    });

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      const item = ev.item as any;
      if (!item || item.type !== "message" || transcriptItemIds.has(item.id)) return;

      const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
      const text = extractTextFromConversationItem(item);
      if (!role || !text) return;

      transcriptItemIds.add(item.id);
      transcriptTurns.push({
        role,
        text,
        createdAt: ev.createdAt,
      });
    });

    session.on(voice.AgentSessionEventTypes.FunctionToolsExecuted, (ev) => {
      for (const call of ev.functionCalls) {
        if (call.name !== "log_lead") continue;
        leadCapture.toolUsed = true;
        try {
          leadCapture.payloads.push(JSON.parse(call.args) as Record<string, unknown>);
        } catch {
          leadCapture.payloads.push({ rawArgs: call.args });
        }
      }
    });

    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async (ev) => {
      if (!ev.isFinal || isDisconnecting) return;

      const transcript = (ev.transcript || "").trim();
      if (!isMeaningfulUserTurn(transcript)) {
        console.log(`[voice-filter] Dropping low-signal transcript: "${transcript}"`);
        session.clearUserTurn();
        return;
      }

      if (isGoodbyeTurn(transcript)) {
        isDisconnecting = true;
        session.clearUserTurn();
        console.log(
          `[voice-goodbye] ${JSON.stringify({
            callId,
            room: ctx.room.name,
            participant: participant.identity,
            transcript,
            bufferMs: GOODBYE_DISCONNECT_BUFFER_MS,
          })}`
        );

        if (wrapUpTimer) clearTimeout(wrapUpTimer);
        if (hardCutTimer) clearTimeout(hardCutTimer);
        if (goodbyeTimer) clearTimeout(goodbyeTimer);

        try {
          await session.say(getGoodbyeLine(callType), {
            allowInterruptions: false,
            addToChatCtx: true,
          });
        } catch (err) {
          console.error("[agent] Goodbye reply failed:", err);
        }

        goodbyeTimer = setTimeout(() => {
          ctx.room.disconnect().catch(() => {});
        }, GOODBYE_DISCONNECT_BUFFER_MS);
        return;
      }

      pendingUserTurns.push({
        transcript,
        createdAt: ev.createdAt,
        language: ev.language,
      });
      console.log(
        `[voice-user-turn] ${JSON.stringify({
          callId,
          room: ctx.room.name,
          participant: participant.identity,
          transcript,
          createdAt: ev.createdAt,
          language: ev.language,
        })}`
      );
    });

    await session.say(greeting, {
      allowInterruptions: false,
      addToChatCtx: callType !== "demo",
    });
    if (callType === "demo") {
      console.log(`${logPrefix} [GREETING] Line 1 spoken via session.say(): "${greeting}"`);
      console.log(`${logPrefix} [GREETING] Waiting for user response before LLM takes over`);
    }

    wrapUpTimer = setTimeout(async () => {
      try {
        console.log(`[agent] wrap-up mark reached for ${callType}`);
        await session.generateReply({ instructions: wrapUpScript });
      } catch (err) {
        console.error("[agent] Wrap-up reply failed:", err);
      }
    }, wrapUpMs);

    hardCutTimer = setTimeout(async () => {
      try {
        console.log(`[agent] hard-cut mark reached for ${callType}`);
        await session.generateReply({ instructions: hardCutInstructions });
        goodbyeTimer = setTimeout(() => {
          ctx.room.disconnect().catch(() => {});
        }, 10_000);
      } catch (err) {
        console.error("[agent] Hard-cut disconnect failed:", err);
        ctx.room.disconnect().catch(() => {});
      }
    }, hardCutMs);

    ctx.room.on("disconnected", () => {
      if (wrapUpTimer) clearTimeout(wrapUpTimer);
      if (hardCutTimer) clearTimeout(hardCutTimer);
      if (goodbyeTimer) clearTimeout(goodbyeTimer);

      const turnSummaries = Array.from(turnAudits.values())
        .sort((a, b) => a.turnIndex - b.turnIndex)
        .map(summarizeTurnLatency);

      console.log(
        `[voice-audit] ${JSON.stringify({
          callId,
          room: ctx.room.name,
          participant: participant.identity,
          callType,
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
          turns: turnSummaries,
        })}`
      );

      const transcriptText = transcriptTurns
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((turn) => `${turn.role === "assistant" ? "Tracey" : "Caller"}: ${turn.text}`)
        .join("\n");

      const latency = {
        sttAvgMs: avg(latencyAudit.sttMs),
        llmAvgMs: avg(latencyAudit.llmMs),
        llmP95Ms: p95(latencyAudit.llmMs),
        llmTtftAvgMs: avg(latencyAudit.llmTtftMs),
        ttsAvgMs: avg(latencyAudit.ttsMs),
        ttsP95Ms: p95(latencyAudit.ttsMs),
        ttsTtfbAvgMs: avg(latencyAudit.ttsTtfbMs),
        eouAvgMs: avg(latencyAudit.eouMs),
        transcriptionDelayAvgMs: avg(latencyAudit.transcriptionDelayMs),
        turns: turnSummaries,
      };

      void persistVoiceCall({
        callId,
        callType,
        roomName: ctx.room.name,
        participantIdentity: participant.identity,
        callerPhone,
        calledPhone,
        callerName: callerFirstName || undefined,
        businessName: callerBusiness || undefined,
        transcriptTurns,
        transcriptText,
        latency,
        leadCapture,
        metadata: {
          llmProvider,
          llmModel,
          isEarlymarkCall,
        },
        startedAt: callStartedAt.toISOString(),
        endedAt: new Date().toISOString(),
      }).catch((error) => {
        console.error("[agent] Failed to persist voice call:", error);
      });
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
