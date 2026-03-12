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
import { ReadableStream } from 'node:stream/web';
import { config as loadEnv } from 'dotenv';
import * as openai from '@livekit/agents-plugin-openai';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import { AutoSubscribe, WorkerOptions, cli, defineAgent, llm as livekitLlm, tts as agentsTts, voice } from '@livekit/agents';
import { AudioFrame, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication } from '@livekit/rtc-node';
import { NoiseCancellation } from '@livekit/noise-cancellation-node';
import { z } from 'zod';
import {
  assertRequiredVoiceAgentEnv,
  getVoiceAgentAppBaseUrl,
  getVoiceAgentWebhookSecret,
  resolveWorkerHttpHost,
  resolveWorkerHttpPort,
} from './runtime-config';
import voiceLatency from './voice-latency';
import type { GuardDecision, OpenerBankEntry, OpenerId, VoiceTurnPrediction } from './voice-latency';
import {
  buildCapacitySummary,
  getActiveCallCount,
  getMaxConcurrentCalls,
  isWorkerAcceptingCalls,
  markCallEnded,
  markCallStarted,
  setWorkerBootReady,
} from './runtime-state';

loadEnv({ path: '.env.local' });
assertRequiredVoiceAgentEnv();

const {
  OPENER_BANK,
  buildVoiceFollowupInstructions,
  getPhaseTwoBacklog,
  predictVoiceTurn,
  resolveOpenerEntry,
  resolveVoiceLatencyConfig,
  runVoiceGuardDecision,
  shouldPrimeVoiceGuard,
} = voiceLatency;

const DEPLOY_GIT_SHA = process.env.DEPLOY_GIT_SHA || "unknown";
const AGENT_STARTED_AT = new Date().toISOString();
const VOICE_AGENT_HEARTBEAT_MS = 60 * 1000;
const VOICE_GROUNDING_CACHE_TTL_MS = 5 * 60 * 1000;
// Keep this list and fingerprint algorithm in sync with lib/voice-agent-runtime.ts.
const VOICE_AGENT_RUNTIME_ENV_KEYS = [
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "VOICE_AGENT_WEBHOOK_SECRET",
  "EARLYMARK_INBOUND_PHONE_NUMBERS",
  "EARLYMARK_INBOUND_PHONE_NUMBER",
  "EARLYMARK_PHONE_NUMBER",
  "TWILIO_PHONE_NUMBER",
  "DEEPGRAM_API_KEY",
  "DEEPINFRA_API_KEY",
  "GROQ_API_KEY",
  "CARTESIA_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EARLYMARK_VOICE_LLM_PROVIDER",
  "EARLYMARK_VOICE_LLM_MODEL",
  "EARLYMARK_VOICE_FALLBACK_LLM_MODEL",
  "EARLYMARK_VOICE_LLM_TEMPERATURE",
  "EARLYMARK_VOICE_LLM_MAX_COMPLETION_TOKENS",
  "EARLYMARK_VOICE_STT_ENDPOINTING_MS",
  "EARLYMARK_VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS",
  "EARLYMARK_VOICE_MIN_ENDPOINTING_DELAY_MS",
  "EARLYMARK_VOICE_MAX_ENDPOINTING_DELAY_MS",
  "EARLYMARK_VOICE_MIN_INTERRUPTION_DURATION_MS",
  "EARLYMARK_VOICE_MIN_INTERRUPTION_WORDS",
  "INBOUND_VOICE_LLM_MAX_COMPLETION_TOKENS",
  "INBOUND_VOICE_STT_ENDPOINTING_MS",
  "INBOUND_VOICE_MIN_INTERRUPTION_WORDS",
  "VOICE_LLM_PROVIDER",
  "VOICE_LLM_MODEL",
  "VOICE_FALLBACK_LLM_MODEL",
  "VOICE_LLM_TEMPERATURE",
  "VOICE_LLM_MAX_COMPLETION_TOKENS",
  "VOICE_STT_MODEL",
  "VOICE_STT_LANGUAGE",
  "VOICE_STT_ENDPOINTING_MS",
  "VOICE_TTS_VOICE_ID",
  "VOICE_TTS_LANGUAGE",
  "VOICE_TTS_CHUNK_TIMEOUT_MS",
  "VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS",
  "VOICE_MIN_ENDPOINTING_DELAY_MS",
  "VOICE_MAX_ENDPOINTING_DELAY_MS",
  "VOICE_MIN_INTERRUPTION_DURATION_MS",
  "VOICE_MIN_INTERRUPTION_WORDS",
  "VOICE_LATENCY_ENABLED",
  "VOICE_LATENCY_TARGET_CALL_TYPES",
  "VOICE_OPENER_BANK_ENABLED",
  "VOICE_OPENER_CONFIDENCE_THRESHOLD",
  "VOICE_GUARD_ENABLED",
  "VOICE_GUARD_PROVIDER",
  "VOICE_GUARD_MODEL",
  "VOICE_GUARD_BASE_URL",
  "VOICE_GUARD_TIMEOUT_MS",
  "VOICE_GUARD_MAX_COMPLETION_TOKENS",
  "VOICE_GUARD_TEMPERATURE",
  "VOICE_GUARD_MIN_CHARS",
  "VOICE_EMPATHY_TURN_GAP",
  "VOICE_MAX_ACTIVE_CALLS",
  "VOICE_MAX_ACTIVE_CALLS_SALES",
  "VOICE_MAX_ACTIVE_CALLS_CUSTOMER",
  "VOICE_HOST_ID",
  "VOICE_WORKER_ROLE",
  "VOICE_WORKER_SURFACES",
] as const;
console.log(`[agent-version] ${JSON.stringify({ gitSha: DEPLOY_GIT_SHA, startedAt: AGENT_STARTED_AT })}`);

const NORMAL_WRAP_UP_MS = 8 * 60 * 1000;
const NORMAL_HARD_CUT_MS = 10 * 60 * 1000;
const DEMO_WRAP_UP_MS = 3 * 60 * 1000;
const DEMO_HARD_CUT_MS = 5 * 60 * 1000;
const GOODBYE_DISCONNECT_BUFFER_MS = 5000;

const WRAP_UP_SCRIPT =
  "This is taking a bit longer than expected, and I want to get it resolved for you as quickly as possible. Tell the caller that you are going to pass this straight to your manager so they can address it as soon as possible, then ask: is there anything else I should know before I pass it on? Keep it brief, natural, and in the caller's language.";

const DEMO_WRAP_UP_SCRIPT =
  "Before wrapping up, move the call to one clear next step, ask for any missing contact details, mention earlymark.ai, and do not summarise the call.";

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

type WorkspaceVoiceGrounding = {
  workspaceId: string;
  businessName: string;
  tradeType: string | null;
  website: string | null;
  businessPhone: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  physicalAddress: string | null;
  serviceArea: string | null;
  serviceRadiusKm: number | null;
  standardWorkHours: string | null;
  emergencyService: boolean;
  emergencySurcharge: number | null;
  aiPreferences: string[];
  customerContactMode: "execute" | "review_approve" | "info_only";
  customerContactModeLabel: string;
  serviceRules: Array<{
    title: string;
    notes: string;
    priceRange: string | null;
    duration: string | null;
  }>;
  pricingItems: Array<{
    title: string;
    description: string;
  }>;
  noGoRules: string[];
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

type VoiceLatencyAudit = {
  classifierMs: number[];
  guardMs: number[];
  openerLeadMs: number[];
  openerGapMs: number[];
  openerHits: number;
  openerCacheMisses: number;
  guardTimeouts: number;
  guardEligibleTurns: number;
  openerUsage: Partial<Record<OpenerId, number>>;
};

type ActiveVoiceTurnState = {
  prediction: VoiceTurnPrediction | null;
  guardPromise: Promise<GuardDecision | null> | null;
  guardTranscript: string | null;
  guardStartedAt: number | null;
};

type PendingLatencyTurn = {
  transcript: string;
  finalCreatedAt: number;
  openerEntry: OpenerBankEntry;
  guardDecision: GuardDecision | null;
  prediction: VoiceTurnPrediction;
  openerSpeechCreatedAt: number | null;
};

type LlmProviderName = "groq" | "deepinfra";

type LlmProviderConfig = {
  provider: LlmProviderName;
  model: string;
  apiKey: string;
  baseURL: string;
  temperature: number;
  maxCompletionTokens: number;
  isFallback: boolean;
};

type VoiceTurnTuning = {
  sttEndpointingMs: number;
  minConsecutiveSpeechDelayMs: number;
  minEndpointingDelayMs: number;
  maxEndpointingDelayMs: number;
  minInterruptionDurationMs: number;
  minInterruptionWords: number;
};

type LlmRunSummary = {
  primaryProvider: LlmProviderName;
  primaryModel: string;
  fallbackProvider: LlmProviderName | null;
  fallbackModel: string | null;
  actualProviders: LlmProviderName[];
  actualModels: string[];
  fallbackUsed: boolean;
  fallbackCount: number;
  selectionCount: number;
  lastFailure: string | null;
};

type GroundingCacheEntry = {
  value: WorkspaceVoiceGrounding;
  fetchedAt: number;
};

let groundingRefreshPromise: Promise<void> | null = null;
const groundingCache = new Map<string, GroundingCacheEntry>();
let sharedOpenerAudioCache: Map<OpenerId, Promise<AudioFrame>> | null = null;

function cloneAudioFrame(frame: AudioFrame): AudioFrame {
  return new AudioFrame(new Int16Array(frame.data), frame.sampleRate, frame.channels, frame.samplesPerChannel);
}

function audioFrameToReadableStream(frame: AudioFrame): ReadableStream<AudioFrame> {
  return new ReadableStream<AudioFrame>({
    start(controller) {
      controller.enqueue(frame);
      controller.close();
    },
  });
}

function buildOpenerAudioCache(tts: cartesia.TTS, logPrefix: string): Map<OpenerId, Promise<AudioFrame>> {
  const cache = new Map<OpenerId, Promise<AudioFrame>>();

  for (const opener of OPENER_BANK) {
    cache.set(
      opener.id,
      tts
        .synthesize(opener.text)
        .collect()
        .catch((error) => {
          console.warn(`${logPrefix} [VOICE_LATENCY] Failed to pre-synthesize opener "${opener.id}"`, error);
          throw error;
        })
    );
  }

  void Promise.allSettled(cache.values()).then((results) => {
    const warmed = results.filter((result) => result.status === 'fulfilled').length;
    console.log(`${logPrefix} [VOICE_LATENCY] Warmed ${warmed}/${OPENER_BANK.length} cached opener clips`);
  });

  return cache;
}

function getSharedOpenerAudioCache(tts: cartesia.TTS, logPrefix: string) {
  if (!sharedOpenerAudioCache) {
    sharedOpenerAudioCache = buildOpenerAudioCache(tts, logPrefix);
  }
  return sharedOpenerAudioCache;
}

async function getCachedOpenerAudioFrame(
  cache: Map<OpenerId, Promise<AudioFrame>>,
  openerId: OpenerId,
  maxWaitMs: number
): Promise<AudioFrame | null> {
  const promise = cache.get(openerId);
  if (!promise) return null;

  try {
    const frame = await Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), maxWaitMs)),
    ]);
    return frame ? cloneAudioFrame(frame) : null;
  } catch {
    return null;
  }
}

