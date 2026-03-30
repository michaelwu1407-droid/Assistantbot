export type SupportedVoiceLlmProvider = "groq" | "deepinfra";

export type VoiceLlmRate = {
  provider: SupportedVoiceLlmProvider;
  model: string;
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  source: string;
  effectiveDate: string;
};

export type VoiceSttRate = {
  provider: "deepgram";
  model: string;
  usdPerMinute: number;
  source: string;
  effectiveDate: string;
};

export type VoiceTtsRate = {
  provider: "cartesia";
  model: string;
  usdPer1KCharacters: number;
  source: string;
  effectiveDate: string;
  estimateBasis: string;
};

export const VOICE_STT_RATE_CARD: VoiceSttRate = {
  provider: "deepgram",
  model: "nova-3",
  usdPerMinute: 0.0043,
  source: "Deepgram official pricing",
  effectiveDate: "2026-03-31",
};

export const VOICE_TTS_RATE_CARD: VoiceTtsRate = {
  provider: "cartesia",
  model: "sonic-3",
  usdPer1KCharacters: 0.029875,
  source: "Cartesia official pricing",
  effectiveDate: "2026-03-31",
  estimateBasis:
    "Estimated from Cartesia Scale plan pricing: $239 for 8,000,000 model credits, with 1 credit per character for Sonic 3.",
};

const VOICE_LLM_RATE_CARDS: VoiceLlmRate[] = [
  {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    inputUsdPer1M: 0.59,
    outputUsdPer1M: 0.79,
    source: "Groq official pricing",
    effectiveDate: "2026-03-31",
  },
  {
    provider: "deepinfra",
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    inputUsdPer1M: 0.02,
    outputUsdPer1M: 0.05,
    source: "DeepInfra official pricing",
    effectiveDate: "2026-03-31",
  },
];

export function getConfiguredVoiceLlmProvider(callType: string): SupportedVoiceLlmProvider {
  const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
  const configured = (
    isEarlymarkCall ? process.env.EARLYMARK_VOICE_LLM_PROVIDER : process.env.VOICE_LLM_PROVIDER
  )
    ?.trim()
    .toLowerCase();

  return configured === "deepinfra" ? "deepinfra" : "groq";
}

export function getConfiguredVoiceLlmModel(callType: string, provider: SupportedVoiceLlmProvider): string {
  const isEarlymarkCall = callType === "demo" || callType === "inbound_demo";
  const configured = isEarlymarkCall ? process.env.EARLYMARK_VOICE_LLM_MODEL : process.env.VOICE_LLM_MODEL;
  if (configured?.trim()) {
    return configured.trim();
  }

  return provider === "groq"
    ? "llama-3.3-70b-versatile"
    : "meta-llama/Meta-Llama-3.1-8B-Instruct";
}

export function getVoiceLlmRate(provider: SupportedVoiceLlmProvider, model: string) {
  return VOICE_LLM_RATE_CARDS.find((entry) => entry.provider === provider && entry.model === model) || null;
}
