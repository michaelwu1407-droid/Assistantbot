type CallType = "demo" | "inbound_demo" | "normal";
type LlmProviderName = "groq" | "deepinfra";

const DEFAULT_TTS_VOICE_ID = "a4a16c5e-5902-4732-b9b6-2a48efd2e11b";
const DEFAULT_TTS_LANGUAGE = "en-AU";
const DEFAULT_TTS_CHUNK_TIMEOUT_MS = 1500;
const SURFACE_ORDER: CallType[] = ["demo", "inbound_demo", "normal"];

function normalizeEnvValue(value?: string | null) {
  return (value || "").trim();
}

function normalizeConfigured(value?: string | null) {
  return normalizeEnvValue(value) ? "configured" : "";
}

function normalizePhone(value?: string | null) {
  if (!value) return "";
  const cleaned = value.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampNumber(rawValue: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeCsv(value?: string | null) {
  return normalizeEnvValue(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isVoiceSurface(value: string): value is CallType {
  return value === "demo" || value === "inbound_demo" || value === "normal";
}

function normalizeSurfaceList(values: string[]) {
  return Array.from(new Set(values.filter(isVoiceSurface))).sort(
    (left, right) => SURFACE_ORDER.indexOf(left) - SURFACE_ORDER.indexOf(right),
  );
}

function getKnownEarlymarkInboundNumberSet(env: NodeJS.ProcessEnv = process.env) {
  const values = [
    ...(normalizeEnvValue(env.EARLYMARK_INBOUND_PHONE_NUMBERS) || "")
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean),
    env.EARLYMARK_INBOUND_PHONE_NUMBER,
    env.EARLYMARK_PHONE_NUMBER,
    env.TWILIO_PHONE_NUMBER,
  ]
    .filter(Boolean)
    .map((value) => normalizePhone(value))
    .filter(Boolean);

  return Array.from(new Set(values)).sort();
}

function normalizeLiveKitFingerprintUrl(value: string) {
  if (!value) return value;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const port = url.port || (url.protocol === "https:" ? "443" : url.protocol === "http:" ? "80" : "");

    if (
      (hostname === "live.earlymark.ai" && port === "443") ||
      (hostname === "localhost" && port === "7880")
    ) {
      return "livekit://earlymark-primary";
    }

    const normalizedPath = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}${normalizedPath}`;
  } catch {
    return value;
  }
}

function normalizeBaseUrl(value: string) {
  if (!value) return value;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const normalizedPath = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    const normalizedPort =
      url.port && !((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80"))
        ? `:${url.port}`
        : "";
    return `${url.protocol}//${hostname}${normalizedPort}${normalizedPath}`;
  } catch {
    return value;
  }
}

function resolveAppBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return normalizeBaseUrl(normalizeEnvValue(env.NEXT_PUBLIC_APP_URL) || normalizeEnvValue(env.APP_URL));
}

function resolveVoiceAgentAuthMode(env: NodeJS.ProcessEnv = process.env) {
  return normalizeConfigured(normalizeEnvValue(env.VOICE_AGENT_WEBHOOK_SECRET) || normalizeEnvValue(env.LIVEKIT_API_SECRET));
}

function getConfiguredWorkerRole(env: NodeJS.ProcessEnv = process.env) {
  return normalizeEnvValue(env.VOICE_WORKER_ROLE) || "tracey-all-agent";
}

function getConfiguredWorkerSurfaces(env: NodeJS.ProcessEnv = process.env) {
  const parsed = normalizeSurfaceList(normalizeCsv(env.VOICE_WORKER_SURFACES));
  if (parsed.length > 0) {
    return parsed;
  }

  const workerRole = getConfiguredWorkerRole(env);
  if (workerRole === "tracey-sales-agent") return ["demo", "inbound_demo"] as CallType[];
  if (workerRole === "tracey-customer-agent") return ["normal"] as CallType[];
  return SURFACE_ORDER;
}

function isEarlymarkCall(callType: CallType) {
  return callType === "demo" || callType === "inbound_demo";
}

function inferConfiguredPrimaryProvider(callType: CallType, env: NodeJS.ProcessEnv = process.env): LlmProviderName {
  const configured = (
    isEarlymarkCall(callType)
      ? env.EARLYMARK_VOICE_LLM_PROVIDER
      : env.VOICE_LLM_PROVIDER
  )?.trim().toLowerCase();

  return configured === "deepinfra" ? "deepinfra" : "groq";
}

function resolveAlternateProvider(provider: LlmProviderName): LlmProviderName {
  return provider === "groq" ? "deepinfra" : "groq";
}

function resolveProviderApiConfigured(provider: LlmProviderName, env: NodeJS.ProcessEnv = process.env) {
  return provider === "groq"
    ? normalizeConfigured(env.GROQ_API_KEY)
    : normalizeConfigured(env.DEEPINFRA_API_KEY);
}

