type VoiceCallSurface = 'demo' | 'inbound_demo' | 'normal';
type GuardProvider = 'groq' | 'deepinfra';

export type VoiceTurnIntent =
  | 'pricing'
  | 'invoice'
  | 'booking'
  | 'lookup'
  | 'handoff'
  | 'message_capture'
  | 'complaint'
  | 'policy'
  | 'emergency'
  | 'general';

export type VoiceRiskLevel = 'low' | 'medium' | 'high';
export type VoiceRoute = 'main_llm' | 'lookup_first' | 'handoff' | 'message_capture';
export type OpenerCategory = 'ack' | 'lookup' | 'handoff' | 'message_capture' | 'empathy';
export type SpeculativeHeadIntent = 'capability' | 'demo' | 'pain_point' | 'next_step';

export type OpenerId =
  | 'yep'
  | 'no_worries'
  | 'got_you'
  | 'one_sec'
  | 'let_me_check'
  | 'i_can_help'
  | 'yeah_absolutely'
  | 'okay_got_you'
  | 'that_sounds_frustrating'
  | 'sorry_thats_annoying'
  | 'i_get_that';

export type SpeculativeHeadId =
  | 'capability_explanation'
  | 'demo_invitation'
  | 'pain_point_ack'
  | 'signup_bridge';

export type OpenerBankEntry = {
  id: OpenerId;
  text: string;
  category: OpenerCategory;
  empathetic: boolean;
};

export type SpeculativeHeadBankEntry = {
  id: SpeculativeHeadId;
  text: string;
  intents: VoiceTurnIntent[];
  surfaces: VoiceCallSurface[];
  category: SpeculativeHeadIntent;
};

export type VoiceTurnPrediction = {
  transcript: string;
  normalizedTranscript: string;
  intent: VoiceTurnIntent;
  confidence: number;
  openerCategory: OpenerCategory | null;
  riskLevel: VoiceRiskLevel;
  route: VoiceRoute;
  allowOpener: boolean;
  useEmpathy: boolean;
  reasons: string[];
  source: 'interim' | 'final';
};

export type GuardDecision = {
  allowOpener: boolean;
  openerId: OpenerId | null;
  route: VoiceRoute;
  riskLevel: VoiceRiskLevel;
  confidence: number;
  reason: string;
  timedOut: boolean;
  fromModel: boolean;
};

export type VoiceLatencyConfig = {
  enabled: boolean;
  openerBankEnabled: boolean;
  guardEnabled: boolean;
  speculativeHeadsEnabled: boolean;
  targetCallTypes: VoiceCallSurface[];
  speculativeHeadSurfaces: VoiceCallSurface[];
  openerConfidenceThreshold: number;
  guardTimeoutMs: number;
  guardMinChars: number;
  empathyTurnGap: number;
  guardRuntime: VoiceGuardRuntime | null;
};

type VoiceGuardRuntime = {
  provider: GuardProvider;
  model: string;
  apiKey: string;
  baseURL: string;
  timeoutMs: number;
  maxCompletionTokens: number;
  temperature: number;
};

const PRICING_PATTERNS = [
  /\b(price|pricing|quote|quoted|cost|rate|fee|charge|estimate|how much)\b/i,
  /\$\s*\d/,
];

const INVOICE_PATTERNS = [
  /\b(invoice|invoiced|billing|bill|payment|paid|unpaid|overdue)\b/i,
];

const POLICY_PATTERNS = [
  /\b(policy|warranty|guarantee|insurance|refund|licensed|licence|compliance|terms)\b/i,
];

const EMERGENCY_PATTERNS = [
  /\b(emergency|urgent|danger|gas leak|sparking|flooding|burst pipe|fire)\b/i,
];

const HANDOFF_PATTERNS = [
  /\b(speak to|talk to|transfer|put me through|human|owner|manager|real person)\b/i,
];

