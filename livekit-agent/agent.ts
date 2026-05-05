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
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ReadableStream } from 'node:stream/web';
import { config as loadEnv } from 'dotenv';
import * as openai from '@livekit/agents-plugin-openai';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as cartesia from '@livekit/agents-plugin-cartesia';
import { AutoSubscribe, WorkerOptions, cli, defineAgent, llm as livekitLlm, tts as agentsTts, voice } from '@livekit/agents';
import type { STTOptions as DeepgramSTTOptions } from '@livekit/agents-plugin-deepgram';
import { AudioFrame, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication } from '@livekit/rtc-node';
import { NoiseCancellation } from '@livekit/noise-cancellation-node';
import { z } from 'zod';
import {
  assertRequiredVoiceAgentEnv,
  getVoiceAgentAppBaseUrl,
  getVoiceAgentWebhookSecret,
  getVoiceWorkerHealthPath,
  resolveWorkerHttpHost,
  resolveWorkerHttpPort,
  shouldEnableNoiseCancellation,
} from './runtime-config';
import { buildVoiceAgentRuntimeFingerprint } from './runtime-fingerprint';
import voiceLatency from './voice-latency';
import { isEarlymarkInboundRoomName } from './room-routing';
import type {
  GuardDecision,
  OpenerBankEntry,
  OpenerId,
  SpeculativeHeadBankEntry,
  SpeculativeHeadId,
  VoiceTurnPrediction,
} from './voice-latency';
import {
  buildCapacitySummary,
  getActiveCallCount,
  getMaxConcurrentCalls,
  isWorkerAcceptingCalls,
  markCallEnded,
  markCallStarted,
  setWorkerBootReady,
} from './runtime-state';
import {
  enforceCustomerFacingResponsePolicy,
  type CustomerFacingResponsePolicyOutcome,
} from './customer-contact-policy';
import {
  buildDemoPrompt,
  buildInboundDemoPrompt,
  buildNormalPrompt,
} from "./voice-prompts";
import { startWorkerBackgroundLoops } from "./background-tasks";
import {
  executeQueuedOutboundCall,
  type VoiceWorkerQueuedOutboundCallRequest,
} from "./outbound-call-control";
import { getWorkerLivekitSipHealth } from "./livekit-sip-runtime";

loadEnv({ path: '.env.local' });
assertRequiredVoiceAgentEnv();

const {
  DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES,
  OPENER_BANK,
  buildVoiceFollowupInstructions,
  getPhaseTwoBacklog,
  predictVoiceTurn,
  resolveSpeculativeHeadEntry,
  resolveOpenerEntry,
  resolveVoiceLatencyConfig,
  runVoiceGuardDecision,
  shouldPrimeVoiceGuard,
} = voiceLatency;

const DEPLOY_GIT_SHA = process.env.DEPLOY_GIT_SHA || "unknown";
const AGENT_STARTED_AT = new Date().toISOString();
const VOICE_AGENT_HEARTBEAT_MS = 60 * 1000;
const VOICE_GROUNDING_CACHE_TTL_MS = 5 * 60 * 1000;
const VOICE_OUTBOUND_CALL_QUEUE_POLL_MS = 2_000;
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
  llmMsByProvider: Record<LlmProviderName, number[]>;
  llmTtftMsByProvider: Record<LlmProviderName, number[]>;
  llmTurnsByProvider: Record<LlmProviderName, number>;
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
  llmProvider: LlmProviderName | null;
  llmModel: string | null;
  ttsMs: number;
  ttsTtfbMs: number;
};

