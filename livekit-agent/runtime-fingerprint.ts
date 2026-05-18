type CallType = "demo" | "inbound_demo" | "normal";
type LlmProviderName = "groq" | "deepinfra";

const DEFAULT_TTS_VOICE_ID = "a4a16c5e-5902-4732-b9b6-2a48efd2e11b";
const DEFAULT_TTS_LANGUAGE = "en-AU";
const DEFAULT_TTS_MODEL = "sonic-3";
const DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES = "demo,inbound_demo,normal";
const DEFAULT_VOICE_SPECULATIVE_HEAD_SURFACES = "demo,inbound_demo";
const SURFACE_ORDER: CallType[] = ["demo", "inbound_demo", "normal"];

function normalizeEnvValue(value?: string | null) {
  return (value || "").trim();
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
      ((hostname === "localhost" || hostname === "127.0.0.1") && port === "7880")
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
    const hostname = url.hostname.toLowerCase() === "earlymark.ai"
      ? "www.earlymark.ai"
      : url.hostname.toLowerCase();
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

function inferConfiguredPrimaryProvider(callType: Extract<CallType, "demo" | "normal">, env: NodeJS.ProcessEnv = process.env): LlmProviderName {
  const configured = (
    callType === "demo"
      ? env.EARLYMARK_VOICE_LLM_PROVIDER
      : env.VOICE_LLM_PROVIDER
  )?.trim().toLowerCase();

  return configured === "deepinfra" ? "deepinfra" : "groq";
}

function resolveAlternateProvider(provider: LlmProviderName): LlmProviderName {
  return provider === "groq" ? "deepinfra" : "groq";
}

function resolveProviderModel(
  callType: Extract<CallType, "demo" | "normal">,
  provider: LlmProviderName,
  isFallback: boolean,
  env: NodeJS.ProcessEnv = process.env,
) {
  const configuredModel = callType === "demo"
    ? env.EARLYMARK_VOICE_LLM_MODEL
    : env.VOICE_LLM_MODEL;
  const configuredFallbackModel = callType === "demo"
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

  return workerRole === "tracey-customer-agent" ? "8" : "2";
}

function resolveLatencyTargetCallTypes(env: NodeJS.ProcessEnv = process.env) {
  const parsed = normalizeSurfaceList(
    normalizeCsv(env.VOICE_LATENCY_TARGET_CALL_TYPES || DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES),
  );
  return parsed.length > 0 ? parsed.join(",") : DEFAULT_VOICE_LATENCY_TARGET_CALL_TYPES;
}

export function buildVoiceAgentRuntimeFingerprintSource(env: NodeJS.ProcessEnv = process.env) {
  const workerRole = getConfiguredWorkerRole(env);
  const earlymarkPrimaryProvider = inferConfiguredPrimaryProvider("demo", env);
  const customerPrimaryProvider = inferConfiguredPrimaryProvider("normal", env);

  return {
    LIVEKIT_TARGET: normalizeLiveKitFingerprintUrl(normalizeEnvValue(env.LIVEKIT_URL)),
    APP_BASE_URL: resolveAppBaseUrl(env),
    EARLYMARK_INBOUND_PHONE_SET: getKnownEarlymarkInboundNumberSet(env).join(","),
    VOICE_HOST_ID: normalizeEnvValue(env.VOICE_HOST_ID),
    VOICE_WORKER_ROLE: workerRole,
    VOICE_WORKER_SURFACES: getConfiguredWorkerSurfaces(env).join(","),
    MAX_CONCURRENT_CALLS: getMaxConcurrentCalls(env, workerRole),
    EARLYMARK_PRIMARY_PROVIDER: earlymarkPrimaryProvider,
    EARLYMARK_FALLBACK_PROVIDER: resolveAlternateProvider(earlymarkPrimaryProvider),
    CUSTOMER_PRIMARY_PROVIDER: customerPrimaryProvider,
    CUSTOMER_FALLBACK_PROVIDER: resolveAlternateProvider(customerPrimaryProvider),
    EARLYMARK_PRIMARY_MODEL: resolveProviderModel("demo", earlymarkPrimaryProvider, false, env),
    EARLYMARK_FALLBACK_MODEL: resolveProviderModel("demo", resolveAlternateProvider(earlymarkPrimaryProvider), true, env),
    CUSTOMER_PRIMARY_MODEL: resolveProviderModel("normal", customerPrimaryProvider, false, env),
    CUSTOMER_FALLBACK_MODEL: resolveProviderModel("normal", resolveAlternateProvider(customerPrimaryProvider), true, env),
    STT_MODEL: normalizeEnvValue(env.VOICE_STT_MODEL) || "nova-3",
    TTS_MODEL: normalizeEnvValue(env.VOICE_TTS_MODEL) || DEFAULT_TTS_MODEL,
    TTS_VOICE_ID: normalizeEnvValue(env.VOICE_TTS_VOICE_ID) || DEFAULT_TTS_VOICE_ID,
    TTS_LANGUAGE: normalizeEnvValue(env.VOICE_TTS_LANGUAGE) || DEFAULT_TTS_LANGUAGE,
    VOICE_LATENCY_ENABLED: parseBoolean(env.VOICE_LATENCY_ENABLED, true) ? "true" : "false",
    VOICE_OPENER_BANK_ENABLED: parseBoolean(env.VOICE_OPENER_BANK_ENABLED, true) ? "true" : "false",
    VOICE_GUARD_ENABLED: parseBoolean(env.VOICE_GUARD_ENABLED, true) ? "true" : "false",
    VOICE_LATENCY_TARGET_CALL_TYPES: resolveLatencyTargetCallTypes(env),
    VOICE_SPECULATIVE_HEADS_ENABLED: parseBoolean(env.VOICE_SPECULATIVE_HEADS_ENABLED, false) ? "true" : "false",
    VOICE_SPECULATIVE_HEADS_SURFACES:
      normalizeSurfaceList(normalizeCsv(env.VOICE_SPECULATIVE_HEADS_SURFACES || DEFAULT_VOICE_SPECULATIVE_HEAD_SURFACES)).join(",") ||
      DEFAULT_VOICE_SPECULATIVE_HEAD_SURFACES,
  };
}

export function buildVoiceAgentRuntimeFingerprint(env: NodeJS.ProcessEnv = process.env) {
  const source = buildVoiceAgentRuntimeFingerprintSource(env);
  const serialized = JSON.stringify(
    Object.keys(source)
      .sort()
      .map((key) => [key, source[key as keyof typeof source]]),
  );

  let hash = 5381;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = ((hash << 5) + hash) ^ serialized.charCodeAt(index);
  }

  return `va_${(hash >>> 0).toString(16)}`;
}

