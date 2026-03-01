import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// ---------------------------------------------------------------------------
// DeepInfra provider (OpenAI-compatible API)
// ---------------------------------------------------------------------------
const deepinfra = createOpenAI({
  baseURL: "https://api.deepinfra.com/v1/openai",
  apiKey: process.env.DEEPINFRA_API_KEY ?? "",
});

// ---------------------------------------------------------------------------
// Google Gemini provider
// ---------------------------------------------------------------------------
const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    "",
});

// ---------------------------------------------------------------------------
// Model Tiers
// ---------------------------------------------------------------------------

/**
 * Context Model — Google Gemini 2.0 Flash Lite
 *
 * Use for: Reading long transcripts, codebase analysis, and large PDF
 * processing. Handles 761k+ token context windows at ~$0.07/M tokens.
 */
export const contextModel = google("gemini-2.0-flash-lite-preview-02-05");

/**
 * Logic Model — DeepSeek V3 (via DeepInfra)
 *
 * Use for: Drafting emails, formatting CRM JSON, and complex business logic.
 * GPT-4o-class intelligence at ~$0.14/M tokens.
 */
export const logicModel = deepinfra("deepseek-ai/DeepSeek-V3");
