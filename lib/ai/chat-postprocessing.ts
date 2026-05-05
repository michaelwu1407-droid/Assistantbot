/**
 * Chat Postprocessing — runs AFTER the LLM generates a response.
 *
 * Extracted from route.ts for testability and clarity. This module handles:
 * - Pricing validation (check for unsourced dollar amounts)
 * - Latency metrics recording
 * - Memory storage (Mem0 async fire-and-forget)
 */

import { validatePricingInResponse } from "@/lib/ai/response-validator";
import { addMem0Memory } from "@/lib/ai/context";
import { nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";
import { logger } from "@/lib/logging";

export type PostprocessingContext = {
  workspaceId: string;
  userId: string;
  lastMessageContent: string;
  requestStartedAt: number;
  preprocessingMs: number;
  llmStartedAt: number;
  toolCallsMs: number;
  ttftMs: number;
};

/**
 * Run all postprocessing after LLM generation completes.
 * Called from the streamText onFinish callback.
 */
export function runPostprocessing(
  ctx: PostprocessingContext,
  text: string,
  toolOutputsForValidation: unknown[],
): void {
  const llmPhaseMs = nowMs() - ctx.llmStartedAt;
  const modelMs = Math.max(0, llmPhaseMs - ctx.toolCallsMs);
  const totalMs = nowMs() - ctx.requestStartedAt;

  recordLatencyMetric("chat.web.preprocessing_ms", ctx.preprocessingMs);
  recordLatencyMetric("chat.web.tool_calls_ms", ctx.toolCallsMs);
  recordLatencyMetric("chat.web.model_ms", modelMs);
  recordLatencyMetric("chat.web.total_ms", totalMs);

  const validation = validatePricingInResponse(text, toolOutputsForValidation);
  if (!validation.valid) {
    console.warn(
      `[PricingValidator] Unsourced amounts detected in response: ${validation.unsourcedAmounts.join(", ")}. ` +
      `Sourced: ${validation.sourcedAmounts.join(", ")}. Mentioned: ${validation.mentionedAmounts.join(", ")}.`
    );
    recordLatencyMetric("chat.web.pricing_validation_fail", 1);
  }

  try {
    addMem0Memory({
      userId: ctx.userId,
      messages: [
        { role: "user", content: ctx.lastMessageContent },
        { role: "assistant", content: text },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        source: "chat",
        workspaceId: ctx.workspaceId,
      },
    }).catch((error: unknown) => {
      logger.error("Mem0 save interaction failed", { component: "chat-api", workspaceId: ctx.workspaceId, userId: ctx.userId }, error as Error);
    });
  } catch (error) {
    logger.error("Mem0 storage pipeline failed", { component: "chat-api", workspaceId: ctx.workspaceId, userId: ctx.userId }, error as Error);
  }
}