/** Map Deepgram detected language to Cartesia language code. English -> en-AU (default TTS). */
function normalizeReplyLanguage(detected: string | null | undefined): string {
  if (!detected || typeof detected !== 'string') return 'en-AU';
  const code = detected.split('-')[0].toLowerCase();
  if (code === 'en') return 'en-AU';
  const allowed = new Set(['es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'it', 'nl', 'hi', 'ru', 'ar', 'pl', 'tr', 'vi', 'th', 'id', 'ms', 'fil']);
  return allowed.has(code) ? code : 'en-AU';
}

/**
 * TTS wrapper that uses a different Cartesia TTS per language so the agent can reply in the
 * language the user just spoke. Set reply language on each user turn; the next synthesize
 * uses that language.
 */
class MultilingualTTS extends agentsTts.TTS {
  readonly label = 'multilingual-cartesia';
  #defaultTts: cartesia.TTS;
  #ttsByLang = new Map<string, cartesia.TTS>();
  #currentReplyLanguage: string;
  #opts: { model: string; voice: string; chunkTimeout: number };

  constructor(defaultTts: cartesia.TTS, opts: { model: string; voice: string; chunkTimeout: number }) {
    super(defaultTts.sampleRate, defaultTts.numChannels, defaultTts.capabilities);
    this.#defaultTts = defaultTts;
    this.#opts = opts;
    this.#currentReplyLanguage = 'en-AU';
  }

  setReplyLanguage(detected: string | null | undefined): void {
    this.#currentReplyLanguage = normalizeReplyLanguage(detected);
  }

  #getTts(): cartesia.TTS {
    const lang = this.#currentReplyLanguage;
    if (lang === 'en-AU' || lang === 'en') return this.#defaultTts;
    if (!this.#ttsByLang.has(lang)) {
      this.#ttsByLang.set(
        lang,
        new cartesia.TTS({
          model: this.#opts.model,
          voice: this.#opts.voice,
          language: lang,
          chunkTimeout: this.#opts.chunkTimeout,
        })
      );
    }
    return this.#ttsByLang.get(lang)!;
  }

  synthesize(text: string, connOptions?: unknown, abortSignal?: AbortSignal): agentsTts.ChunkedStream {
    return this.#getTts().synthesize(
      text,
      connOptions as Parameters<cartesia.TTS["synthesize"]>[1],
      abortSignal,
    ) as agentsTts.ChunkedStream;
  }

  stream(options?: { connOptions?: unknown }): agentsTts.SynthesizeStream {
    return this.#getTts().stream(
      options as Parameters<cartesia.TTS["stream"]>[0],
    ) as agentsTts.SynthesizeStream;
  }

  async close(): Promise<void> {
    await this.#defaultTts.close();
    for (const t of this.#ttsByLang.values()) {
      if (t !== this.#defaultTts) await t.close();
    }
  }
}

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
  const measuredTotalMs = getMeasuredTurnStartMs(turn);

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
  const values = [
    ...(process.env.EARLYMARK_INBOUND_PHONE_NUMBERS || "")
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean),
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER,
    process.env.EARLYMARK_PHONE_NUMBER,
    process.env.TWILIO_PHONE_NUMBER,
  ]
    .filter(Boolean)
    .map((value) => normalizePhone(value))
    .filter(Boolean) as string[];
  return Array.from(new Set(values));
}

function normalizeWorkerSurface(value: string): CallType | null {
  if (value === "demo" || value === "inbound_demo" || value === "normal") return value;
  return null;
}

function getConfiguredWorkerRole() {
  return (process.env.VOICE_WORKER_ROLE || "tracey-all-agent").trim();
}

function getConfiguredHostId() {
  return (
    process.env.VOICE_HOST_ID ||
    process.env.HOSTNAME ||
    process.env.COMPUTERNAME ||
    "unknown-host"
  ).trim();
}

function getConfiguredWorkerSurfaces(): CallType[] {
  const raw = (process.env.VOICE_WORKER_SURFACES || "").trim();
  if (raw) {
    const parsed = raw
      .split(",")
      .map((value) => normalizeWorkerSurface(value.trim()))
      .filter(Boolean) as CallType[];
    if (parsed.length > 0) {
      return Array.from(new Set(parsed));
    }
  }

  const workerRole = getConfiguredWorkerRole();
  if (workerRole === "tracey-sales-agent") return ["demo", "inbound_demo"];
  if (workerRole === "tracey-customer-agent") return ["normal"];
  return ["demo", "inbound_demo", "normal"];
}

function inferConfiguredPrimaryProvider(callType: CallType): LlmProviderName {
  const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
  const configured = (
    isEarlymarkCall
      ? process.env.EARLYMARK_VOICE_LLM_PROVIDER
      : process.env.VOICE_LLM_PROVIDER
  )?.trim().toLowerCase();

  if (configured === "deepinfra") return "deepinfra";
  return "groq";
}

function resolveProviderBaseUrl(provider: LlmProviderName) {
  return provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.deepinfra.com/v1/openai";
}

function resolveProviderApiKey(provider: LlmProviderName) {
  return provider === "groq" ? process.env.GROQ_API_KEY || "" : process.env.DEEPINFRA_API_KEY || "";
}

function resolveProviderModel(callType: CallType, provider: LlmProviderName, isFallback: boolean) {
  const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
  const configuredModel = isEarlymarkCall
    ? process.env.EARLYMARK_VOICE_LLM_MODEL
    : process.env.VOICE_LLM_MODEL;
  const configuredFallbackModel = isEarlymarkCall
    ? process.env.EARLYMARK_VOICE_FALLBACK_LLM_MODEL
    : process.env.VOICE_FALLBACK_LLM_MODEL;

  if (!isFallback && configuredModel) {
    return configuredModel;
  }
  if (isFallback && configuredFallbackModel) {
    return configuredFallbackModel;
  }

  return provider === "groq"
    ? "llama-3.3-70b-versatile"
    : "meta-llama/Meta-Llama-3.1-8B-Instruct";
}

function resolveProviderTemperature(callType: CallType) {
  const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
  return Number(
    isEarlymarkCall
      ? (process.env.EARLYMARK_VOICE_LLM_TEMPERATURE || 0.1)
      : (process.env.VOICE_LLM_TEMPERATURE || 0.2)
  );
}

function resolveProviderMaxCompletionTokens(callType: CallType) {
  return Number(
    callType === "inbound_demo"
      ? (process.env.INBOUND_VOICE_LLM_MAX_COMPLETION_TOKENS || 32)
      : callType === "demo"
        ? (process.env.EARLYMARK_VOICE_LLM_MAX_COMPLETION_TOKENS || 40)
        : (process.env.VOICE_LLM_MAX_COMPLETION_TOKENS || 80)
  );
}