const MESSAGE_PATTERNS = [
  /\b(leave a message|pass on|can you tell|let (him|her|them) know|call me back|message for)\b/i,
];

const BOOKING_PATTERNS = [
  /\b(book|booking|schedule|scheduled|availability|available|slot|reschedule|come out)\b/i,
  /\b(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday)\b/i,
  /\b\d{1,2}\s*(am|pm)\b/i,
];

const LOOKUP_PATTERNS = [
  /\b(open|hours|service area|cover|location|where are you|address|phone number|email)\b/i,
  /\b(when can|do you do|can you help|what services|do you service)\b/i,
];

const COMPLAINT_PATTERNS = [
  /\b(frustrating|annoying|upset|not happy|still waiting|no one called|no one showed|confused|issue|problem|late)\b/i,
];

const BOOKING_CONFIRMATION_PATTERNS = [
  /\b(confirm|lock it in|book it in|see you then|thats fine for|that works)\b/i,
];

const LOW_SIGNAL_PATTERNS = [
  /^\s*(yes|yeah|yep|no|nope|okay|ok|sure|thanks|thank you)\s*[.!]?\s*$/i,
];

const PHASE_TWO_BACKLOG = [
  'speculative multi-branch reply generation',
  'speculative TTS branch caching',
  'broader overseer model for response monitoring',
  'branch selection tied to endpoint certainty',
];

export const OPENER_BANK: OpenerBankEntry[] = [
  { id: 'yep', text: 'Yep.', category: 'ack', empathetic: false },
  { id: 'no_worries', text: 'No worries.', category: 'ack', empathetic: false },
  { id: 'got_you', text: 'Got you.', category: 'message_capture', empathetic: false },
  { id: 'one_sec', text: 'One sec.', category: 'lookup', empathetic: false },
  { id: 'let_me_check', text: 'Let me check.', category: 'lookup', empathetic: false },
  { id: 'i_can_help', text: 'I can help.', category: 'ack', empathetic: false },
  { id: 'yeah_absolutely', text: 'Yeah, absolutely.', category: 'handoff', empathetic: false },
  { id: 'okay_got_you', text: 'Okay, got you.', category: 'message_capture', empathetic: false },
  { id: 'that_sounds_frustrating', text: 'That sounds frustrating.', category: 'empathy', empathetic: true },
  { id: 'sorry_thats_annoying', text: "Sorry, that's annoying.", category: 'empathy', empathetic: true },
  { id: 'i_get_that', text: 'I get that.', category: 'empathy', empathetic: true },
];

export const DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES = 'demo,inbound_demo,normal';
export const DEFAULT_VOICE_SPECULATIVE_HEAD_SURFACES = 'demo,inbound_demo';

export const SPECULATIVE_HEAD_BANK: SpeculativeHeadBankEntry[] = [
  {
    id: 'capability_explanation',
    text: 'Yep, Earlymark can help with that.',
    intents: ['lookup', 'general'],
    surfaces: ['demo', 'inbound_demo'],
    category: 'capability',
  },
  {
    id: 'demo_invitation',
    text: 'Yeah, I can show you that now.',
    intents: ['general', 'lookup'],
    surfaces: ['demo', 'inbound_demo'],
    category: 'demo',
  },
  {
    id: 'pain_point_ack',
    text: 'That is exactly where we help.',
    intents: ['complaint', 'general', 'message_capture'],
    surfaces: ['demo', 'inbound_demo'],
    category: 'pain_point',
  },
  {
    id: 'signup_bridge',
    text: 'Yep, the next step is straightforward.',
    intents: ['handoff', 'general'],
    surfaces: ['demo', 'inbound_demo'],
    category: 'next_step',
  },
];

export function getPhaseTwoBacklog(): string[] {
  return [...PHASE_TWO_BACKLOG];
}

export function normalizeVoiceLatencyTranscript(rawTranscript: string): string {
  return rawTranscript
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s']/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/'/g, '')
    .trim();
}