function resolveProviderModel(
  callType: CallType,
  provider: LlmProviderName,
  isFallback: boolean,
  env: NodeJS.ProcessEnv = process.env,
) {
  const configuredModel = isEarlymarkCall(callType)
    ? env.EARLYMARK_VOICE_LLM_MODEL
    : env.VOICE_LLM_MODEL;
  const configuredFallbackModel = isEarlymarkCall(callType)
    ? env.EARLYMARK_VOICE_FALLBACK_LLM_MODEL
    : env.VOICE_FALLBACK_LLM_MODEL;

  if (!isFallback && normalizeEnvValue(configuredModel)) {
    return normalizeEnvValue(configuredModel);
  }
  if (isFallback && normalizeEnvValue(configuredFallbackModel)) {
    return normalizeEnvValue(configuredFallbackModel);
  }

  return provider === "groq"
    ? "llama-3.3-70b-versatile"
    : "meta-llama/Meta-Llama-3.1-8B-Instruct";
}

function resolveProviderTemperature(callType: CallType, env: NodeJS.ProcessEnv = process.env) {
  return String(
    Number(
      isEarlymarkCall(callType)
        ? env.EARLYMARK_VOICE_LLM_TEMPERATURE || 0.1
        : env.VOICE_LLM_TEMPERATURE || 0.2,
    ),
  );
}

function resolveProviderMaxCompletionTokens(callType: CallType, env: NodeJS.ProcessEnv = process.env) {
  return String(
    Number(
      callType === "inbound_demo"
        ? env.INBOUND_VOICE_LLM_MAX_COMPLETION_TOKENS || 32
        : callType === "demo"
          ? env.EARLYMARK_VOICE_LLM_MAX_COMPLETION_TOKENS || 40
          : env.VOICE_LLM_MAX_COMPLETION_TOKENS || 80,
    ),
  );
}

function resolveVoiceTurnTuning(callType: CallType, env: NodeJS.ProcessEnv = process.env) {
  const sttEndpointingMs = callType === "inbound_demo"
    ? readPositiveNumber(
        env.INBOUND_VOICE_STT_ENDPOINTING_MS,
        readPositiveNumber(env.EARLYMARK_VOICE_STT_ENDPOINTING_MS, 220),
      )
    : isEarlymarkCall(callType)
      ? readPositiveNumber(env.EARLYMARK_VOICE_STT_ENDPOINTING_MS, 220)
      : readPositiveNumber(env.VOICE_STT_ENDPOINTING_MS, 300);

  return {
    sttEndpointingMs: String(sttEndpointingMs),
    minConsecutiveSpeechDelayMs: String(
      isEarlymarkCall(callType)
        ? readPositiveNumber(env.EARLYMARK_VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS, 140)
        : readPositiveNumber(env.VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS, 180),
    ),
    minEndpointingDelayMs: String(
      isEarlymarkCall(callType)
        ? readPositiveNumber(env.EARLYMARK_VOICE_MIN_ENDPOINTING_DELAY_MS, 180)
        : readPositiveNumber(env.VOICE_MIN_ENDPOINTING_DELAY_MS, 250),
    ),
    maxEndpointingDelayMs: String(
      isEarlymarkCall(callType)
        ? readPositiveNumber(env.EARLYMARK_VOICE_MAX_ENDPOINTING_DELAY_MS, 550)
        : readPositiveNumber(env.VOICE_MAX_ENDPOINTING_DELAY_MS, 800),
    ),
    minInterruptionDurationMs: String(
      isEarlymarkCall(callType)
        ? readPositiveNumber(env.EARLYMARK_VOICE_MIN_INTERRUPTION_DURATION_MS, 260)
        : readPositiveNumber(env.VOICE_MIN_INTERRUPTION_DURATION_MS, 400),
    ),
    minInterruptionWords: String(
      callType === "inbound_demo"
        ? readPositiveNumber(
            env.INBOUND_VOICE_MIN_INTERRUPTION_WORDS,
            readPositiveNumber(env.EARLYMARK_VOICE_MIN_INTERRUPTION_WORDS, 1),
          )
        : isEarlymarkCall(callType)
          ? readPositiveNumber(env.EARLYMARK_VOICE_MIN_INTERRUPTION_WORDS, 2)
          : readPositiveNumber(env.VOICE_MIN_INTERRUPTION_WORDS, 3),
    ),
  };
}

function resolveGuardProvider(primaryProvider: LlmProviderName, env: NodeJS.ProcessEnv = process.env): LlmProviderName {
  return normalizeEnvValue(env.VOICE_GUARD_PROVIDER).toLowerCase() === "groq" ? "groq" : primaryProvider === "deepinfra" ? "deepinfra" : "groq";
}