function buildProviderConfig(callType: CallType, provider: LlmProviderName, isFallback: boolean): LlmProviderConfig | null {
  const apiKey = resolveProviderApiKey(provider);
  if (!apiKey) return null;

  return {
    provider,
    model: resolveProviderModel(callType, provider, isFallback),
    apiKey,
    baseURL: resolveProviderBaseUrl(provider),
    temperature: resolveProviderTemperature(callType),
    maxCompletionTokens: resolveProviderMaxCompletionTokens(callType),
    isFallback,
  };
}

function getMeasuredTurnStartMs(turn: Pick<TurnAudit, "eouMs" | "transcriptionDelayMs" | "onUserTurnCompletedDelayMs" | "llmTtftMs" | "ttsTtfbMs">) {
  return (
    turn.eouMs +
    turn.transcriptionDelayMs +
    turn.onUserTurnCompletedDelayMs +
    turn.llmTtftMs +
    turn.ttsTtfbMs
  );
}

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveVoiceTurnTuning(callType: CallType): VoiceTurnTuning {
  const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
  const sttEndpointingMs = callType === "inbound_demo"
    ? readPositiveNumber(
      process.env.INBOUND_VOICE_STT_ENDPOINTING_MS,
      readPositiveNumber(process.env.EARLYMARK_VOICE_STT_ENDPOINTING_MS, 220),
    )
    : isEarlymarkCall
      ? readPositiveNumber(process.env.EARLYMARK_VOICE_STT_ENDPOINTING_MS, 220)
      : readPositiveNumber(process.env.VOICE_STT_ENDPOINTING_MS, 300);

  return {
    sttEndpointingMs,
    minConsecutiveSpeechDelayMs: isEarlymarkCall
      ? readPositiveNumber(process.env.EARLYMARK_VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS, 140)
      : readPositiveNumber(process.env.VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS, 180),
    minEndpointingDelayMs: isEarlymarkCall
      ? readPositiveNumber(process.env.EARLYMARK_VOICE_MIN_ENDPOINTING_DELAY_MS, 180)
      : readPositiveNumber(process.env.VOICE_MIN_ENDPOINTING_DELAY_MS, 250),
    maxEndpointingDelayMs: isEarlymarkCall
      ? readPositiveNumber(process.env.EARLYMARK_VOICE_MAX_ENDPOINTING_DELAY_MS, 550)
      : readPositiveNumber(process.env.VOICE_MAX_ENDPOINTING_DELAY_MS, 800),
    minInterruptionDurationMs: isEarlymarkCall
      ? readPositiveNumber(process.env.EARLYMARK_VOICE_MIN_INTERRUPTION_DURATION_MS, 260)
      : readPositiveNumber(process.env.VOICE_MIN_INTERRUPTION_DURATION_MS, 400),
    minInterruptionWords: callType === "inbound_demo"
      ? readPositiveNumber(
        process.env.INBOUND_VOICE_MIN_INTERRUPTION_WORDS,
        readPositiveNumber(process.env.EARLYMARK_VOICE_MIN_INTERRUPTION_WORDS, 1),
      )
      : isEarlymarkCall
        ? readPositiveNumber(process.env.EARLYMARK_VOICE_MIN_INTERRUPTION_WORDS, 2)
        : readPositiveNumber(process.env.VOICE_MIN_INTERRUPTION_WORDS, 3),
  };
}

class ProviderFallbackLLMStream extends livekitLlm.LLMStream {
  readonly #owner: ProviderFallbackLLM;
  readonly #primaryStream: livekitLlm.LLMStream;
  readonly #fallback: openai.LLM | null;
  readonly #primaryConfig: LlmProviderConfig;
  readonly #fallbackConfig: LlmProviderConfig | null;
  readonly #chatArgs: Parameters<openai.LLM["chat"]>[0];
  #hasBegunResponse = false;

  constructor(args: {
    owner: ProviderFallbackLLM;
    primaryStream: livekitLlm.LLMStream;
    fallback: openai.LLM | null;
    primaryConfig: LlmProviderConfig;
    fallbackConfig: LlmProviderConfig | null;
    chatArgs: Parameters<openai.LLM["chat"]>[0];
  }) {
    super(args.owner, {
      chatCtx: args.primaryStream.chatCtx,
      toolCtx: args.primaryStream.toolCtx,
      connOptions: args.primaryStream.connOptions,
    });
    this.#owner = args.owner;
    this.#primaryStream = args.primaryStream;
    this.#fallback = args.fallback;
    this.#primaryConfig = args.primaryConfig;
    this.#fallbackConfig = args.fallbackConfig;
    this.#chatArgs = args.chatArgs;
  }

  async #pipeStream(stream: livekitLlm.LLMStream) {
    for await (const chunk of stream) {
      if (this.abortController.signal.aborted) {
        stream.close();
        break;
      }
      if (chunk.delta) {
        this.#hasBegunResponse = true;
      }
      this.queue.put(chunk);
    }
  }

  protected async run(): Promise<void> {
    try {
      await this.#pipeStream(this.#primaryStream);
    } catch (error) {
      this.#owner.noteFailure(error);
      if (!this.#fallback || !this.#fallbackConfig || this.#hasBegunResponse) {
        throw error;
      }

      console.warn("[agent] Primary LLM stream failed before first token; retrying on fallback.", {
        primaryProvider: this.#primaryConfig.provider,
        fallbackProvider: this.#fallbackConfig.provider,
        error: error instanceof Error ? error.message : String(error),
      });

      const fallbackStream = this.#fallback.chat(this.#chatArgs);
      this.#owner.recordProviderSelection(this.#fallbackConfig);
      this.#owner.recordFallback();
      await this.#pipeStream(fallbackStream);
    } finally {
      this.#primaryStream.close();
    }
  }
}

class ProviderFallbackLLM extends livekitLlm.LLM {
  readonly #primary: openai.LLM;
  readonly #fallback: openai.LLM | null;
  readonly #primaryConfig: LlmProviderConfig;
  readonly #fallbackConfig: LlmProviderConfig | null;
  readonly #actualProviders = new Set<LlmProviderName>();
  readonly #actualModels = new Set<string>();
  #fallbackUsed = false;
  #fallbackCount = 0;
  #selectionCount = 0;
  #lastFailure: string | null = null;

  constructor(args: {
    primary: openai.LLM;
    fallback: openai.LLM | null;
    primaryConfig: LlmProviderConfig;
    fallbackConfig: LlmProviderConfig | null;
  }) {
    super();
    this.#primary = args.primary;
    this.#fallback = args.fallback;
    this.#primaryConfig = args.primaryConfig;
    this.#fallbackConfig = args.fallbackConfig;
  }

  label() {
    return this.#fallbackConfig
      ? `voice-fallback:${this.#primaryConfig.provider}->${this.#fallbackConfig.provider}`
      : `voice:${this.#primaryConfig.provider}`;
  }

  get model() {
    return this.#primaryConfig.model;
  }

  recordProviderSelection(config: LlmProviderConfig) {
    this.#selectionCount += 1;
    this.#actualProviders.add(config.provider);
    this.#actualModels.add(config.model);
  }

  recordFallback() {
    this.#fallbackUsed = true;
    this.#fallbackCount += 1;
  }

  noteFailure(error: unknown) {
    this.#lastFailure = error instanceof Error ? error.message : String(error);
  }

