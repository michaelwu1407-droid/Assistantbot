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

const VOICE_AGENT_RUNTIME_VALUE_KEYS = [
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

export function buildVoiceAgentRuntimeFingerprintSource(env: NodeJS.ProcessEnv = process.env) {
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
  };

  for (const key of VOICE_AGENT_RUNTIME_VALUE_KEYS) {
    source[key] = normalizeEnvValue(env[key]);
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
