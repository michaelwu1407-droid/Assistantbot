import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { buildAgentContext, fetchMemoryContext } from "@/lib/ai/context";
import { buildCrmChatSystemPrompt } from "@/lib/ai/prompt-contract";
import { getAgentTools } from "@/lib/ai/tools";
import { saveUserMessage } from "@/actions/chat-actions";
import { instrumentToolsWithLatency, nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

function shouldIncludeHistoricalPricing(text: string): boolean {
  return /\b(price|pricing|quote|quoted|cost|how much|rate|fee|invoice)\b/i.test(text) || /\$/.test(text);
}

function shouldFetchMemory(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.split(/\s+/).length <= 2) return false;
  if (/^(ok|okay|thanks|thank you|yes|no|done|next|confirm|cancel)\b/i.test(trimmed)) return false;
  return true;
}

function getAdaptiveMaxSteps(text: string): number {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return 2;
  if (trimmed.length < 80) return 3;
  if (/\b(and|then|also|plus)\b/.test(trimmed)) return 5;
  return 4;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutHandle) clearTimeout(timeoutHandle);
  return result;
}

function ensureHeadlessReply(text: string): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed;
  return "I processed that in Earlymark, but I don't have a text summary to send back yet.";
}

/**
 * Processes a command received from a user via the WhatsApp Assistant (Headless UI).
 *
 * @param userId - The ID of the authenticated Earlymark user.
 * @param message - The raw text message sent by the user.
 * @returns The text response to be sent back to the user via WhatsApp.
 */
export async function processAgentCommand(userId: string, message: string): Promise<string> {
  const requestStartedAt = nowMs();
  try {
    console.log("AI Agent processing:", message, "from user:", userId);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });

    if (!user || !user.workspaceId) {
      return "Error: Could not find your Earlymark workspace. Please contact support.";
    }

    const workspaceId = user.workspaceId;

    await saveUserMessage(workspaceId, message).catch(() => {});
    const preprocessingStartedAt = nowMs();

    const includeHistoricalPricing = shouldIncludeHistoricalPricing(message);
    const shouldGetMemory = shouldFetchMemory(message);

    const [agentContext, memoryContextStr] = await Promise.all([
      buildAgentContext(workspaceId, userId, { includeHistoricalPricing }),
      shouldGetMemory
        ? withTimeout(fetchMemoryContext(userId, message), 700, "")
        : Promise.resolve(""),
    ]);

    const {
      settings,
      userRole,
      knowledgeBaseStr,
      agentModeStr,
      workingHoursStr,
      agentScriptStr,
      allowedTimesStr,
      preferencesStr,
      pricingRulesStr,
      bouncerStr,
      attachmentsStr,
    } = agentContext;
    const preprocessingMs = nowMs() - preprocessingStartedAt;

    const systemPrompt = buildCrmChatSystemPrompt({
      userRole,
      customerContactPolicyBlock: [agentModeStr, allowedTimesStr].filter(Boolean).join("\n\n"),
      workspaceContextBlocks: [
        knowledgeBaseStr,
        workingHoursStr,
        agentScriptStr,
        preferencesStr,
        pricingRulesStr,
        bouncerStr,
        attachmentsStr,
        memoryContextStr,
      ],
      pricingIntegrityBlock: `- NEVER quote, calculate, or mention a dollar amount unless it comes from a tool result (pricingLookup, pricingCalculator, getFinancialReport, etc.).
- For ANY arithmetic involving money (totals, tax, discounts, multi-item quotes), you MUST call pricingCalculator. Never do math in your head.
- Before quoting any service price, you MUST call pricingLookup first to get the approved or historical price.
- If pricingLookup returns no match, say "A firm quote requires an on-site assessment." Do NOT estimate or guess.
- When reporting a price, cite where it came from: "Our approved rate for X is $Y" or "Similar jobs have been $X-$Y".`,
      messagingRuleBlock: `On "message/text/tell/send [name]" call sendSms immediately with no confirmation. Send the user's exact words. Confirm with: "Sent to [Name]: \\"[msg]\\"". Track pronouns from context.`,
      uncertaintyBlock: "Never return blank. If a tool fails, say what went wrong and suggest the next correction or retry.",
      roleGuardBlock: "OWNER and MANAGER users may confirm data changes through the existing confirmation flow. TEAM_MEMBER users cannot make restricted data changes and should be told to ask their manager.",
    });

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error("Missing Gemini API Key");
      return "Internal Error: AI service configuration is missing.";
    }

    const google = createGoogleGenerativeAI({ apiKey });

    let toolCallsMs = 0;
    const tools = instrumentToolsWithLatency(
      getAgentTools(workspaceId, settings, userId),
      (toolName, durationMs) => {
        toolCallsMs += durationMs;
        recordLatencyMetric(`chat.headless.tool.${toolName}_ms`, durationMs);
      },
    );
    const llmStartedAt = nowMs();
    const result = await generateText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: systemPrompt,
      prompt: message,
      tools,
      // @ts-expect-error Some AI SDK versions type this outside CallSettings
      maxSteps: getAdaptiveMaxSteps(message),
    });
    const llmPhaseMs = nowMs() - llmStartedAt;
    const modelMs = Math.max(0, llmPhaseMs - toolCallsMs);
    const totalMs = nowMs() - requestStartedAt;
    recordLatencyMetric("chat.headless.preprocessing_ms", preprocessingMs);
    recordLatencyMetric("chat.headless.tool_calls_ms", toolCallsMs);
    recordLatencyMetric("chat.headless.model_ms", modelMs);
    recordLatencyMetric("chat.headless.total_ms", totalMs);

    return ensureHeadlessReply(result.text);
  } catch (error) {
    console.error("Error in processAgentCommand:", error);
    return "I encountered an error trying to process your request. Please try again or contact support if the issue persists.";
  }
}