export function resolveVoiceLatencyConfig(args: {
  callType: VoiceCallSurface;
  llmProvider: string;
  llmModel: string;
  llmApiKey?: string;
  llmBaseURL: string;
}): VoiceLatencyConfig {
  const targetCallTypes = parseCsv(
    process.env.VOICE_LATENCY_TARGET_CALL_TYPES || DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES,
  ).filter(isVoiceCallSurface);
  const enabledByCallType = targetCallTypes.includes(args.callType);
  const enabled = parseBoolean(process.env.VOICE_LATENCY_ENABLED, true) && enabledByCallType;
  const openerBankEnabled = enabled && parseBoolean(process.env.VOICE_OPENER_BANK_ENABLED, true);
  const speculativeHeadSurfaces = normalizeSurfaceList(
    parseCsv(process.env.VOICE_SPECULATIVE_HEADS_SURFACES || DEFAULT_VOICE_SPECULATIVE_HEAD_SURFACES),
  );
  const speculativeHeadsEnabled =
    enabled &&
    parseBoolean(process.env.VOICE_SPECULATIVE_HEADS_ENABLED, true) &&
    speculativeHeadSurfaces.includes(args.callType);

  const guardProvider = normalizeGuardProvider(process.env.VOICE_GUARD_PROVIDER || args.llmProvider);
  const guardApiKey =
    guardProvider === 'groq'
      ? (process.env.GROQ_API_KEY || args.llmApiKey || '')
      : (process.env.DEEPINFRA_API_KEY || args.llmApiKey || '');
  const guardModel =
    process.env.VOICE_GUARD_MODEL ||
    (guardProvider === 'groq' ? 'llama-3.1-8b-instant' : 'meta-llama/Llama-3.2-3B-Instruct');

  const guardRuntime =
    enabled &&
    parseBoolean(process.env.VOICE_GUARD_ENABLED, true) &&
    guardApiKey
      ? {
          provider: guardProvider,
          model: guardModel,
          apiKey: guardApiKey,
          baseURL:
            process.env.VOICE_GUARD_BASE_URL ||
            (guardProvider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.deepinfra.com/v1/openai'),
          timeoutMs: clampNumber(process.env.VOICE_GUARD_TIMEOUT_MS, 100, 40, 250),
          maxCompletionTokens: clampNumber(process.env.VOICE_GUARD_MAX_COMPLETION_TOKENS, 64, 16, 128),
          temperature: clampNumber(process.env.VOICE_GUARD_TEMPERATURE, 0, 0, 0.3),
        }
      : null;

  return {
    enabled,
    openerBankEnabled,
    guardEnabled: Boolean(guardRuntime),
    speculativeHeadsEnabled,
    targetCallTypes,
    speculativeHeadSurfaces,
    openerConfidenceThreshold: clampNumber(process.env.VOICE_OPENER_CONFIDENCE_THRESHOLD, 0.72, 0.4, 0.95),
    guardTimeoutMs: guardRuntime?.timeoutMs ?? clampNumber(process.env.VOICE_GUARD_TIMEOUT_MS, 100, 40, 250),
    guardMinChars: clampNumber(process.env.VOICE_GUARD_MIN_CHARS, 18, 8, 80),
    empathyTurnGap: clampNumber(process.env.VOICE_EMPATHY_TURN_GAP, 3, 1, 8),
    guardRuntime,
  };
}

export function resolveSpeculativeHeadEntry(args: {
  callType: VoiceCallSurface;
  prediction: VoiceTurnPrediction;
}): SpeculativeHeadBankEntry | null {
  if (args.callType === 'normal') return null;
  if (args.prediction.riskLevel !== 'low') return null;
  if (args.prediction.intent === 'pricing' || args.prediction.intent === 'booking' || args.prediction.intent === 'policy') {
    return null;
  }

  return (
    SPECULATIVE_HEAD_BANK.find((entry) =>
      entry.surfaces.includes(args.callType) && entry.intents.includes(args.prediction.intent),
    ) ||
    (args.prediction.intent === 'general'
      ? SPECULATIVE_HEAD_BANK.find((entry) => entry.id === 'capability_explanation') || null
      : null)
  );
}

export function predictVoiceTurn(transcript: string, source: 'interim' | 'final'): VoiceTurnPrediction {
  const normalizedTranscript = normalizeVoiceLatencyTranscript(transcript);
  const reasons: string[] = [];

  if (!normalizedTranscript) {
    return {
      transcript,
      normalizedTranscript,
      intent: 'general',
      confidence: 0,
      openerCategory: null,
      riskLevel: 'high',
      route: 'main_llm',
      allowOpener: false,
      useEmpathy: false,
      reasons: ['empty transcript'],
      source,
    };
  }

  if (LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    return {
      transcript,
      normalizedTranscript,
      intent: 'general',
      confidence: 0.45,
      openerCategory: null,
      riskLevel: 'medium',
      route: 'main_llm',
      allowOpener: false,
      useEmpathy: false,
      reasons: ['short confirmation'],
      source,
    };
  }

  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    return highRiskPrediction(transcript, normalizedTranscript, 'emergency', reasons, source, 'emergency or safety terms');
  }

  if (PRICING_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    return highRiskPrediction(transcript, normalizedTranscript, 'pricing', reasons, source, 'pricing terms');
  }

  if (INVOICE_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    return highRiskPrediction(transcript, normalizedTranscript, 'invoice', reasons, source, 'invoice terms');
  }

  if (POLICY_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    return highRiskPrediction(transcript, normalizedTranscript, 'policy', reasons, source, 'policy or compliance terms');
  }

  if (HANDOFF_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    reasons.push('caller asked for a human handoff');
    return {
      transcript,
      normalizedTranscript,
      intent: 'handoff',
      confidence: 0.9,
      openerCategory: 'handoff',
      riskLevel: 'medium',
      route: 'handoff',
      allowOpener: true,
      useEmpathy: false,
      reasons,
      source,
    };
  }

  if (MESSAGE_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    reasons.push('caller is leaving or passing on a message');
    return {
      transcript,
      normalizedTranscript,
      intent: 'message_capture',
      confidence: 0.86,
      openerCategory: 'message_capture',
      riskLevel: 'low',
      route: 'message_capture',
      allowOpener: true,
      useEmpathy: false,
      reasons,
      source,
    };
  }

  if (BOOKING_CONFIRMATION_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    reasons.push('booking confirmation language');
    return {
      transcript,
      normalizedTranscript,
      intent: 'booking',
      confidence: 0.78,
      openerCategory: null,
      riskLevel: 'high',
      route: 'lookup_first',
      allowOpener: false,
      useEmpathy: false,
      reasons,
      source,
    };
  }

  if (COMPLAINT_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    reasons.push('complaint or frustration language');
    return {
      transcript,
      normalizedTranscript,
      intent: 'complaint',
      confidence: 0.82,
      openerCategory: 'empathy',
      riskLevel: 'low',
      route: 'main_llm',
      allowOpener: true,
      useEmpathy: true,
      reasons,
      source,
    };
  }

  if (BOOKING_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    reasons.push('booking or availability request');
    return {
      transcript,
      normalizedTranscript,
      intent: 'booking',
      confidence: 0.76,
      openerCategory: 'lookup',
      riskLevel: 'medium',
      route: 'lookup_first',
      allowOpener: true,
      useEmpathy: false,
      reasons,
      source,
    };
  }

  if (LOOKUP_PATTERNS.some((pattern) => pattern.test(normalizedTranscript))) {
    reasons.push('lookup style question');
    return {
      transcript,
      normalizedTranscript,
      intent: 'lookup',
      confidence: 0.72,
      openerCategory: 'lookup',
      riskLevel: 'low',
      route: 'lookup_first',
      allowOpener: true,
      useEmpathy: false,
      reasons,
      source,
    };
  }

  reasons.push('general assistance turn');
  return {
    transcript,
    normalizedTranscript,
    intent: 'general',
    confidence: 0.58,
    openerCategory: 'ack',
    riskLevel: 'low',
    route: 'main_llm',
    allowOpener: true,
    useEmpathy: false,
    reasons,
    source,
  };
}