function resolveVoiceLatencyFingerprintConfig(
  callType: CallType,
  primaryProvider: LlmProviderName,
  env: NodeJS.ProcessEnv = process.env,
) {
  const targetCallTypes = normalizeSurfaceList(normalizeCsv(env.VOICE_LATENCY_TARGET_CALL_TYPES || "normal"));
  const enabledByCallType = targetCallTypes.includes(callType);
  const enabled = parseBoolean(env.VOICE_LATENCY_ENABLED, true) && enabledByCallType;
  const openerBankEnabled = enabled && parseBoolean(env.VOICE_OPENER_BANK_ENABLED, true);
  const guardProvider = resolveGuardProvider(primaryProvider, env);
  const guardApiConfigured = enabled ? resolveProviderApiConfigured(guardProvider, env) : "";
  const guardEnabled = enabled && parseBoolean(env.VOICE_GUARD_ENABLED, true) && Boolean(guardApiConfigured);

  return {
    enabled: enabled ? "true" : "false",
    openerBankEnabled: openerBankEnabled ? "true" : "false",
    targetCallTypes: targetCallTypes.join(","),
    openerConfidenceThreshold: String(clampNumber(env.VOICE_OPENER_CONFIDENCE_THRESHOLD, 0.72, 0.4, 0.95)),
    guardEnabled: guardEnabled ? "true" : "false",
    guardProvider: guardEnabled ? guardProvider : "",
    guardModel: guardEnabled
      ? normalizeEnvValue(env.VOICE_GUARD_MODEL) || (guardProvider === "groq" ? "llama-3.1-8b-instant" : "meta-llama/Llama-3.2-3B-Instruct")
      : "",
    guardBaseUrl: guardEnabled
      ? normalizeEnvValue(env.VOICE_GUARD_BASE_URL) || (guardProvider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.deepinfra.com/v1/openai")
      : "",
    guardTimeoutMs: String(clampNumber(env.VOICE_GUARD_TIMEOUT_MS, 100, 40, 250)),
    guardMaxCompletionTokens: String(clampNumber(env.VOICE_GUARD_MAX_COMPLETION_TOKENS, 64, 16, 128)),
    guardTemperature: String(clampNumber(env.VOICE_GUARD_TEMPERATURE, 0, 0, 0.3)),
    guardMinChars: String(clampNumber(env.VOICE_GUARD_MIN_CHARS, 18, 8, 80)),
    empathyTurnGap: String(clampNumber(env.VOICE_EMPATHY_TURN_GAP, 3, 1, 8)),
    guardApiConfigured,
  };
}

function getMaxConcurrentCalls(env: NodeJS.ProcessEnv = process.env, workerRole = getConfiguredWorkerRole(env)) {
  const explicit = Number(env.VOICE_MAX_ACTIVE_CALLS || "");
  if (Number.isFinite(explicit) && explicit > 0) {
    return String(Math.max(1, Math.trunc(explicit)));
  }

  const roleSpecific = workerRole === "tracey-sales-agent"
    ? Number(env.VOICE_MAX_ACTIVE_CALLS_SALES || "")
    : workerRole === "tracey-customer-agent"
      ? Number(env.VOICE_MAX_ACTIVE_CALLS_CUSTOMER || "")
      : Number.NaN;

  if (Number.isFinite(roleSpecific) && roleSpecific > 0) {
    return String(Math.max(1, Math.trunc(roleSpecific)));
  }

  return workerRole === "tracey-customer-agent" ? "8" : "1";
}

function getSurfaceKey(surface: CallType) {
  return surface.toUpperCase();
}

export function buildVoiceAgentRuntimeFingerprintSource(env: NodeJS.ProcessEnv = process.env) {
  const workerRole = getConfiguredWorkerRole(env);
  const surfaces = getConfiguredWorkerSurfaces(env);
  const source: Record<string, string> = {
    LIVEKIT_TARGET: normalizeLiveKitFingerprintUrl(normalizeEnvValue(env.LIVEKIT_URL)),
    APP_BASE_URL: resolveAppBaseUrl(env),
    EARLYMARK_INBOUND_PHONE_SET: getKnownEarlymarkInboundNumberSet(env).join(","),
    LIVEKIT_API_KEY: normalizeConfigured(env.LIVEKIT_API_KEY),
    LIVEKIT_API_SECRET: normalizeConfigured(env.LIVEKIT_API_SECRET),
    VOICE_AGENT_AUTH_SECRET: resolveVoiceAgentAuthMode(env),
    DEEPGRAM_API_KEY: normalizeConfigured(env.DEEPGRAM_API_KEY),
    DEEPINFRA_API_KEY: normalizeConfigured(env.DEEPINFRA_API_KEY),
    GROQ_API_KEY: normalizeConfigured(env.GROQ_API_KEY),
    CARTESIA_API_KEY: normalizeConfigured(env.CARTESIA_API_KEY),
    VOICE_HOST_ID: normalizeEnvValue(env.VOICE_HOST_ID),
    VOICE_WORKER_ROLE: workerRole,
    VOICE_WORKER_SURFACES: surfaces.join(","),
    MAX_CONCURRENT_CALLS: getMaxConcurrentCalls(env, workerRole),
    STT_MODEL: normalizeEnvValue(env.VOICE_STT_MODEL) || "nova-3",
    TTS_VOICE_ID: normalizeEnvValue(env.VOICE_TTS_VOICE_ID) || DEFAULT_TTS_VOICE_ID,
    TTS_LANGUAGE: normalizeEnvValue(env.VOICE_TTS_LANGUAGE) || DEFAULT_TTS_LANGUAGE,
    TTS_CHUNK_TIMEOUT_MS: String(readPositiveNumber(env.VOICE_TTS_CHUNK_TIMEOUT_MS, DEFAULT_TTS_CHUNK_TIMEOUT_MS)),
  };

  for (const surface of surfaces) {
    const primaryProvider = inferConfiguredPrimaryProvider(surface, env);
    const fallbackProvider = resolveAlternateProvider(primaryProvider);
    const fallbackConfigured = resolveProviderApiConfigured(fallbackProvider, env);
    const tuning = resolveVoiceTurnTuning(surface, env);
    const latency = resolveVoiceLatencyFingerprintConfig(surface, primaryProvider, env);
    const prefix = getSurfaceKey(surface);

    source[`${prefix}_PRIMARY_PROVIDER`] = primaryProvider;
    source[`${prefix}_PRIMARY_MODEL`] = resolveProviderModel(surface, primaryProvider, false, env);
    source[`${prefix}_PRIMARY_TEMPERATURE`] = resolveProviderTemperature(surface, env);
    source[`${prefix}_PRIMARY_MAX_COMPLETION_TOKENS`] = resolveProviderMaxCompletionTokens(surface, env);
    source[`${prefix}_FALLBACK_PROVIDER`] = fallbackConfigured ? fallbackProvider : "";
    source[`${prefix}_FALLBACK_MODEL`] = fallbackConfigured
      ? resolveProviderModel(surface, fallbackProvider, true, env)
      : "";
    source[`${prefix}_STT_ENDPOINTING_MS`] = tuning.sttEndpointingMs;
    source[`${prefix}_MIN_CONSECUTIVE_SPEECH_DELAY_MS`] = tuning.minConsecutiveSpeechDelayMs;
    source[`${prefix}_MIN_ENDPOINTING_DELAY_MS`] = tuning.minEndpointingDelayMs;
    source[`${prefix}_MAX_ENDPOINTING_DELAY_MS`] = tuning.maxEndpointingDelayMs;
    source[`${prefix}_MIN_INTERRUPTION_DURATION_MS`] = tuning.minInterruptionDurationMs;
    source[`${prefix}_MIN_INTERRUPTION_WORDS`] = tuning.minInterruptionWords;
    source[`${prefix}_LATENCY_ENABLED`] = latency.enabled;
    source[`${prefix}_LATENCY_TARGET_CALL_TYPES`] = latency.targetCallTypes;
    source[`${prefix}_OPENER_BANK_ENABLED`] = latency.openerBankEnabled;
    source[`${prefix}_OPENER_CONFIDENCE_THRESHOLD`] = latency.openerConfidenceThreshold;
    source[`${prefix}_GUARD_ENABLED`] = latency.guardEnabled;
    source[`${prefix}_GUARD_PROVIDER`] = latency.guardProvider;
    source[`${prefix}_GUARD_MODEL`] = latency.guardModel;
    source[`${prefix}_GUARD_BASE_URL`] = latency.guardBaseUrl;
    source[`${prefix}_GUARD_TIMEOUT_MS`] = latency.guardTimeoutMs;
    source[`${prefix}_GUARD_MAX_COMPLETION_TOKENS`] = latency.guardMaxCompletionTokens;
    source[`${prefix}_GUARD_TEMPERATURE`] = latency.guardTemperature;
    source[`${prefix}_GUARD_MIN_CHARS`] = latency.guardMinChars;
    source[`${prefix}_EMPATHY_TURN_GAP`] = latency.empathyTurnGap;
  }

  return source;
}

export function buildVoiceAgentRuntimeFingerprint(env: NodeJS.ProcessEnv = process.env) {
  const source = buildVoiceAgentRuntimeFingerprintSource(env);
  const serialized = JSON.stringify(
    Object.keys(source)
      .sort()
      .map((key) => [key, source[key]]),
  );

  let hash = 5381;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = ((hash << 5) + hash) ^ serialized.charCodeAt(index);
  }

  return `va_${(hash >>> 0).toString(16)}`;
}