function getEquivalentAppUrls(env: NodeJS.ProcessEnv = process.env) {
  const configured = normalizeEnvValue(env.NEXT_PUBLIC_APP_URL) || normalizeEnvValue(env.APP_URL);
  const normalized = normalizeBaseUrl(configured);
  const values = new Set<string>();

  if (normalized) {
    values.add(normalized);
    if (normalized === "https://www.earlymark.ai") values.add("https://earlymark.ai");
    if (normalized === "https://earlymark.ai") values.add("https://www.earlymark.ai");
  }

  return Array.from(values);
}

function getEquivalentLiveKitUrls(env: NodeJS.ProcessEnv = process.env) {
  const configured = normalizeEnvValue(env.LIVEKIT_URL);
  const normalized = normalizeLiveKitFingerprintUrl(configured);
  const values = new Set<string>();

  if (normalized === "livekit://earlymark-primary") {
    values.add("https://live.earlymark.ai");
    values.add("http://127.0.0.1:7880");
    values.add("http://localhost:7880");
  } else if (configured) {
    values.add(configured);
  }

  return Array.from(values);
}

export function buildEquivalentVoiceAgentRuntimeFingerprints(env: NodeJS.ProcessEnv = process.env) {
  const appUrls = getEquivalentAppUrls(env);
  const livekitUrls = getEquivalentLiveKitUrls(env);
  const fingerprints = new Set<string>();

  const appUrlCandidates = appUrls.length > 0 ? appUrls : [undefined];
  const livekitUrlCandidates = livekitUrls.length > 0 ? livekitUrls : [undefined];

  for (const appUrl of appUrlCandidates) {
    for (const livekitUrl of livekitUrlCandidates) {
      const variant = { ...env } as NodeJS.ProcessEnv;
      if (appUrl) {
        variant.NEXT_PUBLIC_APP_URL = appUrl;
        variant.APP_URL = appUrl;
      }
      if (livekitUrl) {
        variant.LIVEKIT_URL = livekitUrl;
      }
      fingerprints.add(buildVoiceAgentRuntimeFingerprint(variant));
    }
  }

  return Array.from(fingerprints);
}