  getRunSummary(): LlmRunSummary {
    return {
      primaryProvider: this.#primaryConfig.provider,
      primaryModel: this.#primaryConfig.model,
      fallbackProvider: this.#fallbackConfig?.provider || null,
      fallbackModel: this.#fallbackConfig?.model || null,
      actualProviders: Array.from(this.#actualProviders),
      actualModels: Array.from(this.#actualModels),
      fallbackUsed: this.#fallbackUsed,
      fallbackCount: this.#fallbackCount,
      selectionCount: this.#selectionCount,
      lastFailure: this.#lastFailure,
    };
  }

  chat(args: Parameters<openai.LLM["chat"]>[0]) {
    try {
      const primaryStream = this.#primary.chat(args);
      this.recordProviderSelection(this.#primaryConfig);
      return new ProviderFallbackLLMStream({
        owner: this,
        primaryStream,
        fallback: this.#fallback,
        primaryConfig: this.#primaryConfig,
        fallbackConfig: this.#fallbackConfig,
        chatArgs: args,
      });
    } catch (error) {
      this.noteFailure(error);
      if (!this.#fallback || !this.#fallbackConfig) throw error;
      console.warn("[agent] Primary LLM chat setup failed; falling back.", {
        primaryProvider: this.#primaryConfig.provider,
        fallbackProvider: this.#fallbackConfig.provider,
        error: error instanceof Error ? error.message : String(error),
      });

      const fallbackStream = this.#fallback.chat(args);
      this.recordProviderSelection(this.#fallbackConfig);
      this.recordFallback();

      return new ProviderFallbackLLMStream({
        owner: this,
        primaryStream: fallbackStream,
        fallback: null,
        primaryConfig: this.#fallbackConfig,
        fallbackConfig: null,
        chatArgs: args,
      });
    }
  }

  prewarm() {
    this.#primary.prewarm();
    this.#fallback?.prewarm();
  }

  async aclose() {
    await Promise.allSettled([
      this.#primary.aclose(),
      this.#fallback?.aclose() || Promise.resolve(),
    ]);
  }
}

function createVoiceLlm(callType: CallType) {
  const primaryProvider = inferConfiguredPrimaryProvider(callType);
  const fallbackProvider: LlmProviderName = primaryProvider === "groq" ? "deepinfra" : "groq";
  const primaryConfig = buildProviderConfig(callType, primaryProvider, false);
  const fallbackConfig = buildProviderConfig(callType, fallbackProvider, true);

  if (!primaryConfig && !fallbackConfig) {
    throw new Error("[agent] Missing API key for both Groq and DeepInfra voice providers.");
  }

  const effectivePrimary = primaryConfig || fallbackConfig!;
  const effectiveFallback = primaryConfig ? fallbackConfig : null;
  const primaryLlm = new openai.LLM({
    model: effectivePrimary.model,
    apiKey: effectivePrimary.apiKey,
    baseURL: effectivePrimary.baseURL,
    temperature: effectivePrimary.temperature,
    maxCompletionTokens: effectivePrimary.maxCompletionTokens,
  });
  const fallbackLlm = effectiveFallback
    ? new openai.LLM({
      model: effectiveFallback.model,
      apiKey: effectiveFallback.apiKey,
      baseURL: effectiveFallback.baseURL,
      temperature: effectiveFallback.temperature,
      maxCompletionTokens: effectiveFallback.maxCompletionTokens,
    })
    : null;

  return {
    llm: new ProviderFallbackLLM({
      primary: primaryLlm,
      fallback: fallbackLlm,
      primaryConfig: effectivePrimary,
      fallbackConfig: effectiveFallback,
    }),
    primaryConfig: effectivePrimary,
    fallbackConfig: effectiveFallback,
  };
}

async function refreshVoiceGroundingIndex(force = false) {
  if (!force && groundingRefreshPromise) {
    return groundingRefreshPromise;
  }

  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();
  if (!appUrl || !secret) return;

  groundingRefreshPromise = (async () => {
    try {
      const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/voice-grounding-index`, {
        method: "GET",
        headers: {
          "x-voice-agent-secret": secret,
        },
      });

      if (!response.ok) {
        throw new Error(`voice-grounding-index returned ${response.status}`);
      }

      const payload = await response.json().catch(() => null);
      const entries = Array.isArray(payload?.groundings) ? payload.groundings : [];
      const nextCache = new Map<string, GroundingCacheEntry>();
      const now = Date.now();

      for (const entry of entries) {
        const grounding = entry?.grounding as WorkspaceVoiceGrounding | undefined;
        if (!grounding) continue;
        const normalizedCalledPhone = normalizePhone(
          (typeof entry?.calledPhoneNormalized === "string" && entry.calledPhoneNormalized) ||
          (typeof entry?.calledPhone === "string" && entry.calledPhone) ||
          grounding.businessPhone,
        );
        if (!normalizedCalledPhone) continue;

        nextCache.set(normalizedCalledPhone, {
          value: grounding,
          fetchedAt: now,
        });
      }

      groundingCache.clear();
      for (const [phone, entry] of nextCache.entries()) {
        groundingCache.set(phone, entry);
      }
    } catch (error) {
      console.warn("[agent] Failed to refresh voice grounding cache:", error);
    } finally {
      groundingRefreshPromise = null;
    }
  })();

  return groundingRefreshPromise;
}

function getCachedVoiceGrounding(calledPhone?: string | null) {
  const normalizedPhone = normalizePhone(calledPhone);
  if (!normalizedPhone) return null;

  const cached = groundingCache.get(normalizedPhone);
  if (!cached) {
    void refreshVoiceGroundingIndex().catch(() => {});
    return null;
  }

  if (Date.now() - cached.fetchedAt > VOICE_GROUNDING_CACHE_TTL_MS) {
    void refreshVoiceGroundingIndex(true).catch(() => {});
    return cached.value;
  }

  return cached.value;
}

function resolveCallType(initialCallType: CallType, calledPhone: string, roomName: string): CallType {
  if (initialCallType !== "normal") return initialCallType;
  if (roomName.startsWith("earlymark-inbound-")) {
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

function compactLines(lines: Array<string | null | undefined>, maxLines: number): string[] {
  return lines
    .map((line) => (line || "").trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

function getNormalModeInstructions(grounding?: WorkspaceVoiceGrounding | null): string[] {
  const mode = grounding?.customerContactMode || "review_approve";

  if (mode === "execute") {
    return [
      "The current Tracey for users mode is Execute.",
      "This same mode applies across customer calls and texts for this business.",
      "You may answer questions, qualify leads, and make normal business commitments that are clearly supported by the business rules and approved pricing.",
    ];
  }

  if (mode === "info_only") {
    return [
      "The current Tracey for users mode is Info only.",
      "This same mode applies across customer calls and texts for this business.",
      "You may answer, screen, and capture details, but do not make firm bookings, quotes, or outbound commitments. Offer to pass it to the team.",
    ];
  }

  return [
    "The current Tracey for users mode is Review & approve.",
    "This same mode applies across customer calls and texts for this business.",
    "You may answer questions and gather details, but if a booking, quote, or firm commitment would normally be made, say the team will confirm it shortly.",
  ];
}

function buildGroundingSnapshot(grounding?: WorkspaceVoiceGrounding | null): string {
  if (!grounding) return "";

  const facts = compactLines([
    grounding.tradeType ? `Trade: ${grounding.tradeType}` : null,
    grounding.serviceArea ? `Service area: ${grounding.serviceArea}${grounding.serviceRadiusKm ? ` (${grounding.serviceRadiusKm}km radius)` : ""}` : null,
    grounding.standardWorkHours ? `Working hours: ${grounding.standardWorkHours}` : null,
    grounding.website ? `Website: ${grounding.website}` : null,
    grounding.publicPhone ? `Public phone: ${grounding.publicPhone}` : grounding.businessPhone ? `Business phone: ${grounding.businessPhone}` : null,
    grounding.publicEmail ? `Public email: ${grounding.publicEmail}` : null,
    grounding.emergencyService ? `Emergency service: available${grounding.emergencySurcharge ? ` (+$${grounding.emergencySurcharge} surcharge)` : ""}` : "Emergency service: not enabled",
  ], 6);

  const preferences = compactLines(grounding.aiPreferences, 4);
  const serviceHighlights = compactLines(
    grounding.serviceRules.map((service) => {
      const extra = [service.priceRange, service.duration ? `est. ${service.duration}` : null].filter(Boolean).join(", ");
      return extra ? `${service.title} (${extra})` : service.title;
    }),
    4
  );
  const pricingHighlights = compactLines(
    grounding.pricingItems.map((item) => `${item.title}: ${item.description}`),
    4
  );
  const noGoHighlights = compactLines(grounding.noGoRules, 4);

  const sections: string[] = [];
  if (facts.length) sections.push(`Business facts:\n- ${facts.join("\n- ")}`);
  if (preferences.length) sections.push(`Important preferences:\n- ${preferences.join("\n- ")}`);
  if (serviceHighlights.length) sections.push(`Known services snapshot:\n- ${serviceHighlights.join("\n- ")}`);
  if (pricingHighlights.length) sections.push(`Approved pricing snapshot:\n- ${pricingHighlights.join("\n- ")}`);
  if (noGoHighlights.length) sections.push(`No-go rules snapshot:\n- ${noGoHighlights.join("\n- ")}`);
  return sections.join("\n\n");
}

function buildNormalPrompt(caller: CallerContext, grounding?: WorkspaceVoiceGrounding | null): string {
  const businessName = grounding?.businessName || getRepresentedBusinessName("normal", caller);
  const modeInstructions = getNormalModeInstructions(grounding).join("\n- ");
  const groundingSnapshot = buildGroundingSnapshot(grounding);
  return `You are Tracey, the AI phone assistant for ${businessName}.

IDENTITY
- You work for ${businessName}.
- You are an AI assistant, not a human staff member.
- If asked whether you are AI, answer yes briefly and move on.

STYLE
- Speak naturally, briefly, and confidently.
- Usually reply in 1 sentence, sometimes 2 if needed.
- Ask only 1 question at a time.
- Do not give long summaries or recaps at the end of the call.
- Sound Australian when speaking English, but do not force slang.

LANGUAGE
- Reply in the same language as the caller.
- If language detection is unclear, use Australian English.
- In non-English replies, keep wording simple and professional.
- Keep names, phone numbers, addresses, and quoted business facts exact.
- Do not switch back to English unless the caller does.

PRIMARY JOB
- First answer the caller's immediate question.
- Then do the next most useful thing:
  1. solve it if the answer is clearly supported
  2. collect missing details
  3. offer team follow-up if a firm answer is not safe
- Do not guess. If business facts, pricing, service coverage, hours, or rules are uncertain, use lookup tools first.

DECISION POLICY
- ${modeInstructions}

TRANSFER POLICY
- If the caller asks for a human or owner, first confirm that this is what they want.
- After confirmation, use the transfer_call tool.
- Do not transfer routine questions you can handle correctly.

TRUTH RULES
- Never invent pricing, availability, policies, service coverage, or contact details.
- If approved pricing is missing, say the team will confirm it.
- If you are not confident, be honest and offer follow-up.
- Make up to 2 honest attempts to help before offering manager follow-up.

${groundingSnapshot ? `BUSINESS SNAPSHOT\n${groundingSnapshot}\n\n` : ""}CALL HANDLING
- Keep momentum.
- Answer first, then guide.
- If the caller is finished, end briefly and politely.
- At around 8 minutes, begin wrapping up naturally and offer manager follow-up.
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

IDENTITY
- Introduce yourself as "Tracey, an AI assistant from Earlymark AI."
- You are a live example of the product, not the manager.
- If asked whether you are AI, answer yes briefly.

STYLE
- Be warm, confident, brief, and natural.
- Usually speak in 1 short sentence, then pause.
- Ask 1 focused question at a time.
- Keep English replies Australian in tone without forcing slang.
- Do not summarise the full call at the end.

LANGUAGE
- Reply in the same language as the caller.
- If unclear, use Australian English.
- Keep non-English replies simple and professional.
- Keep names, phone numbers, email addresses, and quoted business facts exact.
- Do not switch back to English unless the caller does.

PRIMARY JOB
- Identify pain points around missed calls, lead follow-up, quoting, booking, admin load, and response times.
- Move the caller toward either:
  1. a consultation with an Earlymark AI manager
  2. signing up on earlymark.ai
- Capture lead details before the call ends: first name, business name, business type, best phone number, and email if available.

SALES RULES
- If they ask what Earlymark does, answer in 1 short sentence first, then ask 1 short question.
- Answer the caller's immediate question before steering to the next step.
- If they mention a pain point, connect it briefly to Earlymark AI and ask a follow-up.
- Do not wait until the end to collect details.
- Use log_lead once you have enough real information.
- Do not call log_lead unless you have at least first name, business name, phone, and one real pain point or follow-up reason.
- Do not speak tool syntax or function-call text out loud.

TRUTH RULES
- Never invent features, integrations, pricing, timelines, or guarantees.
- Do not claim CRM integration.
- If pricing, onboarding detail, or implementation detail is not confirmed, say a manager will confirm it.
- If unsure, make up to 2 honest attempts to help, then offer manager follow-up.

KNOWN CALLER DETAILS
- First name: ${caller.firstName || "unknown"}
- Business name: ${caller.businessName || "unknown"}
- Phone: ${caller.phone || "unknown"}

CALL HANDLING
- The system has already opened with: "Hi, is this ${caller.firstName || "there"}${caller.businessName ? ` from ${caller.businessName}` : ""}?"
- Wait for the caller to answer before introducing yourself.
- Then say: "Hi, this is Tracey from Earlymark AI" and continue naturally.
- Keep the reply after that introduction very short: 1 short sentence plus 1 short question.
- If the caller says goodbye, keep the farewell brief.
- This call wraps at around 3 minutes and disconnects at 5 minutes if still active.`;
}

function buildInboundDemoPrompt(caller: CallerContext): string {
  return `You are Tracey, an AI assistant from Earlymark AI.

This is an inbound Earlymark AI sales call.

IDENTITY
- Introduce yourself as "Tracey, an AI assistant for Earlymark AI."
- You work for Earlymark AI, not the caller's business.
- If asked whether you are AI, answer yes briefly.

STYLE
- Keep the first substantive answer under 10 words if possible.
- After that, keep replies short unless asked for detail.
- Usually speak in 1 short sentence, then pause.
- Ask 1 question at a time.
- Keep English delivery Australian and natural.
- Do not give long end-of-call recaps.

LANGUAGE
- Reply in the same language as the caller.
- If unclear, use Australian English.
- Keep non-English replies simple and professional.
- Keep names, phone numbers, email addresses, and quoted business facts exact.
- Do not switch back to English unless the caller does.

PRIMARY JOB
- Explain what Earlymark AI does.
- Capture lead details: first name, business name, best phone, email, and business type.
- Move the caller toward earlymark.ai or a manager follow-up.

RULES
- This is a sales and qualification call, not a receptionist call.
- Answer the caller's question before steering toward lead capture or sign-up.
- If they ask how to sign up or show clear buying intent, switch to closing mode immediately.
- In closing mode: confirm intent, point them to earlymark.ai, collect missing details, and log the lead.
- Do not delay a sign-up request with extra discovery.
- Do not call log_lead unless you have at least first name, business name, phone, and a real follow-up reason.
- Do not speak tool syntax or function-call text out loud.

TRUTH RULES
- Never invent integrations, pricing, timelines, or unsupported features.
- If pricing, onboarding detail, or implementation detail is not confirmed, say a manager will confirm it.
- If unsure, make up to 2 honest attempts to help, then offer manager follow-up.

KNOWN CALLER DETAILS
- First name: ${caller.firstName || "unknown"}
- Business name: ${caller.businessName || "unknown"}
- Phone: ${caller.phone || "unknown"}
- Called Earlymark number: ${caller.calledPhone || "unknown"}

CALL HANDLING
- Keep the conversation focused on what Earlymark AI can do and the next step.
- Point them to earlymark.ai when they ask how to proceed or are ready to buy.
- Keep farewells brief.
- This call wraps at around 3 minutes and disconnects at 5 minutes if still active.`;
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
    return "Thanks for your time. Head to earlymark.ai to find out more. Bye for now.";
  }
  return "No worries. Thanks for calling. Bye for now.";
}

function extractTextFromConversationItem(item: unknown): string | null {
  const textContent =
    item && typeof item === "object" && "textContent" in item
      ? (item as { textContent?: unknown }).textContent
      : "";
  const text = typeof textContent === "string" ? textContent.trim() : "";
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
  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();

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

function getVoiceAgentRuntimeFingerprint() {
  const source = VOICE_AGENT_RUNTIME_ENV_KEYS
    .map((key) => [key, (process.env[key] || "").trim()] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  const serialized = JSON.stringify(source);

  let hash = 5381;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = ((hash << 5) + hash) ^ serialized.charCodeAt(index);
  }

  return `va_${(hash >>> 0).toString(16)}`;
}

function buildVoiceAgentRuntimeSummary() {
  return {
    hostId: getConfiguredHostId(),
    workerRole: getConfiguredWorkerRole(),
    surfaceSet: getConfiguredWorkerSurfaces(),
    capacity: buildCapacitySummary(),
    llmProvider: {
      earlymarkPrimary: inferConfiguredPrimaryProvider("demo"),
      earlymarkFallback: inferConfiguredPrimaryProvider("demo") === "groq" ? "deepinfra" : "groq",
      customerPrimary: inferConfiguredPrimaryProvider("normal"),
      customerFallback: inferConfiguredPrimaryProvider("normal") === "groq" ? "deepinfra" : "groq",
    },
    llmModel: {
      earlymarkPrimary: resolveProviderModel("demo", inferConfiguredPrimaryProvider("demo"), false),
      earlymarkFallback: resolveProviderModel(
        "demo",
        inferConfiguredPrimaryProvider("demo") === "groq" ? "deepinfra" : "groq",
        true,
      ),
      customerPrimary: resolveProviderModel("normal", inferConfiguredPrimaryProvider("normal"), false),
      customerFallback: resolveProviderModel(
        "normal",
        inferConfiguredPrimaryProvider("normal") === "groq" ? "deepinfra" : "groq",
        true,
      ),
    },
    sttModel: process.env.VOICE_STT_MODEL || "nova-3",
    ttsVoiceId: process.env.VOICE_TTS_VOICE_ID || "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
    latencyEnabled: process.env.VOICE_LATENCY_ENABLED ?? "true",
    openerBankEnabled: process.env.VOICE_OPENER_BANK_ENABLED ?? "true",
    guardEnabled: process.env.VOICE_GUARD_ENABLED ?? "true",
    targetCallTypes: process.env.VOICE_LATENCY_TARGET_CALL_TYPES || "normal",
    knownInboundNumbers: getKnownEarlymarkNumbers(),
    groundingCacheEntries: groundingCache.size,
  };
}

async function postVoiceAgentStatus() {
  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();

  if (!appUrl || !secret) {
    console.warn("[agent] Skipping worker-status heartbeat because APP URL or webhook secret is missing.");
    return;
  }

  const route = `${appUrl.replace(/\/$/, "")}/api/internal/voice-agent-status`;
  const response = await fetch(route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-voice-agent-secret": secret,
    },
    body: JSON.stringify({
      hostId: getConfiguredHostId(),
      workerRole: getConfiguredWorkerRole(),
      surfaceSet: getConfiguredWorkerSurfaces(),
      deployGitSha: DEPLOY_GIT_SHA,
      runtimeFingerprint: getVoiceAgentRuntimeFingerprint(),
      ready: isWorkerAcceptingCalls(),
      activeCalls: getActiveCallCount(),
      pid: process.pid,
      startedAt: AGENT_STARTED_AT,
      heartbeatAt: new Date().toISOString(),
      summary: buildVoiceAgentRuntimeSummary(),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Worker status heartbeat failed: ${response.status} ${body}`);
  }
}

function buildWorkspaceLookupTools(grounding: WorkspaceVoiceGrounding) {
  const findMatches = (query: string, values: string[]) => {
    const normalized = normalizeTranscript(query);
    if (!normalized) return values.slice(0, 3);
    const matches = values.filter((value) => normalizeTranscript(value).includes(normalized));
    return matches.length ? matches.slice(0, 4) : values.filter((value) => {
      const haystack = normalizeTranscript(value);
      return normalized.split(" ").some((token) => token && haystack.includes(token));
    }).slice(0, 4);
  };

  return {
    lookup_service_information: livekitLlm.tool({
      description: "Look up approved services, service notes, and what the business actually offers.",
      parameters: z.object({
        query: z.string().describe("Service or job question from the caller"),
      }),
      execute: async ({ query }) => {
        const services = grounding.serviceRules.map((service) => {
          const extra = [service.priceRange, service.duration ? `est. ${service.duration}` : null].filter(Boolean).join(", ");
          return extra ? `${service.title} (${extra})` : service.title;
        });
        const matches = findMatches(query, services);
        if (!matches.length) {
          return "No matching approved service information was found. Do not invent coverage; offer to pass the question to the team.";
        }
        return `Approved service information:\n- ${matches.join("\n- ")}`;
      },
    }),
    lookup_pricing: livekitLlm.tool({
      description: "Look up approved pricing notes or call-out information for this business.",
      parameters: z.object({
        query: z.string().describe("Service or pricing question from the caller"),
      }),
      execute: async ({ query }) => {
        const pricing = grounding.pricingItems.map((item) => `${item.title}: ${item.description}`);
        const matches = findMatches(query, pricing);
        if (!matches.length) {
          return "No approved pricing entry was found for that request. Do not quote a made-up price; say the team will confirm it.";
        }
        return `Approved pricing notes:\n- ${matches.join("\n- ")}`;
      },
    }),
    lookup_business_details: livekitLlm.tool({
      description: "Look up business details like hours, service area, contact details, website, address, and emergency policy.",
      parameters: z.object({
        topic: z.enum(["hours", "service_area", "contact", "website", "address", "emergency", "general"]).describe("Which business detail to look up"),
      }),
      execute: async ({ topic }) => {
        if (topic === "hours") {
          return grounding.standardWorkHours
            ? `Working hours: ${grounding.standardWorkHours}`
            : "Working hours are not recorded. Offer to have the team confirm them.";
        }
        if (topic === "service_area") {
          return grounding.serviceArea
            ? `Service area: ${grounding.serviceArea}${grounding.serviceRadiusKm ? ` (${grounding.serviceRadiusKm}km radius)` : ""}`
            : "Service area is not recorded. Offer to have the team confirm coverage.";
        }
        if (topic === "contact") {
          return [
            grounding.publicPhone ? `Phone: ${grounding.publicPhone}` : grounding.businessPhone ? `Phone: ${grounding.businessPhone}` : null,
            grounding.publicEmail ? `Email: ${grounding.publicEmail}` : null,
          ].filter(Boolean).join("\n") || "Public contact details are not recorded.";
        }
        if (topic === "website") {
          return grounding.website ? `Website: ${grounding.website}` : "Website is not recorded.";
        }
        if (topic === "address") {
          return grounding.physicalAddress ? `Address: ${grounding.physicalAddress}` : "Physical address is not recorded.";
        }
        if (topic === "emergency") {
          return grounding.emergencyService
            ? `Emergency service is available${grounding.emergencySurcharge ? ` with a $${grounding.emergencySurcharge} surcharge` : ""}.`
            : "Emergency service is not enabled.";
        }
        return [
          `Business: ${grounding.businessName}`,
          grounding.tradeType ? `Trade: ${grounding.tradeType}` : null,
          grounding.serviceArea ? `Service area: ${grounding.serviceArea}` : null,
          grounding.website ? `Website: ${grounding.website}` : null,
        ].filter(Boolean).join("\n");
      },
    }),
    lookup_no_go_rules: livekitLlm.tool({
      description: "Check no-go rules or excluded work before declining a caller request.",
      parameters: z.object({
        query: z.string().describe("The work type or question that might be excluded"),
      }),
      execute: async ({ query }) => {
        if (!grounding.noGoRules.length) {
          return "No explicit no-go rules are recorded. Do not invent a rejection.";
        }
        const matches = findMatches(query, grounding.noGoRules);
        if (!matches.length) {
          return "No explicit no-go rule matched that request. Do not decline it unless another approved rule clearly applies.";
        }
        return `Relevant no-go rules:\n- ${matches.join("\n- ")}`;
      },
    }),
  };
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

    const transferCallTool = livekitLlm.tool({
      description: "Transfer the call to the human business owner or leave an urgent message if they are unavailable.",
      parameters: z.object({
        reason: z.string().describe("Why the caller wants to speak to the owner"),
      }),
      execute: async ({ reason }) => {
        console.log(`[agent] Executing transfer_call tool. Reason: ${reason}`);

        const currentHour = new Date().getHours();
        const isOnClock = currentHour >= 8 && currentHour < 17;

        if (isOnClock) {
          console.log(`[agent] Transferring call ${JSON.stringify({ callId, reason })}`);
          return "Transferring you to human staff. Please hold on the line.";
        }

        return "The owner is currently out of the office or on-site. I am flagging this message as URGENT for them so they see it as soon as possible. Can I get a detailed message for them?";
      },
    });

    const defaultTts = new cartesia.TTS({
      model: "sonic-3",
      voice: process.env.VOICE_TTS_VOICE_ID || "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
      language: process.env.VOICE_TTS_LANGUAGE || "en-AU",
      chunkTimeout: Number(process.env.VOICE_TTS_CHUNK_TIMEOUT_MS || 1500),
    });
    const ttsOpts = {
      model: "sonic-3",
      voice: process.env.VOICE_TTS_VOICE_ID || "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
      chunkTimeout: Number(process.env.VOICE_TTS_CHUNK_TIMEOUT_MS || 1500),
    };
    const tts = new MultilingualTTS(defaultTts, ttsOpts);

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
    const voiceTurnTuning = resolveVoiceTurnTuning(callType);
    const stt = new deepgram.STT({
      model: (process.env.VOICE_STT_MODEL || "nova-3") as ConstructorParameters<typeof deepgram.STT>[0]["model"],
      language: "multi",
      detectLanguage: true,
      interimResults: true,
      endpointing: voiceTurnTuning.sttEndpointingMs,
      noDelay: true,
      punctuate: true,
      smartFormat: true,
    });
    markCallStarted();
    let activeCallReleased = false;
    const releaseActiveCall = () => {
      if (activeCallReleased) return;
      activeCallReleased = true;
      markCallEnded();
    };
    ctx.addShutdownCallback(async () => {
      releaseActiveCall();
    });

    const caller: CallerContext = {
      callType,
      firstName: callerFirstName,
      businessName: callerBusiness,
      phone: callerPhone,
      calledPhone,
    };

    const normalVoiceGrounding =
      callType === "normal"
        ? getCachedVoiceGrounding(calledPhone)
        : null;
    if (callType === "normal" && !normalVoiceGrounding) {
      void refreshVoiceGroundingIndex().catch(() => {});
    }

    const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
    const { llm, primaryConfig: primaryLlmConfig, fallbackConfig: fallbackLlmConfig } = createVoiceLlm(callType);
    llm.prewarm();

    const logPrefix = isEarlymarkCall ? "[TRACEY_EARLYMARK]" : "[TRACEY_USER]";
    const greeting = getGreeting(callType, caller);
    const wrapUpMs = isEarlymarkCall ? DEMO_WRAP_UP_MS : NORMAL_WRAP_UP_MS;
    const hardCutMs = isEarlymarkCall ? DEMO_HARD_CUT_MS : NORMAL_HARD_CUT_MS;
    const wrapUpScript = isEarlymarkCall ? DEMO_WRAP_UP_SCRIPT : WRAP_UP_SCRIPT;
    const hardCutInstructions = isEarlymarkCall
      ? "Time is up. If you already have enough real details, use the log_lead tool now. Give a brief farewell and push one clear CTA: manager follow-up or earlymark.ai."
      : "Thank the caller for their time, let them know their message will be passed on, and say goodbye.";
    const voiceLatencyConfig = resolveVoiceLatencyConfig({
      callType,
      llmProvider: primaryLlmConfig.provider,
      llmModel: primaryLlmConfig.model,
      llmApiKey: primaryLlmConfig.apiKey,
      llmBaseURL: primaryLlmConfig.baseURL,
    });
    const openerAudioCache: Map<OpenerId, Promise<AudioFrame>> = voiceLatencyConfig.openerBankEnabled
      ? getSharedOpenerAudioCache(defaultTts, logPrefix)
      : new Map<OpenerId, Promise<AudioFrame>>();

    console.log(`${logPrefix} Call started ${JSON.stringify({
      callId,
      room: ctx.room.name,
      participant: participant.identity,
      callType,
      callerFirstName,
      callerBusiness,
      callerPhone,
      calledPhone,
      llmProvider: primaryLlmConfig.provider,
      llmModel: primaryLlmConfig.model,
      llmFallbackProvider: fallbackLlmConfig?.provider || null,
      llmFallbackModel: fallbackLlmConfig?.model || null,
      customerContactMode: normalVoiceGrounding?.customerContactMode || null,
      groundedWorkspaceId: normalVoiceGrounding?.workspaceId || null,
      groundingCacheHit: Boolean(normalVoiceGrounding),
      maxConcurrentCalls: getMaxConcurrentCalls(),
      voiceLatency: {
        enabled: voiceLatencyConfig.enabled,
        openerBankEnabled: voiceLatencyConfig.openerBankEnabled,
        guardEnabled: voiceLatencyConfig.guardEnabled,
        targetCallTypes: voiceLatencyConfig.targetCallTypes,
        openerConfidenceThreshold: voiceLatencyConfig.openerConfidenceThreshold,
        guardTimeoutMs: voiceLatencyConfig.guardTimeoutMs,
      },
      tuning: voiceTurnTuning,
    })}`);
    if (voiceLatencyConfig.enabled) {
      console.log(
        `${logPrefix} [VOICE_LATENCY] ${JSON.stringify({
          phaseTwoBacklog: getPhaseTwoBacklog(),
        })}`
      );
    }

    const normalLookupTools = normalVoiceGrounding ? buildWorkspaceLookupTools(normalVoiceGrounding) : {};
    const tools = isEarlymarkCall
      ? {
        log_lead: logLeadTool,
        transfer_call: transferCallTool,
      }
      : {
        transfer_call: transferCallTool,
        ...normalLookupTools,
      };

    const agent = new voice.Agent({
      instructions: isEarlymarkCall ? buildEarlymarkPrompt(callType, caller) : buildNormalPrompt(caller, normalVoiceGrounding),
      stt,
      llm,
      tts,
      tools,
      turnDetection: "stt",
      minConsecutiveSpeechDelay: voiceTurnTuning.minConsecutiveSpeechDelayMs,
    });

    // Explicitly subscribe to SIP audio tracks as they arrive.
    // Earlier regressions showed that relying on the default path can leave STT with no caller audio.
    ctx.room.on("trackPublished", (pub: RemoteTrackPublication, p: RemoteParticipant) => {
      console.log(`${logPrefix} [TRACK] published: kind=${String(pub.kind)} participant=${p.identity}`);
      try { pub.setSubscribed?.(true); } catch { /* ignore */ }
    });
    ctx.room.on(
      "trackSubscribed",
      (
        track: RemoteTrack,
        _pub: RemoteTrackPublication,
        p: RemoteParticipant,
      ) => {
      console.log(`${logPrefix} [TRACK] subscribed: kind=${String(track.kind)} participant=${p.identity}`);
      },
    );
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
    const voiceLatencyAudit: VoiceLatencyAudit = {
      classifierMs: [],
      guardMs: [],
      openerLeadMs: [],
      openerGapMs: [],
      openerHits: 0,
      openerCacheMisses: 0,
      guardTimeouts: 0,
      guardEligibleTurns: 0,
      openerUsage: {},
    };
    let activeVoiceTurn: ActiveVoiceTurnState = {
      prediction: null,
      guardPromise: null,
      guardTranscript: null,
      guardStartedAt: null,
    };
    let pendingLatencyTurn: PendingLatencyTurn | null = null;
    let turnCounter = 0;
    let userTurnCounter = 0;
    let lastEmpatheticTurnIndex = -100;
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

    const resetActiveVoiceTurn = () => {
      activeVoiceTurn = {
        prediction: null,
        guardPromise: null,
        guardTranscript: null,
        guardStartedAt: null,
      };
    };

    const shouldReuseGuardDecision = (candidateTranscript: string) => {
      const existingTranscript = (activeVoiceTurn.guardTranscript || "").trim().toLowerCase();
      const nextTranscript = candidateTranscript.trim().toLowerCase();
      if (!existingTranscript || !nextTranscript) return false;
      return nextTranscript.startsWith(existingTranscript) || existingTranscript.startsWith(nextTranscript);
    };

    const primeVoiceGuard = (transcript: string, prediction: VoiceTurnPrediction) => {
      if (!shouldPrimeVoiceGuard(prediction, transcript, voiceLatencyConfig)) return;
      if (activeVoiceTurn.guardPromise && shouldReuseGuardDecision(transcript)) {
        return;
      }

      voiceLatencyAudit.guardEligibleTurns += 1;
      activeVoiceTurn.prediction = prediction;
      activeVoiceTurn.guardTranscript = transcript;
      activeVoiceTurn.guardStartedAt = Date.now();
      activeVoiceTurn.guardPromise = runVoiceGuardDecision({
        transcript,
        prediction,
        config: voiceLatencyConfig,
      });
    };

    const resolveGuardDecision = async (transcript: string, prediction: VoiceTurnPrediction) => {
      if (!shouldPrimeVoiceGuard(prediction, transcript, voiceLatencyConfig)) return null;
      if (!activeVoiceTurn.guardPromise || !shouldReuseGuardDecision(transcript)) {
        primeVoiceGuard(transcript, prediction);
      }
      if (!activeVoiceTurn.guardPromise) return null;

      const startedAt = activeVoiceTurn.guardStartedAt || Date.now();
      const decision = await activeVoiceTurn.guardPromise;
      voiceLatencyAudit.guardMs.push(Date.now() - startedAt);
      if (decision?.timedOut) {
        voiceLatencyAudit.guardTimeouts += 1;
      }
      return decision;
    };

    const session = new voice.AgentSession({
      turnDetection: "stt",
      voiceOptions: {
        preemptiveGeneration: true,
        minEndpointingDelay: voiceTurnTuning.minEndpointingDelayMs,
        maxEndpointingDelay: voiceTurnTuning.maxEndpointingDelayMs,
        minInterruptionDuration: voiceTurnTuning.minInterruptionDurationMs,
        minInterruptionWords: voiceTurnTuning.minInterruptionWords,
        allowInterruptions: true,
      },
    });
    await session.start({
      agent,
      room: ctx.room,
      inputOptions: {
        noiseCancellation: NoiseCancellation(),
      },
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

      if (pendingLatencyTurn && ev.source === "say" && pendingLatencyTurn.openerSpeechCreatedAt === null) {
        pendingLatencyTurn.openerSpeechCreatedAt = ev.createdAt;
      }

      if (
        pendingLatencyTurn &&
        ev.source === "generate_reply" &&
        turn.transcript === pendingLatencyTurn.transcript &&
        pendingLatencyTurn.openerSpeechCreatedAt !== null
      ) {
        voiceLatencyAudit.openerGapMs.push(Math.max(0, ev.createdAt - pendingLatencyTurn.openerSpeechCreatedAt));
        pendingLatencyTurn = null;
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
      const metrics = ev.metrics as Record<string, unknown> & {
        type?: string;
        speechId?: string;
        durationMs?: number;
        ttftMs?: number;
        ttfbMs?: number;
        endOfUtteranceDelayMs?: number;
        transcriptionDelayMs?: number;
        onUserTurnCompletedDelayMs?: number;
      };
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
      const item = ev.item as { id?: string; type?: string; role?: string; textContent?: string } | null;
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
      if (isDisconnecting) return;

      const transcript = (ev.transcript || "").trim();
      if (!transcript) return;

      if (!ev.isFinal) {
        if (!voiceLatencyConfig.enabled || !isMeaningfulUserTurn(transcript)) return;

        const classifierStartedAt = Date.now();
        const interimPrediction = predictVoiceTurn(transcript, "interim");
        voiceLatencyAudit.classifierMs.push(Date.now() - classifierStartedAt);
        activeVoiceTurn.prediction = interimPrediction;
        primeVoiceGuard(transcript, interimPrediction);
        return;
      }

      if (!isMeaningfulUserTurn(transcript)) {
        console.log(`[voice-filter] Dropping low-signal transcript: "${transcript}"`);
        pendingLatencyTurn = null;
        session.clearUserTurn();
        resetActiveVoiceTurn();
        return;
      }

      userTurnCounter += 1;

      const classifierStartedAt = Date.now();
      const finalPrediction = predictVoiceTurn(transcript, "final");
      voiceLatencyAudit.classifierMs.push(Date.now() - classifierStartedAt);
      activeVoiceTurn.prediction = finalPrediction;

      if (isGoodbyeTurn(transcript)) {
        isDisconnecting = true;
        pendingLatencyTurn = null;
        session.clearUserTurn();
        resetActiveVoiceTurn();
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
          ctx.room.disconnect().catch(() => { });
        }, GOODBYE_DISCONNECT_BUFFER_MS);
        return;
      }

      let guardDecision: GuardDecision | null = null;
      let openerEntry: OpenerBankEntry | null = null;

      (tts as MultilingualTTS).setReplyLanguage(ev.language);

      if (
        voiceLatencyConfig.enabled &&
        voiceLatencyConfig.openerBankEnabled &&
        finalPrediction.allowOpener &&
        finalPrediction.confidence >= voiceLatencyConfig.openerConfidenceThreshold
      ) {
        guardDecision = await resolveGuardDecision(transcript, finalPrediction);
        openerEntry = resolveOpenerEntry({
          prediction: finalPrediction,
          guardDecision,
          userTurnIndex: userTurnCounter,
          lastEmpatheticTurnIndex,
          empathyTurnGap: voiceLatencyConfig.empathyTurnGap,
        });

        if (openerEntry) {
          const openerFrame = await getCachedOpenerAudioFrame(openerAudioCache, openerEntry.id, 50);
          if (openerFrame) {
            session.clearUserTurn();

            pendingLatencyTurn = {
              transcript,
              finalCreatedAt: ev.createdAt,
              openerEntry,
              guardDecision,
              prediction: finalPrediction,
              openerSpeechCreatedAt: null,
            };

            session.say(openerEntry.text, {
              audio: audioFrameToReadableStream(openerFrame),
              allowInterruptions: true,
              addToChatCtx: false,
            });

            pendingUserTurns.push({
              transcript,
              createdAt: ev.createdAt,
              language: ev.language,
            });

            session.generateReply({
              userInput: transcript,
              instructions: buildVoiceFollowupInstructions({
                prediction: finalPrediction,
                openerEntry,
                guardDecision,
              }),
            });

            voiceLatencyAudit.openerHits += 1;
            voiceLatencyAudit.openerLeadMs.push(Math.max(0, Date.now() - ev.createdAt));
            voiceLatencyAudit.openerUsage[openerEntry.id] = (voiceLatencyAudit.openerUsage[openerEntry.id] || 0) + 1;
            if (openerEntry.empathetic) {
              lastEmpatheticTurnIndex = userTurnCounter;
            }

            console.log(
              `[voice-latency] ${JSON.stringify({
                callId,
                room: ctx.room.name,
                participant: participant.identity,
                transcript,
                prediction: {
                  intent: finalPrediction.intent,
                  confidence: finalPrediction.confidence,
                  riskLevel: finalPrediction.riskLevel,
                  route: finalPrediction.route,
                  reasons: finalPrediction.reasons,
                },
                guardDecision,
                openerId: openerEntry.id,
                openerText: openerEntry.text,
              })}`
            );

            resetActiveVoiceTurn();
            return;
          }

          voiceLatencyAudit.openerCacheMisses += 1;
        }
      }

      pendingLatencyTurn = null;
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
          voiceLatency: {
            prediction: {
              intent: finalPrediction.intent,
              confidence: finalPrediction.confidence,
              riskLevel: finalPrediction.riskLevel,
              route: finalPrediction.route,
            },
            guardDecision,
            openerId: openerEntry?.id || null,
          },
        })}`
      );
      resetActiveVoiceTurn();
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
          ctx.room.disconnect().catch(() => { });
        }, 10_000);
      } catch (err) {
        console.error("[agent] Hard-cut disconnect failed:", err);
        ctx.room.disconnect().catch(() => { });
      }
    }, hardCutMs);

    ctx.room.on("disconnected", () => {
      if (wrapUpTimer) clearTimeout(wrapUpTimer);
      if (hardCutTimer) clearTimeout(hardCutTimer);
      if (goodbyeTimer) clearTimeout(goodbyeTimer);

      const turnSummaries = Array.from(turnAudits.values())
        .sort((a, b) => a.turnIndex - b.turnIndex)
        .map(summarizeTurnLatency);
      const measuredTurnStarts = turnSummaries
        .map((turn) => turn.timings.measuredTotalMs)
        .filter((value) => Number.isFinite(value) && value > 0);
      const firstUserResponseTurn = turnSummaries.find((turn) => turn.userInitiated && Boolean(turn.transcript));
      const llmRunSummary = llm.getRunSummary();
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
        totalTurnStartAvgMs: avg(measuredTurnStarts),
        firstTurnStartMs: firstUserResponseTurn?.timings.measuredTotalMs || 0,
        voiceClassifierAvgMs: avg(voiceLatencyAudit.classifierMs),
        voiceGuardAvgMs: avg(voiceLatencyAudit.guardMs),
        openerLeadAvgMs: avg(voiceLatencyAudit.openerLeadMs),
        openerGapAvgMs: avg(voiceLatencyAudit.openerGapMs),
        openerHits: voiceLatencyAudit.openerHits,
        openerCacheMisses: voiceLatencyAudit.openerCacheMisses,
        guardTimeouts: voiceLatencyAudit.guardTimeouts,
        guardEligibleTurns: voiceLatencyAudit.guardEligibleTurns,
        openerUsage: voiceLatencyAudit.openerUsage,
        turns: turnSummaries,
      };

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
            voiceClassifier: voiceLatencyAudit.classifierMs.length,
            voiceGuard: voiceLatencyAudit.guardMs.length,
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
            totalTurnStartAvgMs: latency.totalTurnStartAvgMs,
            firstTurnStartMs: latency.firstTurnStartMs,
            voiceClassifierAvgMs: avg(voiceLatencyAudit.classifierMs),
            voiceGuardAvgMs: avg(voiceLatencyAudit.guardMs),
            openerLeadAvgMs: avg(voiceLatencyAudit.openerLeadMs),
            openerGapAvgMs: avg(voiceLatencyAudit.openerGapMs),
            openerHits: voiceLatencyAudit.openerHits,
            openerCacheMisses: voiceLatencyAudit.openerCacheMisses,
            guardTimeouts: voiceLatencyAudit.guardTimeouts,
            openerUsage: voiceLatencyAudit.openerUsage,
          },
          llmRouting: llmRunSummary,
          turns: turnSummaries,
        })}`
      );

      const transcriptText = transcriptTurns
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((turn) => `${turn.role === "assistant" ? "Tracey" : "Caller"}: ${turn.text}`)
        .join("\n");

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
          llmProvider: primaryLlmConfig.provider,
          llmModel: primaryLlmConfig.model,
          llmFallbackProvider: fallbackLlmConfig?.provider || null,
          llmFallbackModel: fallbackLlmConfig?.model || null,
          llmActualProviders: llmRunSummary.actualProviders,
          llmActualModels: llmRunSummary.actualModels,
          llmFallbackUsed: llmRunSummary.fallbackUsed,
          llmFallbackCount: llmRunSummary.fallbackCount,
          llmSelectionCount: llmRunSummary.selectionCount,
          llmLastFailure: llmRunSummary.lastFailure,
          isEarlymarkCall,
          maxConcurrentCalls: getMaxConcurrentCalls(),
          voiceTurnTuning,
          groundingCacheHit: Boolean(normalVoiceGrounding),
          voiceLatency: {
            enabled: voiceLatencyConfig.enabled,
            openerBankEnabled: voiceLatencyConfig.openerBankEnabled,
            guardEnabled: voiceLatencyConfig.guardEnabled,
            targetCallTypes: voiceLatencyConfig.targetCallTypes,
          },
        },
        startedAt: callStartedAt.toISOString(),
        endedAt: new Date().toISOString(),
      }).catch((error) => {
        console.error("[agent] Failed to persist voice call:", error);
      });

