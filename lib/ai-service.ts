import { generateObject } from "ai";
import type { ZodType } from "zod";
import { contextModel, logicModel } from "@/lib/ai-models";

type Tier = "context" | "logic";

const modelMap = {
  context: contextModel,
  logic: logicModel,
} as const;

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

  return generateObject({
    model,
    schema,
    prompt,
    ...(systemPrompt ? { system: systemPrompt } : {}),
  });
}