export function shouldPrimeVoiceGuard(
  prediction: VoiceTurnPrediction,
  transcript: string,
  config: VoiceLatencyConfig
): boolean {
  return (
    config.enabled &&
    config.guardEnabled &&
    prediction.allowOpener &&
    prediction.confidence >= config.openerConfidenceThreshold &&
    transcript.trim().length >= config.guardMinChars
  );
}

export async function runVoiceGuardDecision(args: {
  transcript: string;
  prediction: VoiceTurnPrediction;
  config: VoiceLatencyConfig;
}): Promise<GuardDecision | null> {
  const runtime = args.config.guardRuntime;
  if (!args.config.enabled || !args.config.guardEnabled || !runtime) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), runtime.timeoutMs);
  const body = {
    model: runtime.model,
    temperature: runtime.temperature,
    max_tokens: runtime.maxCompletionTokens,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a realtime voice turn guard for a trades-business receptionist AI. Decide if a short cached opener can safely play before the main answer. Never allow opener-first speech for pricing, invoices, policy/compliance, emergency/safety guidance, or firm booking confirmations. Return strict JSON only with keys allowOpener, openerId, route, riskLevel, confidence, reason.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          transcript: args.transcript,
          predictedIntent: args.prediction.intent,
          predictedRiskLevel: args.prediction.riskLevel,
          predictedRoute: args.prediction.route,
          suggestedOpenerCategory: args.prediction.openerCategory,
          allowedOpeners: OPENER_BANK.map((entry) => ({
            id: entry.id,
            text: entry.text,
            category: entry.category,
            empathetic: entry.empathetic,
          })),
        }),
      },
    ],
  };

  try {
    const response = await fetch(`${runtime.baseURL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runtime.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = parseGuardDecision(content);
    return parsed;
  } catch (error) {
    if (isAbortError(error)) {
      return {
        allowOpener: false,
        openerId: null,
        route: args.prediction.route,
        riskLevel: args.prediction.riskLevel,
        confidence: 0,
        reason: 'guard timed out',
        timedOut: true,
        fromModel: false,
      };
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function resolveOpenerEntry(args: {
  prediction: VoiceTurnPrediction;
  guardDecision?: GuardDecision | null;
  userTurnIndex: number;
  lastEmpatheticTurnIndex: number;
  empathyTurnGap: number;
}): OpenerBankEntry | null {
  if (!args.prediction.allowOpener) return null;

  const guardDecision = args.guardDecision ?? null;
  if (guardDecision && !guardDecision.allowOpener) return null;

  const preferredId = guardDecision?.openerId || null;
  if (preferredId) {
    const preferred = OPENER_BANK.find((entry) => entry.id === preferredId) || null;
    if (preferred && canUseEmpathy(preferred, args.userTurnIndex, args.lastEmpatheticTurnIndex, args.empathyTurnGap)) {
      return preferred;
    }
  }

  const category = args.prediction.openerCategory;
  if (!category) return null;

  const pool = OPENER_BANK.filter((entry) => entry.category === category);
  const allowedPool = pool.filter((entry) =>
    canUseEmpathy(entry, args.userTurnIndex, args.lastEmpatheticTurnIndex, args.empathyTurnGap)
  );
  if (!allowedPool.length) return null;

  return allowedPool[args.userTurnIndex % allowedPool.length] || allowedPool[0] || null;
}

export function buildVoiceFollowupInstructions(args: {
  prediction: VoiceTurnPrediction;
  openerEntry?: OpenerBankEntry | null;
  guardDecision?: GuardDecision | null;
}): string {
  const lines: string[] = [];
  if (args.openerEntry) {
    lines.push(`A short opener has already been spoken to the caller: "${args.openerEntry.text}"`);
    lines.push('Continue straight into the substantive answer.');
    lines.push('Do not repeat another acknowledgement or empathy filler.');
  }

  switch (args.guardDecision?.route || args.prediction.route) {
    case 'lookup_first':
      lines.push('If availability, services, or business facts are needed, use the lookup tools before committing.');
      break;
    case 'handoff':
      lines.push('Confirm the handoff request clearly, then use the transfer tool if appropriate.');
      break;
    case 'message_capture':
      lines.push('Focus on cleanly capturing the caller message and next callback details.');
      break;
    default:
      break;
  }

  if (args.prediction.intent === 'complaint') {
    lines.push('Acknowledge the issue once, then move quickly to the fix or next step.');
  }

  return lines.join(' ');
}

function highRiskPrediction(
  transcript: string,
  normalizedTranscript: string,
  intent: VoiceTurnIntent,
  reasons: string[],
  source: 'interim' | 'final',
  reason: string
): VoiceTurnPrediction {
  reasons.push(reason);
  return {
    transcript,
    normalizedTranscript,
    intent,
    confidence: 0.92,
    openerCategory: null,
    riskLevel: 'high',
    route: 'main_llm',
    allowOpener: false,
    useEmpathy: false,
    reasons,
    source,
  };
}

function parseGuardDecision(rawContent: string): GuardDecision | null {
  const start = rawContent.indexOf('{');
  const end = rawContent.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(rawContent.slice(start, end + 1)) as Partial<GuardDecision>;
    const openerId = isOpenerId(parsed.openerId) ? parsed.openerId : null;
    return {
      allowOpener: Boolean(parsed.allowOpener),
      openerId,
      route: isVoiceRoute(parsed.route) ? parsed.route : 'main_llm',
      riskLevel: isRiskLevel(parsed.riskLevel) ? parsed.riskLevel : 'medium',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'guard model decision',
      timedOut: false,
      fromModel: true,
    };
  } catch {
    return null;
  }
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
  return fallback;
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeSurfaceList(values: string[]) {
  return Array.from(new Set(values.filter(isVoiceCallSurface)));
}

function clampNumber(rawValue: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeGuardProvider(value: string): GuardProvider {
  return value.toLowerCase() === 'groq' ? 'groq' : 'deepinfra';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isVoiceCallSurface(value: string): value is VoiceCallSurface {
  return value === 'demo' || value === 'inbound_demo' || value === 'normal';
}

function isOpenerId(value: unknown): value is OpenerId {
  return typeof value === 'string' && OPENER_BANK.some((entry) => entry.id === value);
}

function isVoiceRoute(value: unknown): value is VoiceRoute {
  return value === 'main_llm' || value === 'lookup_first' || value === 'handoff' || value === 'message_capture';
}

function isRiskLevel(value: unknown): value is VoiceRiskLevel {
  return value === 'low' || value === 'medium' || value === 'high';
}

function canUseEmpathy(
  entry: OpenerBankEntry,
  userTurnIndex: number,
  lastEmpatheticTurnIndex: number,
  empathyTurnGap: number
): boolean {
  if (!entry.empathetic) return true;
  return userTurnIndex - lastEmpatheticTurnIndex >= empathyTurnGap;
}

const voiceLatency = {
  DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES,
  DEFAULT_VOICE_SPECULATIVE_HEAD_SURFACES,
  OPENER_BANK,
  SPECULATIVE_HEAD_BANK,
  buildVoiceFollowupInstructions,
  getPhaseTwoBacklog,
  normalizeVoiceLatencyTranscript,
  predictVoiceTurn,
  resolveOpenerEntry,
  resolveSpeculativeHeadEntry,
  resolveVoiceLatencyConfig,
  runVoiceGuardDecision,
  shouldPrimeVoiceGuard,
};

export default voiceLatency;