type CallerContext = {
  callType: CallType;
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
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
  flagOnlyRules: string[];
  emergencyBypass: boolean;
  ownerPhone: string | null;
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

type UrgentEscalationCapture = {
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
  speculativeHeadLeadMs: number[];
  speculativeHeadGapMs: number[];
  speculativeHeadHits: number;
  speculativeHeadCacheMisses: number;
  speculativeHeadUsage: Partial<Record<SpeculativeHeadId, number>>;
  speculativeHeadCancelled: number;
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
  openerEntry: OpenerBankEntry | SpeculativeHeadBankEntry;
  guardDecision: GuardDecision | null;
  prediction: VoiceTurnPrediction;
  openerSpeechCreatedAt: number | null;
  kind: "opener" | "speculative_head";
};

type AssistantTranscriptOverride = {
  text: string;
  policyOutcome: CustomerFacingResponsePolicyOutcome;
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
let groundingRefreshStartedAt: number | null = null;
let prewarmHealthReported = false;
let groundingLastSuccessAt: number | null = null;
let groundingLastFailureAt: number | null = null;
let groundingConsecutiveFailures = 0;
let groundingLastError: string | null = null;
const GROUNDING_INFLIGHT_DEDUP_WINDOW_MS = 500;
const groundingCache = new Map<string, GroundingCacheEntry>();
let sharedOpenerAudioCache: Map<OpenerId, Promise<AudioFrame>> | null = null;
let sharedSpeculativeHeadAudioCache: Map<SpeculativeHeadId, Promise<AudioFrame>> | null = null;
const FIXED_LINE_BANK = {
  demo_default_greeting: "Hi there.",
  inbound_demo_greeting: "Hi, this is Tracey from Earlymark AI. How can I help?",
  inbound_demo_hello_ack: "Hi there.",
  inbound_demo_can_hear_you: "Yep, I can hear you.",
} as const;
type FixedLineId = keyof typeof FIXED_LINE_BANK;
let sharedFixedLineAudioCache: Map<FixedLineId, Promise<AudioFrame>> | null = null;
const workerHealthState = {
  lastHeartbeatAttemptAt: null as string | null,
  lastHeartbeatSuccessAt: null as string | null,
  lastHeartbeatError: null as string | null,
};

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

function stringToReadableStream(text: string): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

async function readableStreamToString(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  const chunks: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return chunks.join("");
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

function buildSpeculativeHeadAudioCache(tts: cartesia.TTS, logPrefix: string): Map<SpeculativeHeadId, Promise<AudioFrame>> {
  const cache = new Map<SpeculativeHeadId, Promise<AudioFrame>>();

  for (const head of voiceLatency.SPECULATIVE_HEAD_BANK || []) {
    cache.set(
      head.id,
      tts
        .synthesize(head.text)
        .collect()
        .catch((error) => {
          console.warn(`${logPrefix} [VOICE_LATENCY] Failed to pre-synthesize speculative head "${head.id}"`, error);
          throw error;
        })
    );
  }

  void Promise.allSettled(cache.values()).then((results) => {
    const warmed = results.filter((result) => result.status === "fulfilled").length;
    console.log(`${logPrefix} [VOICE_LATENCY] Warmed ${warmed}/${cache.size} speculative response-head clips`);
  });

  return cache;
}

function getSharedSpeculativeHeadAudioCache(tts: cartesia.TTS, logPrefix: string) {
  if (!sharedSpeculativeHeadAudioCache) {
    sharedSpeculativeHeadAudioCache = buildSpeculativeHeadAudioCache(tts, logPrefix);
  }
  return sharedSpeculativeHeadAudioCache;
}

function buildFixedLineAudioCache(tts: cartesia.TTS, logPrefix: string): Map<FixedLineId, Promise<AudioFrame>> {
  const cache = new Map<FixedLineId, Promise<AudioFrame>>();

  for (const [id, text] of Object.entries(FIXED_LINE_BANK) as Array<[FixedLineId, string]>) {
    cache.set(
      id,
      tts
        .synthesize(text)
        .collect()
        .catch((error) => {
          console.warn(`${logPrefix} [VOICE_LATENCY] Failed to pre-synthesize fixed line "${id}"`, error);
          throw error;
        })
    );
  }

  void Promise.allSettled(cache.values()).then((results) => {
    const warmed = results.filter((result) => result.status === "fulfilled").length;
    console.log(`${logPrefix} [VOICE_LATENCY] Warmed ${warmed}/${cache.size} cached fixed speech clips`);
  });

  return cache;
}

function getSharedFixedLineAudioCache(tts: cartesia.TTS, logPrefix: string) {
  if (!sharedFixedLineAudioCache) {
    sharedFixedLineAudioCache = buildFixedLineAudioCache(tts, logPrefix);
  }
  return sharedFixedLineAudioCache;
}

async function getCachedOpenerAudioFrame(
  cache: Map<string, Promise<AudioFrame>>,
  openerId: string,
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
  #ownsDefaultTts: boolean;
  #ttsByLang = new Map<string, cartesia.TTS>();
  #langWarmups = new Map<string, Promise<void>>();
  #currentReplyLanguage: string;
  #opts: { model: string; voice: string; chunkTimeout: number };
  #attachedListeners: Array<{ tts: cartesia.TTS; metricsHandler: (metrics: unknown) => void; errorHandler: (error: unknown) => void }> = [];

  constructor(
    defaultTts: cartesia.TTS,
    opts: { model: string; voice: string; chunkTimeout: number },
    options?: { ownsDefaultTts?: boolean },
  ) {
    super(defaultTts.sampleRate, defaultTts.numChannels, defaultTts.capabilities);
    this.#defaultTts = defaultTts;
    this.#ownsDefaultTts = options?.ownsDefaultTts ?? true;
    this.#opts = opts;
    this.#currentReplyLanguage = 'en-AU';
    this.#forwardTtsEvents(defaultTts);
  }

  setReplyLanguage(detected: string | null | undefined): void {
    this.#currentReplyLanguage = normalizeReplyLanguage(detected);
    if (this.#currentReplyLanguage !== 'en-AU' && this.#currentReplyLanguage !== 'en') {
      this.#prewarmLanguageTts(this.#currentReplyLanguage);
    }
  }

  getCurrentReplyLanguage(): string {
    return this.#currentReplyLanguage;
  }

  getConfiguredVoiceId(): string {
    return this.#opts.voice;
  }

  getConfiguredModel(): string {
    return this.#opts.model;
  }

  #forwardTtsEvents(tts: cartesia.TTS): void {
    const metricsHandler = (metrics: unknown) => {
      // @ts-expect-error -- forwarding event regardless of param schema
      this.emit('metrics_collected', metrics);
    };
    const errorHandler = (error: unknown) => {
      // @ts-expect-error -- forwarding event regardless of param schema
      this.emit('error', error);
    };
    tts.on('metrics_collected', metricsHandler as never);
    tts.on('error', errorHandler as never);
    this.#attachedListeners.push({ tts, metricsHandler, errorHandler });
  }

  #getOrCreateTts(lang: string): cartesia.TTS {
    if (lang === 'en-AU' || lang === 'en') return this.#defaultTts;
    if (!this.#ttsByLang.has(lang)) {
      const tts = new cartesia.TTS({
          model: this.#opts.model,
          voice: this.#opts.voice,
          language: lang,
          chunkTimeout: this.#opts.chunkTimeout,
        });
      this.#forwardTtsEvents(tts);
      this.#ttsByLang.set(lang, tts);
    }
    return this.#ttsByLang.get(lang)!;
  }

  #prewarmLanguageTts(lang: string): void {
    if (this.#langWarmups.has(lang)) return;
    const tts = this.#getOrCreateTts(lang);
    const warmup = warmCartesiaTts(tts, "Hi there.", `[voice-latency:${lang}]`).finally(() => {
      this.#langWarmups.delete(lang);
    });
    this.#langWarmups.set(lang, warmup);
  }

  #getTts(): cartesia.TTS {
    return this.#getOrCreateTts(this.#currentReplyLanguage);
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
    for (const { tts, metricsHandler, errorHandler } of this.#attachedListeners) {
      tts.off('metrics_collected', metricsHandler as never);
      tts.off('error', errorHandler as never);
    }
    this.#attachedListeners = [];
    if (this.#ownsDefaultTts) {
      await this.#defaultTts.close();
    }
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
    llmProvider: turn.llmProvider,
    llmModel: turn.llmModel,
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

function getConfiguredSyntheticProbeCaller() {
  return normalizePhone(process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER || process.env.VOICE_ALERT_SMS_TO || "");
}

function getConfiguredSyntheticProbeTargets() {
  const explicitTarget = normalizePhone(process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER || "");
  const values = explicitTarget ? [explicitTarget, ...getKnownEarlymarkNumbers()] : getKnownEarlymarkNumbers();
  return Array.from(new Set(values.filter(Boolean)));
}

function isSyntheticProbeCall(args: {
  callType: CallType;
  roomName: string;
  callerPhone?: string | null;
  calledPhone?: string | null;
}) {
  if (args.callType !== "inbound_demo") return false;

  const configuredCaller = getConfiguredSyntheticProbeCaller();
  const configuredTargets = getConfiguredSyntheticProbeTargets();
  if (
    configuredCaller &&
    configuredTargets.length > 0 &&
    phoneMatches(args.callerPhone, configuredCaller) &&
    configuredTargets.some((target) => phoneMatches(args.calledPhone, target))
  ) {
    return true;
  }

  return /(^|[_-])probe([_-]|$)/i.test(args.roomName);
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

function getAppBaseUrl() {
  return getVoiceAgentAppBaseUrl();
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

function resolveConfiguredTtsVoiceId() {
  return (process.env.VOICE_TTS_VOICE_ID || "a4a16c5e-5902-4732-b9b6-2a48efd2e11b").trim();
}

function resolveConfiguredTtsLanguage() {
  return (process.env.VOICE_TTS_LANGUAGE || "en-AU").trim();
}

function resolveConfiguredTtsModel() {
  return (process.env.VOICE_TTS_MODEL || "sonic-3").trim();
}

function resolveSttModel() {
  return (process.env.VOICE_STT_MODEL || "nova-3").trim();
}

const VOICE_STT_BASE_KEYTERMS = [
  "Earlymark",
  "earlymark.ai",
  "Tracey",
  "Tracy",
  "Ottorize",
  "Alexandria Automotive Services",
  "Alexandria Automotive",
  "Assistantbot",
  "LiveKit",
  "Cartesia",
  "Deepgram",
  "Sonic",
  "Nova",
  "Groq",
  "DeepInfra",
  "Llama",
  "Sydney",
  "Alexandria",
  "Marrickville",
  "Newtown",
  "Erskineville",
  "Redfern",
  "Mascot",
  "Botany",
];

function resolveSttKeyterms(): string[] {
  const fromEnv = (process.env.VOICE_STT_KEYTERMS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const merged = [...VOICE_STT_BASE_KEYTERMS, ...fromEnv];
  return Array.from(new Set(merged));
}

type TurnDetectionMode = "stt" | "vad";

function resolveRequestedTurnDetectionMode(callType: CallType): TurnDetectionMode {
  if (callType !== "inbound_demo") return "stt";
  const raw = (process.env.VOICE_INBOUND_DEMO_TURN_DETECTION || "stt").trim().toLowerCase();
  return raw === "vad" ? "vad" : "stt";
}

let cachedVadInstance: unknown = null;
let vadLoadAttempted = false;

async function resolveTurnDetector(callType: CallType): Promise<{
  mode: TurnDetectionMode;
  vad: unknown;
  requestedMode: TurnDetectionMode;
  vadAvailable: boolean;
}> {
  const requestedMode = resolveRequestedTurnDetectionMode(callType);
  if (requestedMode !== "vad") {
    return { mode: "stt", vad: null, requestedMode, vadAvailable: false };
  }

  if (!vadLoadAttempted) {
    vadLoadAttempted = true;
    try {
      const sileroModule = (await import("@livekit/agents-plugin-silero" as string).catch(
        () => null,
      )) as { VAD?: { load: () => Promise<unknown> } } | null;
      if (sileroModule?.VAD?.load) {
        cachedVadInstance = await sileroModule.VAD.load();
      }
    } catch (error) {
      console.warn(`[voice-turn-detection] Failed to load Silero VAD: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!cachedVadInstance) {
    return { mode: "stt", vad: null, requestedMode, vadAvailable: false };
  }

  return { mode: "vad", vad: cachedVadInstance, requestedMode, vadAvailable: true };
}

function resolveTtsChunkTimeoutMs(): number {
  return Number(process.env.VOICE_TTS_CHUNK_TIMEOUT_MS || 1000);
}

function resolveCartesiaBaseUrl(): string {
  return (process.env.CARTESIA_BASE_URL || "https://api.cartesia.ai").trim();
}

function createCartesiaTts(language = resolveConfiguredTtsLanguage()) {
  return new cartesia.TTS({
    model: resolveConfiguredTtsModel(),
    voice: resolveConfiguredTtsVoiceId(),
    language,
    chunkTimeout: resolveTtsChunkTimeoutMs(),
    baseUrl: resolveCartesiaBaseUrl(),
  });
}

let cachedDefaultTts: cartesia.TTS | null = null;
let cachedDefaultTtsCreatedAt: number | null = null;

function getOrCreatePersistentDefaultTts(): { tts: cartesia.TTS; reused: boolean; ageMs: number } {
  if (cachedDefaultTts) {
    return {
      tts: cachedDefaultTts,
      reused: true,
      ageMs: cachedDefaultTtsCreatedAt ? Date.now() - cachedDefaultTtsCreatedAt : 0,
    };
  }
  cachedDefaultTts = createCartesiaTts();
  cachedDefaultTtsCreatedAt = Date.now();
  return { tts: cachedDefaultTts, reused: false, ageMs: 0 };
}

async function warmCartesiaTts(tts: cartesia.TTS, text: string, logPrefix: string) {
  try {
    await tts.synthesize(text).collect();
  } catch (error) {
    console.warn(`${logPrefix} Failed to warm Cartesia TTS:`, error);
  }
}

async function prewarmVoiceProcess(logPrefix = "[agent-prewarm]") {
  try {
    const warmTts = createCartesiaTts();
    await warmCartesiaTts(warmTts, "Hi there.", `${logPrefix} [VOICE_LATENCY]`);
    await Promise.allSettled(getSharedFixedLineAudioCache(warmTts, logPrefix).values());
    await Promise.allSettled(getSharedOpenerAudioCache(warmTts, logPrefix).values());
    await Promise.allSettled(getSharedSpeculativeHeadAudioCache(warmTts, logPrefix).values());
  } catch (error) {
    console.warn(`${logPrefix} Failed to prewarm Cartesia TTS:`, error);
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
  #lastSelectedProvider: LlmProviderName | null = null;
  #lastSelectedModel: string | null = null;

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
    this.#lastSelectedProvider = config.provider;
    this.#lastSelectedModel = config.model;
  }

  get lastSelectedProvider(): LlmProviderName | null {
    return this.#lastSelectedProvider;
  }

  get lastSelectedModel(): string | null {
    return this.#lastSelectedModel;
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
  if (groundingRefreshPromise) {
    const inflightAgeMs = groundingRefreshStartedAt ? Date.now() - groundingRefreshStartedAt : Infinity;
    if (!force || inflightAgeMs < GROUNDING_INFLIGHT_DEDUP_WINDOW_MS) {
      return groundingRefreshPromise;
    }
  }

  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();
  if (!appUrl || !secret) return;

  groundingRefreshStartedAt = Date.now();
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

      const payload = (await response.json().catch(() => null)) as { groundings?: unknown } | null;
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
      groundingLastSuccessAt = Date.now();
      groundingConsecutiveFailures = 0;
      groundingLastError = null;
    } catch (error) {
      groundingLastFailureAt = Date.now();
      groundingConsecutiveFailures += 1;
      groundingLastError = error instanceof Error ? error.message : String(error);
      console.warn(`[voice-grounding-refresh-failed] ${JSON.stringify({
        consecutiveFailures: groundingConsecutiveFailures,
        lastSuccessAt: groundingLastSuccessAt,
        error: groundingLastError,
      })}`);
    } finally {
      groundingRefreshPromise = null;
      groundingRefreshStartedAt = null;
    }
  })();

  return groundingRefreshPromise;
}

export function getVoiceGroundingHealth() {
  return {
    cacheSize: groundingCache.size,
    lastSuccessAt: groundingLastSuccessAt,
    lastFailureAt: groundingLastFailureAt,
    consecutiveFailures: groundingConsecutiveFailures,
    lastError: groundingLastError,
    inflight: Boolean(groundingRefreshPromise),
  };
}

function getCachedVoiceGrounding(calledPhone?: string | null) {
  const normalizedPhone = normalizePhone(calledPhone);
  if (!normalizedPhone) return null;

  const cached = groundingCache.get(normalizedPhone);
  if (!cached) {
    void refreshVoiceGroundingIndex().catch(() => {});
    return null;
  }

  const ageMs = Date.now() - cached.fetchedAt;
  if (ageMs > VOICE_GROUNDING_CACHE_TTL_MS) {
    void refreshVoiceGroundingIndex(true).catch(() => {});
    if (groundingConsecutiveFailures > 0) {
      console.warn(`[voice-grounding-degraded] ${JSON.stringify({
        normalizedPhone,
        cacheAgeMs: ageMs,
        ttlMs: VOICE_GROUNDING_CACHE_TTL_MS,
        consecutiveFailures: groundingConsecutiveFailures,
        lastError: groundingLastError,
      })}`);
    }
    return cached.value;
  }

  return cached.value;
}

function resolveCallType(initialCallType: CallType, calledPhone: string, roomName: string): CallType {
  if (initialCallType !== "normal") return initialCallType;
  if (isEarlymarkInboundRoomName(roomName)) {
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

function resolveGreetingClipId(callType: CallType, caller: CallerContext): FixedLineId | null {
  if (callType === "demo" && !caller.firstName) {
    return "demo_default_greeting";
  }
  if (callType === "inbound_demo") {
    return "inbound_demo_greeting";
  }
  return null;
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

function appendTranscriptTurn(
  transcriptTurns: TranscriptTurn[],
  turn: TranscriptTurn,
) {
  const lastTurn = transcriptTurns[transcriptTurns.length - 1];
  if (
    lastTurn &&
    lastTurn.role === turn.role &&
    lastTurn.text === turn.text &&
    lastTurn.createdAt === turn.createdAt
  ) {
    return;
  }
  transcriptTurns.push(turn);
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
  return buildVoiceAgentRuntimeFingerprint(process.env);
}

async function buildVoiceAgentRuntimeSummary() {
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
    ttsModel: resolveConfiguredTtsModel(),
    ttsVoiceId: resolveConfiguredTtsVoiceId(),
    ttsLanguage: resolveConfiguredTtsLanguage(),
    latencyEnabled: process.env.VOICE_LATENCY_ENABLED ?? "true",
    openerBankEnabled: process.env.VOICE_OPENER_BANK_ENABLED ?? "true",
    guardEnabled: process.env.VOICE_GUARD_ENABLED ?? "true",
    speculativeHeadsEnabled: process.env.VOICE_SPECULATIVE_HEADS_ENABLED ?? "true",
    speculativeHeadSurfaces: process.env.VOICE_SPECULATIVE_HEADS_SURFACES || "demo,inbound_demo",
    targetCallTypes: process.env.VOICE_LATENCY_TARGET_CALL_TYPES || DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES,
    knownInboundNumbers: getKnownEarlymarkNumbers(),
    groundingCacheEntries: groundingCache.size,
    livekitSip: await getWorkerLivekitSipHealth().catch((error) => ({
      status: "unhealthy",
      summary: "Worker-side LiveKit SIP health check crashed while preparing the worker heartbeat.",
      warnings: [error instanceof Error ? error.message : String(error)],
      checkedAt: new Date().toISOString(),
      livekitUrl: null,
      inboundTrunkCount: 0,
      outboundTrunkCount: 0,
      dispatchRuleCount: 0,
      expectedInboundNumbers: getKnownEarlymarkNumbers(),
      missingInboundNumbers: getKnownEarlymarkNumbers(),
      inboundTrunks: [],
      outboundTrunks: [],
      demoOutbound: {
        status: "unhealthy",
        summary: "Worker-side LiveKit outbound SIP health check crashed while preparing the worker heartbeat.",
        warnings: [error instanceof Error ? error.message : String(error)],
        configuredTrunkId: (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null,
        resolvedTrunkId: null,
        configuredTrunkMatched: false,
        callerNumber: null,
      },
      dispatchRules: [],
      source: "worker_control" as const,
    })),
  };
}

async function writeWorkerHealthSnapshot() {
  const healthPath = getVoiceWorkerHealthPath();
  const summary = await buildVoiceAgentRuntimeSummary();
  const snapshot = {
    updatedAt: new Date().toISOString(),
    deployGitSha: DEPLOY_GIT_SHA,
    workerRole: getConfiguredWorkerRole(),
    surfaceSet: getConfiguredWorkerSurfaces(),
    pid: process.pid,
    runtimeFingerprint: getVoiceAgentRuntimeFingerprint(),
    bootReady: buildCapacitySummary().bootReady,
    activeCalls: getActiveCallCount(),
    maxConcurrentCalls: getMaxConcurrentCalls(),
    acceptingNewCalls: isWorkerAcceptingCalls(),
    lastHeartbeatAttemptAt: workerHealthState.lastHeartbeatAttemptAt,
    lastHeartbeatSuccessAt: workerHealthState.lastHeartbeatSuccessAt,
    lastHeartbeatError: workerHealthState.lastHeartbeatError,
    summary,
  };

  await mkdir(dirname(healthPath), { recursive: true });
  await writeFile(healthPath, JSON.stringify(snapshot), "utf8");
}

async function postVoiceAgentStatus() {
  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();
  workerHealthState.lastHeartbeatAttemptAt = new Date().toISOString();

  if (!appUrl || !secret) {
    workerHealthState.lastHeartbeatError = "Missing APP URL or worker webhook secret.";
    await writeWorkerHealthSnapshot().catch((error) => {
      console.warn("[agent] Failed to write worker health snapshot:", error);
    });
    console.warn("[agent] Skipping worker-status heartbeat because APP URL or webhook secret is missing.");
    return;
  }

  const route = `${appUrl.replace(/\/$/, "")}/api/internal/voice-agent-status`;
  try {
    const summary = await buildVoiceAgentRuntimeSummary();
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
        summary,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Worker status heartbeat failed: ${response.status} ${body}`);
    }

    workerHealthState.lastHeartbeatSuccessAt = new Date().toISOString();
    workerHealthState.lastHeartbeatError = null;
    await writeWorkerHealthSnapshot();
  } catch (error) {
    workerHealthState.lastHeartbeatError = error instanceof Error ? error.message : String(error);
    await writeWorkerHealthSnapshot().catch((snapshotError) => {
      console.warn("[agent] Failed to write worker health snapshot after heartbeat failure:", snapshotError);
    });
    throw error;
  }
}

function shouldProcessQueuedOutboundCalls() {
  return getConfiguredWorkerSurfaces().includes("normal");
}

async function sendQueuedOutboundCallCompletion(params: {
  idempotencyKey: string;
  success: boolean;
  result?: Awaited<ReturnType<typeof executeQueuedOutboundCall>>;
  error?: string;
}) {
  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();
  if (!appUrl || !secret) {
    throw new Error("Missing APP URL or worker webhook secret for outbound queue completion.");
  }

  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/voice-outbound-queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-voice-agent-secret": secret,
    },
    body: JSON.stringify({
      action: "complete",
      idempotencyKey: params.idempotencyKey,
      success: params.success,
      result: params.result,
      error: params.error,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Outbound queue completion failed: ${response.status} ${body}`);
  }
}

async function processQueuedOutboundCalls() {
  if (!shouldProcessQueuedOutboundCalls()) {
    return;
  }

  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();
  if (!appUrl || !secret) {
    return;
  }

  for (let processed = 0; processed < 3; processed += 1) {
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/voice-outbound-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-voice-agent-secret": secret,
      },
      body: JSON.stringify({
        action: "claim",
        workerRole: getConfiguredWorkerRole(),
        hostId: getConfiguredHostId(),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Outbound queue claim failed: ${response.status} ${body}`);
    }

    const claimPayload = await response.json() as {
      claimed?: boolean;
      idempotencyKey?: string;
      request?: VoiceWorkerQueuedOutboundCallRequest;
    };

    if (!claimPayload.claimed || !claimPayload.idempotencyKey || !claimPayload.request) {
      return;
    }

    try {
      const result = await executeQueuedOutboundCall(claimPayload.request);
      await sendQueuedOutboundCallCompletion({
        idempotencyKey: claimPayload.idempotencyKey,
        success: true,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await sendQueuedOutboundCallCompletion({
        idempotencyKey: claimPayload.idempotencyKey,
        success: false,
        error: message,
      });
      console.error("[agent] Queued outbound call failed:", {
        idempotencyKey: claimPayload.idempotencyKey,
        error: message,
      });
    }
  }
}

function buildWorkspaceLookupTools(grounding: WorkspaceVoiceGrounding): livekitLlm.ToolContext<unknown> {
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

function buildSchedulingTools(grounding: WorkspaceVoiceGrounding): livekitLlm.ToolContext<unknown> {
  const appUrl = getAppBaseUrl();
  const secret = getVoiceAgentWebhookSecret();
  const workspaceId = grounding.workspaceId;
  const mode = grounding.customerContactMode;

  const callSchedulingApi = async (body: Record<string, unknown>) => {
    if (!appUrl || !secret) throw new Error("Missing APP URL or webhook secret");
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/voice-scheduling`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-voice-agent-secret": secret },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`voice-scheduling API ${response.status}: ${text}`);
    }
    return response.json();
  };

  const tools: livekitLlm.ToolContext<unknown> = {
    check_availability: livekitLlm.tool({
      description:
        "Check when the business has availability to book a job. Call this when a caller asks about scheduling or wants to book a time.",
      parameters: z.object({
        date_hint: z
          .string()
          .optional()
          .describe("Optional preferred date or week the caller mentioned, e.g. 'this week' or 'Monday'"),
      }),
      execute: async ({ date_hint }) => {
        try {
          const result = await callSchedulingApi({ action: "check_availability", workspaceId, date: date_hint });
          return (result as { summary?: string }).summary ?? "Availability information retrieved.";
        } catch (e) {
          console.error("[scheduling] check_availability failed:", e);
          return "Could not retrieve availability right now. Let the caller know the team will follow up to confirm a time.";
        }
      },
    }),

    find_nearby_jobs: livekitLlm.tool({
      description:
        "Check if there are other jobs booked nearby on the same day. Call this after the caller gives an address and a preferred date, before confirming a booking, to flag efficient clustering.",
      parameters: z.object({
        address: z.string().describe("The job address provided by the caller"),
        date: z.string().describe("The proposed booking date, e.g. 'Monday' or '2024-03-18'"),
      }),
      execute: async ({ address, date }) => {
        try {
          const result = await callSchedulingApi({ action: "find_nearby", workspaceId, address, date });
          return (result as { summary?: string }).summary ?? "No nearby jobs found on that day.";
        } catch (e) {
          console.error("[scheduling] find_nearby_jobs failed:", e);
          return "Could not check nearby jobs.";
        }
      },
    }),
  };

  if (mode === "execute") {
    (tools as Record<string, livekitLlm.ToolContext<unknown>[string]>).create_and_schedule_job = livekitLlm.tool({
      description:
        "Book and schedule a job for the caller. Only call this when you have all required details (name, address, work description) AND the caller has verbally confirmed the booking. This creates the job immediately in the system.",
      parameters: z.object({
        clientName: z.string().describe("Caller's full name"),
        address: z.string().describe("Job site address"),
        workDescription: z.string().describe("Description of the work requested"),
        schedule: z
          .string()
          .optional()
          .describe("Agreed date and time, e.g. 'Monday 9am' or '2024-03-18 09:00'"),
        phone: z.string().optional().describe("Caller's phone number"),
        email: z.string().optional().describe("Caller's email address"),
        price: z.number().optional().describe("Agreed price in dollars if discussed"),
      }),
      execute: async (params) => {
        try {
          const result = await callSchedulingApi({ action: "create_job", workspaceId, ...params }) as {
            success?: boolean;
            dealId?: string;
            contactId?: string;
            error?: string;
          };
          if (result.success) {
            return `Job booked successfully. Confirm the booking with the caller and let them know the team will be in touch to confirm the exact time.`;
          }
          return `Could not book the job: ${result.error ?? "unknown error"}. Let the caller know the team will follow up within the hour to confirm.`;
        } catch (e) {
          console.error("[scheduling] create_and_schedule_job failed:", e);
          return "Booking system unavailable right now. Let the caller know the team will call them back within 30 minutes to confirm.";
        }
      },
    });
  }

  return tools;
}

export default defineAgent({
  prewarm: async () => {
    startVoiceWorkerBackgroundTasks("[agent-prewarm]");
    await prewarmVoiceProcess();
  },
  entry: async (ctx) => {
    const callStartedAt = new Date();

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

    const urgentManagerCallbackTool = livekitLlm.tool({
      description: "Escalate an urgent or human-requested call for manager callback. Use this when the caller says it is urgent, an emergency, or they need a human. Do not promise immediate attendance.",
      parameters: z.object({
        reason: z.string().describe("Why the caller wants to speak to the owner"),
      }),
      execute: async ({ reason }) => {
        console.log(`[agent] Executing urgent_manager_callback tool. ${JSON.stringify({
          callId,
          reason,
          emergencyBypass: normalVoiceGrounding?.emergencyBypass ?? null,
        })}`);

        return "I’ll pass this straight to the manager and have them call you back as soon as possible. Is there anything else I should know before I pass it on?";
      },
    });

    const ttsChunkTimeoutMs = resolveTtsChunkTimeoutMs();
    const ttsBaseUrl = resolveCartesiaBaseUrl();
    const persistentDefaultTts = getOrCreatePersistentDefaultTts();
    const defaultTts = persistentDefaultTts.tts;
    if (!persistentDefaultTts.reused) {
      void warmCartesiaTts(defaultTts, "Yep.", "[voice-latency:session]");
    }
    const ttsOpts = {
      model: resolveConfiguredTtsModel(),
      voice: resolveConfiguredTtsVoiceId(),
      chunkTimeout: ttsChunkTimeoutMs,
    };
    const tts = new MultilingualTTS(defaultTts, ttsOpts, { ownsDefaultTts: false });

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();
    const roomName = ctx.room.name || participant.identity || "unknown-room";
    const callId = `${roomName}:${callStartedAt.getTime()}`;

    let callType: CallType = "normal";
    let callerFirstName = "";
    let callerLastName = "";
    let callerBusiness = "";
    let callerEmail = "";
    let callerPhone = "";
    let calledPhone = "";
    let roomMetadata: Record<string, unknown> | null = null;
    let participantAttributes: Record<string, string> = {};

    try {
      const roomMeta = ctx.room.metadata;
      if (roomMeta) {
        const meta = JSON.parse(roomMeta) as Record<string, unknown>;
        roomMetadata = meta;
        if (meta.callType === "demo") callType = "demo";
        if (meta.callType === "inbound_demo") callType = "inbound_demo";
        callerFirstName = typeof meta.firstName === "string" ? meta.firstName : "";
        callerLastName = typeof meta.lastName === "string" ? meta.lastName : "";
        callerBusiness = typeof meta.businessName === "string" ? meta.businessName : "";
        callerEmail = typeof meta.email === "string" ? meta.email : "";
        callerPhone = typeof meta.phone === "string" ? meta.phone : "";
        calledPhone = typeof meta.calledPhone === "string" ? meta.calledPhone : "";
      }
    } catch {
      // Ignore invalid room metadata.
    }

    try {
      const attrs = (participant.attributes || {}) as Record<string, string>;
      participantAttributes = attrs;
      if (attrs.callType === "demo") callType = "demo";
      if (attrs.callType === "inbound_demo") callType = "inbound_demo";
      callerFirstName = callerFirstName || attrs.firstName || "";
      callerLastName = callerLastName || attrs.lastName || "";
      callerBusiness = callerBusiness || attrs.businessName || "";
      callerEmail = callerEmail || attrs.email || attrs.customerEmail || "";
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

    callType = resolveCallType(callType, calledPhone, roomName);
    const voiceTurnTuning = resolveVoiceTurnTuning(callType);
    const sttKeyterms = resolveSttKeyterms();
    const sttModelName = resolveSttModel();
    const sttLanguageMode = "multi";
    const stt = new deepgram.STT({
      model: sttModelName as DeepgramSTTOptions["model"],
      language: sttLanguageMode,
      detectLanguage: true,
      interimResults: true,
      endpointing: voiceTurnTuning.sttEndpointingMs,
      noDelay: true,
      punctuate: true,
      smartFormat: true,
      keyterm: sttKeyterms,
    });
    const ttsModelName = resolveConfiguredTtsModel();
    const ttsVoiceId = resolveConfiguredTtsVoiceId();
    console.log(`[voice-stt-config] ${JSON.stringify({
      callId,
      provider: "deepgram",
      model: sttModelName,
      languageMode: sttLanguageMode,
      keytermCount: sttKeyterms.length,
    })}`);
    console.log(`[voice-tts-config] ${JSON.stringify({
      callId,
      provider: "cartesia",
      model: ttsModelName,
      voiceId: ttsVoiceId,
      chunkTimeoutMs: ttsChunkTimeoutMs,
      baseUrl: ttsBaseUrl,
      defaultInstanceReused: persistentDefaultTts.reused,
      defaultInstanceAgeMs: persistentDefaultTts.ageMs,
    })}`);
    markCallStarted();
    let activeCallReleased = false;
    let voiceCallPersistencePromise: Promise<void> | null = null;
    const releaseActiveCall = () => {
      if (activeCallReleased) return;
      activeCallReleased = true;
      markCallEnded();
    };
    ctx.addShutdownCallback(async () => {
      if (voiceCallPersistencePromise) {
        await voiceCallPersistencePromise.catch(() => {
          // The persistence promise already logs the underlying failure.
        });
      }
      releaseActiveCall();
    });

    const caller: CallerContext = {
      callType,
      firstName: callerFirstName,
      lastName: callerLastName,
      businessName: callerBusiness,
      email: callerEmail,
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
    const speculativeHeadAudioCache: Map<SpeculativeHeadId, Promise<AudioFrame>> = voiceLatencyConfig.speculativeHeadsEnabled
      ? getSharedSpeculativeHeadAudioCache(defaultTts, logPrefix)
      : new Map<SpeculativeHeadId, Promise<AudioFrame>>();
    const fixedLineAudioCache = getSharedFixedLineAudioCache(defaultTts, logPrefix);

    if (!prewarmHealthReported) {
      prewarmHealthReported = true;
      void (async () => {
        const tally = async <K>(label: string, cache: Map<K, Promise<unknown>>) => {
          const results = await Promise.allSettled(Array.from(cache.values()));
          const failed = results.filter((r) => r.status === "rejected").length;
          return { label, total: results.length, failed };
        };
        const reports = await Promise.all([
          tally("opener", openerAudioCache),
          tally("speculative_head", speculativeHeadAudioCache),
          tally("fixed_line", fixedLineAudioCache),
        ]);
        const degraded = reports.filter((r) => r.failed > 0);
        if (degraded.length > 0) {
          console.warn(`[voice-prewarm-degraded] ${JSON.stringify({
            workerLogPrefix: logPrefix,
            caches: degraded,
          })}`);
        }
      })();
    }

    console.log(`${logPrefix} Call started ${JSON.stringify({
      callId,
      room: ctx.room.name,
      participant: participant.identity,
      callType,
      callerFirstName,
      callerLastName,
      callerBusiness,
      callerEmail,
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
        speculativeHeadsEnabled: voiceLatencyConfig.speculativeHeadsEnabled,
        speculativeHeadSurfaces: voiceLatencyConfig.speculativeHeadSurfaces,
        targetCallTypes: voiceLatencyConfig.targetCallTypes,
        openerConfidenceThreshold: voiceLatencyConfig.openerConfidenceThreshold,
        guardTimeoutMs: voiceLatencyConfig.guardTimeoutMs,
      },
      tts: {
        model: tts.getConfiguredModel(),
        voiceId: tts.getConfiguredVoiceId(),
        defaultLanguage: resolveConfiguredTtsLanguage(),
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
    const normalSchedulingTools = normalVoiceGrounding ? buildSchedulingTools(normalVoiceGrounding) : {};
    const tools: livekitLlm.ToolContext<unknown> = isEarlymarkCall
      ? {
        log_lead: logLeadTool,
        urgent_manager_callback: urgentManagerCallbackTool,
      }
      : {
        urgent_manager_callback: urgentManagerCallbackTool,
        ...normalLookupTools,
        ...normalSchedulingTools,
      };

    class TraceyVoiceAgent extends voice.Agent {
      override async ttsNode(text: ReadableStream<string>, modelSettings: Parameters<voice.Agent["ttsNode"]>[1]) {
        const resolvedText = (await readableStreamToString(text)).trim();
        if (!resolvedText) return null;

        if (callType !== "normal") {
          return voice.Agent.default.ttsNode(this, stringToReadableStream(resolvedText), modelSettings);
        }

        const policyOutcome = enforceCustomerFacingResponsePolicy({
          modeRaw: normalVoiceGrounding?.customerContactMode,
          text: resolvedText,
          channel: "voice",
        });
        responsePolicyOutcomes.push(policyOutcome);
        assistantTranscriptOverrides.push({
          text: policyOutcome.finalText || resolvedText,
          policyOutcome,
        });

        return voice.Agent.default.ttsNode(
          this,
          stringToReadableStream(policyOutcome.finalText || resolvedText),
          modelSettings,
        );
      }
    }

    const turnDetectorChoice = await resolveTurnDetector(callType);
    if (turnDetectorChoice.requestedMode === "vad" && !turnDetectorChoice.vadAvailable) {
      console.warn(`[voice-turn-detection] ${JSON.stringify({
        callId,
        callType,
        requested: turnDetectorChoice.requestedMode,
        active: turnDetectorChoice.mode,
        reason: "vad_module_unavailable",
      })}`);
    } else {
      console.log(`[voice-turn-detection] ${JSON.stringify({
        callId,
        callType,
        requested: turnDetectorChoice.requestedMode,
        active: turnDetectorChoice.mode,
      })}`);
    }

    const agent = new TraceyVoiceAgent({
      instructions: isEarlymarkCall ? buildEarlymarkPrompt(callType, caller) : buildNormalPrompt(caller, normalVoiceGrounding),
      stt,
      llm,
      tts,
      tools,
      turnDetection: turnDetectorChoice.mode,
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
      llmMsByProvider: { groq: [], deepinfra: [] },
      llmTtftMsByProvider: { groq: [], deepinfra: [] },
      llmTurnsByProvider: { groq: 0, deepinfra: 0 },
    };
    const pendingUserTurns: PendingUserTurn[] = [];
    const turnAudits = new Map<string, TurnAudit>();
    const transcriptTurns: TranscriptTurn[] = [];
    const transcriptItemIds = new Set<string>();
    const leadCapture: LeadCapture = { toolUsed: false, payloads: [] };
    const urgentEscalation: UrgentEscalationCapture = { toolUsed: false, payloads: [] };
    const assistantTranscriptOverrides: AssistantTranscriptOverride[] = [];
    const responsePolicyOutcomes: CustomerFacingResponsePolicyOutcome[] = [];
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
      speculativeHeadLeadMs: [],
      speculativeHeadGapMs: [],
      speculativeHeadHits: 0,
      speculativeHeadCacheMisses: 0,
      speculativeHeadUsage: {},
      speculativeHeadCancelled: 0,
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
        llmProvider: null,
        llmModel: null,
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
      turnDetection: turnDetectorChoice.mode,
      ...(turnDetectorChoice.vad ? { vad: turnDetectorChoice.vad as voice.AgentSession["vad"] } : {}),
      voiceOptions: {
        preemptiveGeneration: true,
        minEndpointingDelay: voiceTurnTuning.minEndpointingDelayMs,
        maxEndpointingDelay: voiceTurnTuning.maxEndpointingDelayMs,
        minInterruptionDuration: voiceTurnTuning.minInterruptionDurationMs,
        minInterruptionWords: voiceTurnTuning.minInterruptionWords,
        allowInterruptions: true,
      },
    });
    const enableNoiseCancellation = shouldEnableNoiseCancellation();
    console.log(
      `${logPrefix} [CALL_BOOT] ${JSON.stringify({
        callId,
        room: ctx.room.name,
        participant: participant.identity,
        noiseCancellationEnabled: enableNoiseCancellation,
      })}`,
    );
    await session.start({
      agent,
      room: ctx.room,
      ...(enableNoiseCancellation
        ? {
          inputOptions: {
            noiseCancellation: NoiseCancellation(),
          },
        }
        : {}),
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
        const gapMs = Math.max(0, ev.createdAt - pendingLatencyTurn.openerSpeechCreatedAt);
        if (pendingLatencyTurn.kind === "speculative_head") {
          voiceLatencyAudit.speculativeHeadGapMs.push(gapMs);
        } else {
          voiceLatencyAudit.openerGapMs.push(gapMs);
        }
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

      const metricTags: { provider?: string; model?: string } = {};

      switch (metrics.type) {
        case "stt_metrics":
          latencyAudit.sttMs.push(Number(metrics.durationMs || 0));
          metricTags.provider = "deepgram";
          metricTags.model = sttModelName;
          break;
        case "llm_metrics": {
          const durationMs = Number(metrics.durationMs || 0);
          const ttftMs = Number(metrics.ttftMs || 0);
          latencyAudit.llmMs.push(durationMs);
          latencyAudit.llmTtftMs.push(ttftMs);
          const provider = llm.lastSelectedProvider;
          const model = llm.lastSelectedModel;
          if (provider) {
            latencyAudit.llmMsByProvider[provider].push(durationMs);
            latencyAudit.llmTtftMsByProvider[provider].push(ttftMs);
            latencyAudit.llmTurnsByProvider[provider] += 1;
            metricTags.provider = provider;
          }
          if (model) metricTags.model = model;
          if (metrics.speechId) {
            const turn = getOrCreateTurnAudit(metrics.speechId);
            turn.llmMs = durationMs;
            turn.llmTtftMs = ttftMs;
            turn.llmProvider = provider;
            turn.llmModel = model;
          }
          break;
        }
        case "tts_metrics":
          latencyAudit.ttsMs.push(Number(metrics.durationMs || 0));
          latencyAudit.ttsTtfbMs.push(Number(metrics.ttfbMs || 0));
          metricTags.provider = "cartesia";
          metricTags.model = ttsModelName;
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

      console.log(`[voice-metric] ${JSON.stringify({ callId, room: ctx.room.name, participant: participant.identity, ...metricTags, ...metrics })}`);
    });

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      const item = ev.item as { id?: string; type?: string; role?: string; textContent?: string } | null;
      const itemId = item?.id;
      if (!item || item.type !== "message" || !itemId || transcriptItemIds.has(itemId)) return;

      const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
      let text = extractTextFromConversationItem(item);
      if (role === "assistant" && assistantTranscriptOverrides.length > 0) {
        const override = assistantTranscriptOverrides.shift();
        if (override?.text) {
          text = override.text;
        }
      }
      if (!role || !text) return;

      transcriptItemIds.add(itemId);
      appendTranscriptTurn(transcriptTurns, {
        role,
        text,
        createdAt: ev.createdAt,
      });
    });

    session.on(voice.AgentSessionEventTypes.FunctionToolsExecuted, (ev) => {
      for (const call of ev.functionCalls) {
        if (call.name === "log_lead") {
          leadCapture.toolUsed = true;
          try {
            leadCapture.payloads.push(JSON.parse(call.args) as Record<string, unknown>);
          } catch {
            leadCapture.payloads.push({ rawArgs: call.args });
          }
          continue;
        }
        if (call.name === "urgent_manager_callback") {
          urgentEscalation.toolUsed = true;
          try {
            urgentEscalation.payloads.push(JSON.parse(call.args) as Record<string, unknown>);
          } catch {
            urgentEscalation.payloads.push({ rawArgs: call.args });
          }
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
      let speculativeHeadEntry: SpeculativeHeadBankEntry | null = null;

      (tts as MultilingualTTS).setReplyLanguage(ev.language);

      if (callType === "inbound_demo") {
        const fastReplyId = voiceLatency.resolveInboundDemoFastReplyId(transcript);
        if (fastReplyId) {
          const fastReplyFrame = await getCachedOpenerAudioFrame(fixedLineAudioCache, fastReplyId, 50);

          appendTranscriptTurn(transcriptTurns, {
            role: "user",
            text: transcript,
            createdAt: ev.createdAt,
          });
          pendingUserTurns.push({
            transcript,
            createdAt: ev.createdAt,
            language: ev.language,
          });
          session.clearUserTurn();
          pendingLatencyTurn = null;

          await session.say(FIXED_LINE_BANK[fastReplyId], {
            ...(fastReplyFrame ? { audio: audioFrameToReadableStream(fastReplyFrame) } : {}),
            allowInterruptions: true,
            addToChatCtx: true,
          });

          console.log(
            `[voice-fast-reply] ${JSON.stringify({
              callId,
              room: ctx.room.name,
              participant: participant.identity,
              transcript,
              fastReplyId,
            })}`,
          );

          resetActiveVoiceTurn();
          return;
        }
      }

      if (
        isEarlymarkCall &&
        voiceLatencyConfig.speculativeHeadsEnabled
      ) {
        speculativeHeadEntry = resolveSpeculativeHeadEntry({
          callType,
          prediction: finalPrediction,
        });

        if (speculativeHeadEntry) {
          const speculativeFrame = await getCachedOpenerAudioFrame(speculativeHeadAudioCache, speculativeHeadEntry.id, 50);
          if (speculativeFrame) {
            session.clearUserTurn();

            pendingLatencyTurn = {
              transcript,
              finalCreatedAt: ev.createdAt,
              openerEntry: speculativeHeadEntry,
              guardDecision: null,
              prediction: finalPrediction,
              openerSpeechCreatedAt: null,
              kind: "speculative_head",
            };

            session.say(speculativeHeadEntry.text, {
              audio: audioFrameToReadableStream(speculativeFrame),
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
              instructions: `A short speculative response head has already been spoken to the caller: "${speculativeHeadEntry.text}" Continue directly into the substantive answer without repeating the same opening. ${buildVoiceFollowupInstructions({
                prediction: finalPrediction,
              })}`,
            });

            voiceLatencyAudit.speculativeHeadHits += 1;
            voiceLatencyAudit.speculativeHeadLeadMs.push(Math.max(0, Date.now() - ev.createdAt));
            voiceLatencyAudit.speculativeHeadUsage[speculativeHeadEntry.id] =
              (voiceLatencyAudit.speculativeHeadUsage[speculativeHeadEntry.id] || 0) + 1;

            console.log(
              `[voice-speculative-head] ${JSON.stringify({
                callId,
                room: ctx.room.name,
                participant: participant.identity,
                transcript,
                prediction: {
                  intent: finalPrediction.intent,
                  confidence: finalPrediction.confidence,
                  riskLevel: finalPrediction.riskLevel,
                  route: finalPrediction.route,
                },
                speculativeHeadId: speculativeHeadEntry.id,
                speculativeHeadText: speculativeHeadEntry.text,
              })}`,
            );

            resetActiveVoiceTurn();
            return;
          }

          voiceLatencyAudit.speculativeHeadCacheMisses += 1;
        }
      }

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
              kind: "opener",
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
      if (speculativeHeadEntry) {
        voiceLatencyAudit.speculativeHeadCancelled += 1;
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

    const greetingClipId = resolveGreetingClipId(callType, caller);
    const greetingFrame = greetingClipId
      ? await getCachedOpenerAudioFrame(fixedLineAudioCache, greetingClipId, 50)
      : null;

    await session.say(greeting, {
      ...(greetingFrame ? { audio: audioFrameToReadableStream(greetingFrame) } : {}),
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
      const llmByProvider = {
        groq: {
          turns: latencyAudit.llmTurnsByProvider.groq,
          llmAvgMs: avg(latencyAudit.llmMsByProvider.groq),
          llmP95Ms: p95(latencyAudit.llmMsByProvider.groq),
          llmTtftAvgMs: avg(latencyAudit.llmTtftMsByProvider.groq),
          llmTtftP95Ms: p95(latencyAudit.llmTtftMsByProvider.groq),
        },
        deepinfra: {
          turns: latencyAudit.llmTurnsByProvider.deepinfra,
          llmAvgMs: avg(latencyAudit.llmMsByProvider.deepinfra),
          llmP95Ms: p95(latencyAudit.llmMsByProvider.deepinfra),
          llmTtftAvgMs: avg(latencyAudit.llmTtftMsByProvider.deepinfra),
          llmTtftP95Ms: p95(latencyAudit.llmTtftMsByProvider.deepinfra),
        },
      };
      const latency = {
        sttAvgMs: avg(latencyAudit.sttMs),
        sttProvider: "deepgram",
        sttModel: sttModelName,
        sttLanguageMode,
        turnDetectionMode: turnDetectorChoice.mode,
        turnDetectionRequested: turnDetectorChoice.requestedMode,
        llmAvgMs: avg(latencyAudit.llmMs),
        llmP95Ms: p95(latencyAudit.llmMs),
        llmTtftAvgMs: avg(latencyAudit.llmTtftMs),
        llmByProvider,
        ttsAvgMs: avg(latencyAudit.ttsMs),
        ttsP95Ms: p95(latencyAudit.ttsMs),
        ttsTtfbAvgMs: avg(latencyAudit.ttsTtfbMs),
        ttsProvider: "cartesia",
        ttsModel: ttsModelName,
        ttsVoiceId,
        ttsChunkTimeoutMs,
        ttsBaseUrl,
        ttsDefaultInstanceReused: persistentDefaultTts.reused,
        ttsDefaultInstanceAgeMs: persistentDefaultTts.ageMs,
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
        guardTimeoutBudgetMs: voiceLatencyConfig.guardTimeoutMs,
        guardTimeoutRate: voiceLatencyAudit.guardEligibleTurns > 0
          ? voiceLatencyAudit.guardTimeouts / voiceLatencyAudit.guardEligibleTurns
          : 0,
        openerUsage: voiceLatencyAudit.openerUsage,
        speculativeHeadLeadAvgMs: avg(voiceLatencyAudit.speculativeHeadLeadMs),
        speculativeHeadGapAvgMs: avg(voiceLatencyAudit.speculativeHeadGapMs),
        speculativeHeadHits: voiceLatencyAudit.speculativeHeadHits,
        speculativeHeadCacheMisses: voiceLatencyAudit.speculativeHeadCacheMisses,
        speculativeHeadUsage: voiceLatencyAudit.speculativeHeadUsage,
        speculativeHeadCancelled: voiceLatencyAudit.speculativeHeadCancelled,
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
            sttProvider: latency.sttProvider,
            sttModel: latency.sttModel,
            sttLanguageMode: latency.sttLanguageMode,
            turnDetectionMode: latency.turnDetectionMode,
            turnDetectionRequested: latency.turnDetectionRequested,
            llmAvgMs: avg(latencyAudit.llmMs),
            llmP95Ms: p95(latencyAudit.llmMs),
            llmTtftAvgMs: avg(latencyAudit.llmTtftMs),
            llmByProvider,
            ttsAvgMs: avg(latencyAudit.ttsMs),
            ttsP95Ms: p95(latencyAudit.ttsMs),
            ttsTtfbAvgMs: avg(latencyAudit.ttsTtfbMs),
            ttsProvider: latency.ttsProvider,
            ttsModel: latency.ttsModel,
            ttsVoiceId: latency.ttsVoiceId,
            ttsChunkTimeoutMs: latency.ttsChunkTimeoutMs,
            ttsBaseUrl: latency.ttsBaseUrl,
            ttsDefaultInstanceReused: latency.ttsDefaultInstanceReused,
            ttsDefaultInstanceAgeMs: latency.ttsDefaultInstanceAgeMs,
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
            guardTimeoutBudgetMs: latency.guardTimeoutBudgetMs,
            guardTimeoutRate: latency.guardTimeoutRate,
            openerUsage: voiceLatencyAudit.openerUsage,
            speculativeHeadLeadAvgMs: avg(voiceLatencyAudit.speculativeHeadLeadMs),
            speculativeHeadGapAvgMs: avg(voiceLatencyAudit.speculativeHeadGapMs),
            speculativeHeadHits: voiceLatencyAudit.speculativeHeadHits,
            speculativeHeadCacheMisses: voiceLatencyAudit.speculativeHeadCacheMisses,
            speculativeHeadUsage: voiceLatencyAudit.speculativeHeadUsage,
            speculativeHeadCancelled: voiceLatencyAudit.speculativeHeadCancelled,
          },
          llmRouting: llmRunSummary,
          turns: turnSummaries,
        })}`
      );

      const transcriptText = transcriptTurns
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((turn) => `${turn.role === "assistant" ? "Tracey" : "Caller"}: ${turn.text}`)
        .join("\n");
      const sipAttributes = Object.fromEntries(
        Object.entries(participantAttributes).filter(
          ([key, value]) => typeof value === "string" && (key.startsWith("sip.") || /call/i.test(key)),
        ),
      );

      const syntheticProbeCall = isSyntheticProbeCall({
        callType,
        roomName,
        callerPhone,
        calledPhone,
      });

      voiceCallPersistencePromise = persistVoiceCall({
        callId,
        callType,
        roomName,
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
          ttsVoiceId: tts.getConfiguredVoiceId(),
          ttsLanguage: tts.getCurrentReplyLanguage(),
          ttsModel: tts.getConfiguredModel(),
          maxConcurrentCalls: getMaxConcurrentCalls(),
          voiceTurnTuning,
          customerContactMode: normalVoiceGrounding?.customerContactMode || null,
          emergencyBypass: normalVoiceGrounding?.emergencyBypass ?? null,
          urgentEscalation,
          responsePolicyOutcomes,
          groundingCacheHit: Boolean(normalVoiceGrounding),
          monitoring: syntheticProbeCall ? { syntheticProbeCall: true } : {},
          roomMetadata,
          sipAttributes,
          providerCallIds: {
            twilioCallSid:
              (typeof roomMetadata?.twilioCallSid === "string" && roomMetadata.twilioCallSid) ||
              (typeof roomMetadata?.callSid === "string" && roomMetadata.callSid) ||
              participantAttributes["twilio.callSid"] ||
              participantAttributes.callSid ||
              null,
            sipCallId:
              participantAttributes["sip.callID"] ||
              participantAttributes["sip.callId"] ||
              participantAttributes["sip.call_id"] ||
              participantAttributes["sip.callSid"] ||
              participantAttributes["sip.call_sid"] ||
              null,
          },
          voiceLatency: {
            enabled: voiceLatencyConfig.enabled,
            openerBankEnabled: voiceLatencyConfig.openerBankEnabled,
            guardEnabled: voiceLatencyConfig.guardEnabled,
            speculativeHeadsEnabled: voiceLatencyConfig.speculativeHeadsEnabled,
            speculativeHeadSurfaces: voiceLatencyConfig.speculativeHeadSurfaces,
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

  startWorkerBackgroundLoops({
    logPrefix,
    setWorkerBootReady,
    writeWorkerHealthSnapshot,
    refreshVoiceGroundingIndex,
    postVoiceAgentStatus,
    processQueuedOutboundCalls: shouldProcessQueuedOutboundCalls() ? processQueuedOutboundCalls : undefined,
    voiceGroundingCacheTtlMs: VOICE_GROUNDING_CACHE_TTL_MS,
    voiceAgentHeartbeatMs: VOICE_AGENT_HEARTBEAT_MS,
    queuedOutboundCallPollMs: VOICE_OUTBOUND_CALL_QUEUE_POLL_MS,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startVoiceWorkerBackgroundTasks();
  cli.runApp(
    new WorkerOptions({
      agent: fileURLToPath(import.meta.url),
      numIdleProcesses: 1,
      initializeProcessTimeout: 60_000,
      agentName: process.env.LIVEKIT_AGENT_NAME?.trim() || undefined,
      host: resolveWorkerHttpHost(),
      port: resolveWorkerHttpPort(),
    }),
  );
}