      releaseActiveCall();
    });
  },
});

let workerBackgroundTasksStarted = false;

export function startVoiceWorkerBackgroundTasks(logPrefix = "[agent]") {
  if (workerBackgroundTasksStarted) return;
  workerBackgroundTasksStarted = true;

  setWorkerBootReady(true);
  try {
    const warmTts = new cartesia.TTS({
      model: "sonic-3",
      voice: process.env.VOICE_TTS_VOICE_ID || "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
      language: process.env.VOICE_TTS_LANGUAGE || "en-AU",
      chunkTimeout: Number(process.env.VOICE_TTS_CHUNK_TIMEOUT_MS || 1500),
    });
    getSharedOpenerAudioCache(warmTts, logPrefix);
  } catch (error) {
    console.warn(`${logPrefix} Failed to warm opener audio cache:`, error);
  }
  void refreshVoiceGroundingIndex(true).catch((error) => {
    console.warn(`${logPrefix} Initial voice grounding cache warm failed:`, error);
  });
  const groundingRefreshTimer = setInterval(() => {
    void refreshVoiceGroundingIndex(true).catch((error) => {
      console.warn(`${logPrefix} Voice grounding cache refresh failed:`, error);
    });
  }, VOICE_GROUNDING_CACHE_TTL_MS);
  groundingRefreshTimer.unref?.();

  void postVoiceAgentStatus().catch((error) => {
    console.error(`${logPrefix} Failed to post worker-status heartbeat:`, error);
  });
  const heartbeatTimer = setInterval(() => {
    void postVoiceAgentStatus().catch((error) => {
      console.error(`${logPrefix} Failed to post worker-status heartbeat:`, error);
    });
  }, VOICE_AGENT_HEARTBEAT_MS);
  heartbeatTimer.unref?.();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startVoiceWorkerBackgroundTasks();
  cli.runApp(
    new WorkerOptions({
      agent: fileURLToPath(import.meta.url),
      numIdleProcesses: 1,
      initializeProcessTimeout: 60_000,
      agentName: getConfiguredWorkerRole(),
      host: resolveWorkerHttpHost(),
      port: resolveWorkerHttpPort(),
    }),
  );
}
