import { generateObject } from "ai";
import type { ZodType } from "zod";
import { contextModel, logicModel } from "@/lib/ai-models";
import { withCostCeiling, type CostProvider } from "@/lib/cost-ceiling";

type Tier = "context" | "logic";

const modelMap = {
  context: contextModel,
  logic: logicModel,
} as const;

// Approximate cost per request. Overestimate slightly so the cap kicks in early
// rather than late — these wrappers protect against runaway loops, not for
// per-token billing accuracy.
const COST_PER_REQUEST_USD: Record<Tier, number> = {
  context: 0.005,
  logic: 0.01,
};

const PROVIDER_BY_TIER: Record<Tier, CostProvider> = {
  context: "gemini",
  logic: "deepinfra",
};

const LOGIC_SYSTEM_PROMPT =
  "You are a JSON-only API. Do not explain your reasoning. Output ONLY valid JSON.";

/**
 * Runs a dashboard AI task using the tiered model strategy.
 *
 * - `tier: 'context'` → Gemini (long-context, large input)
 * - `tier: 'logic'`   → DeepSeek V3 (structured output, business logic)
 *
 * When `tier === 'logic'`, a JSON-only system prompt is automatically
 * prepended to prevent DeepSeek's tendency to be chatty.
 */
export async function runDashboardTask<T>({
  tier,
  prompt,
  schema,
  system,
}: {
  tier: Tier;
  prompt: string;
  schema: ZodType<T>;
  system?: string;
}) {
  const model = modelMap[tier];

  // DeepSeek needs a firm JSON-only instruction to avoid chattiness
  const systemPrompt =
    tier === "logic"
      ? system
        ? `${LOGIC_SYSTEM_PROMPT}\n\n${system}`
        : LOGIC_SYSTEM_PROMPT
      : system;

  return withCostCeiling(PROVIDER_BY_TIER[tier], COST_PER_REQUEST_USD[tier], async () =>
    generateObject({
      model,
      schema,
      prompt,
      ...(systemPrompt ? { system: systemPrompt } : {}),
    }),
  );
}
