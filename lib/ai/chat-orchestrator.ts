/**
 * Chat Orchestrator — manages LLM streaming and tool execution.
 *
 * Extracted from route.ts for testability and clarity. This module handles:
 * - System prompt construction with compressed blocks
 * - Model message preparation and sanitisation
 * - LLM streaming via Gemini with tool calling
 * - Speculative tool execution for high-confidence intents
 * - Entity pre-resolution context injection
 */

import { streamText, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { buildCrmChatSystemPrompt } from "@/lib/ai/prompt-contract";
import { compressPromptBlocks, type PromptBlocks } from "@/lib/ai/prompt-compression";
import { getAgentToolsForIntent } from "@/lib/ai/tools";
import { instrumentToolsWithLatency, nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";
import { runPostprocessing, type PostprocessingContext } from "@/lib/ai/chat-postprocessing";
import type { PreClassification } from "@/lib/ai/pre-classifier";
import type { EntityPreResolution } from "@/lib/ai/chat-preprocessing";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";
const MAX_INPUT_TOKENS_ESTIMATE = 18_000;
const MAX_HISTORY_MESSAGES = 8;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value ?? ""); }
}

export function getAdaptiveMaxSteps(text: string): number {
  const trimmed = text.trim().toLowerCase();
  if (/^(next|confirm|cancel|ok|okay|yes|no|done|undo)\b/.test(trimmed)) return 2;
  if (trimmed.length < 80) return 3;
  if (/\b(and|then|also|plus)\b/.test(trimmed)) return 5;
  return 4;
}

type SelectionDeal = { id: string; title?: string };

export type OrchestratorInput = {
  workspaceId: string;
  userId: string;
  content: string;
  lastMessageContent: string;
  messages: unknown[];
  selectedDeals: SelectionDeal[];
  classification: PreClassification;
  entityPreResolution: EntityPreResolution | null;
  agentContext: {
    settings: unknown;
    userRole: string;
    knowledgeBaseStr: string;
    agentModeStr: string;
    workingHoursStr: string;
    agentScriptStr: string;
    allowedTimesStr: string;
    preferencesStr: string;
    pricingRulesStr: string;
    bouncerStr: string;
    attachmentsStr: string;
  };
  memoryContextStr: string;
  preprocessingMs: number;
  requestStartedAt: number;
};

function sanitizeModelMessages(messages: unknown[], content: string): unknown[] | null {
  let modelMessages: unknown[];
  try {
    modelMessages = messages;
    if (!Array.isArray(modelMessages) || !modelMessages.length) {
      modelMessages = content ? [{ role: "user", content }] : [];
    }
  } catch {
    modelMessages = content ? [{ role: "user", content }] : [];
  }
  if (!modelMessages?.length && content) modelMessages = [{ role: "user", content }];
  if (!modelMessages?.length) return null;

  const lastMsg = modelMessages[modelMessages.length - 1] as Record<string, unknown>;
  const isLastUser = lastMsg?.role === "user";
  const lastContent = lastMsg?.content;
  const hasParts = typeof lastContent === "string"
    ? (lastContent as string).trim().length > 0
    : Array.isArray(lastContent) && (lastContent as Array<Record<string, unknown>>).some((p) => p && typeof p === "object" && "text" in p && String(p.text).trim().length > 0);

  if (isLastUser && !hasParts && content?.trim()) {
    modelMessages = [...modelMessages.slice(0, -1), { role: "user", content }];
  } else if (isLastUser && !hasParts) {
    return null;
  }

  modelMessages = modelMessages.filter((msg: unknown) => {
    const m = msg as Record<string, unknown>;
    if (m.role === "system") return true;
    let msgHasText = false;
    if (typeof m.content === "string") {
      msgHasText = (m.content as string).trim().length > 0;
    } else if (Array.isArray(m.content)) {
      msgHasText = (m.content as Array<Record<string, unknown>>).some((p) => {
        if (!p || typeof p !== "object") return false;
        if ("text" in p && typeof p.text === "string" && (p.text as string).trim().length > 0) return true;
        if ("type" in p && (p.type === "tool-call" || p.type === "tool-result")) return true;
        return false;
      });
    }
    const msgHasTools = !!((m as Record<string, unknown[]>).toolInvocations?.length || (m as Record<string, unknown[]>).toolCalls?.length);
    return msgHasText || msgHasTools;
  });

  if (modelMessages.length > MAX_HISTORY_MESSAGES) {
    const systemMsgs = modelMessages.filter((m: unknown) => (m as Record<string, unknown>).role === "system");
    const nonSystemMsgs = modelMessages.filter((m: unknown) => (m as Record<string, unknown>).role !== "system");
    modelMessages = [...systemMsgs, ...nonSystemMsgs.slice(-MAX_HISTORY_MESSAGES)];
  }

  if (!modelMessages.length && content?.trim()) {
    modelMessages = [{ role: "user", content }];
  }
  if (!modelMessages.length) return null;

  return modelMessages;
}

const FULL_PROMPT_BLOCKS: PromptBlocks = {
  pricingIntegrityBlock: `- NEVER quote, calculate, or mention a dollar amount unless it comes from a tool result (pricingLookup, pricingCalculator, getFinancialReport, etc.).
- For ANY arithmetic involving money (totals, tax, discounts, multi-item quotes), you MUST call pricingCalculator. Never do math in your head.
- Before quoting any service price, you MUST call pricingLookup first to get the approved or historical price.
- If pricingLookup returns no match, say "I don't have an approved price in your glossary for this. For a firm quote, an on-site assessment is required (or add an approved glossary price so we can quote next time)." Do NOT estimate or guess.
- When reporting a price, cite where it came from: "Our approved rate for X is $Y" or "Similar jobs have been $X-$Y".`,
  messagingRuleBlock: `On "message/text/tell/send [name]" call sendSms immediately with no confirmation. Send the user's exact words and never rewrite or refuse them. Track pronouns from context. Confirm with: "Sent to [Name]: \\"[msg]\\"". Follow any SYSTEM_CONTEXT_SIGNAL from tool output.`,
  uncertaintyBlock: "Never return blank. Ask to clarify if unclear. List options if ambiguous. Request missing info. If a tool fails, explain and suggest retry. If no data exists, say what you checked. For getTodaySummary, lead with preparation alerts before the schedule.",
  roleGuardBlock: `Data changes: OWNER and MANAGER users confirm via showConfirmationCard, then recordManualRevenue after the user says "confirm", "ok", or "yes". TEAM_MEMBER users cannot change restricted data and should be told to ask their manager.`,
  multiJobBlock: `Always use showJobDraftForConfirmation instead of plain text. Handle one job at a time. Do not call createJobNatural until the user confirms.`,
  jobDraftBlock: `When showJobDraftForConfirmation is used, the card itself is the full draft summary. Do not repeat the draft details, call-out fee, address, phone, or a second confirmation line underneath it. If needed, add only a very short instruction like "Use the card to confirm or edit."`,
};

export function createEmptyFallbackResponse(id: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: "I didn't quite catch that. Could you please provide more details?" });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/**
 * Run the LLM orchestration: build prompt, stream response, run postprocessing.
 */
export async function runOrchestration(input: OrchestratorInput): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const google = createGoogleGenerativeAI({ apiKey });

  let convertedMessages: unknown[];
  try {
    const converted = await convertToModelMessages(input.messages as Parameters<typeof convertToModelMessages>[0]);
    convertedMessages = Array.isArray(converted) ? converted : [];
  } catch {
    convertedMessages = input.content ? [{ role: "user", content: input.content }] : [];
  }

  const modelMessages = sanitizeModelMessages(convertedMessages, input.content);
  if (!modelMessages) {
    return createEmptyFallbackResponse("empty-fallback");
  }

  const { classification, agentContext, memoryContextStr, entityPreResolution } = input;

  const intentHintsStr = classification.contextHints.length > 0
    ? `\n\n[[INTENT HINTS for this turn]]\n${classification.contextHints.join("\n")}\n[[END INTENT HINTS]]`
    : "";

  const entityContextStr = entityPreResolution
    ? `\n\n[[PRE-RESOLVED ENTITY]]\nContact: ${entityPreResolution.contactName} (ID: ${entityPreResolution.contactId}, ${entityPreResolution.dealCount} active job${entityPreResolution.dealCount !== 1 ? "s" : ""})\n[[END PRE-RESOLVED ENTITY]]`
    : "";

  let toolCallsMs = 0;
  const toolOutputsForValidation: unknown[] = [];

  const selectionContextStr = input.selectedDeals.length
    ? `CURRENT CRM SELECTION:\n${input.selectedDeals
      .map((deal, index) => `${index + 1}. ${deal.title ? `${deal.title} ` : ""}[${deal.id}]`)
      .join("\n")}\nWhen the user says "these", "selected", or "current selection", use these deal IDs for bulk tools. Do not assume this selection if the user is referring to some other set.`
    : "";

  const tools = instrumentToolsWithLatency(
    getAgentToolsForIntent(input.workspaceId, agentContext.settings as Parameters<typeof getAgentToolsForIntent>[1], input.userId, classification),
    (toolName, durationMs) => {
      toolCallsMs += durationMs;
      recordLatencyMetric(`chat.web.tool.${toolName}_ms`, durationMs);
    },
  );

  const workspaceContextBlocks = [
    agentContext.knowledgeBaseStr,
    agentContext.workingHoursStr,
    agentContext.agentScriptStr,
    agentContext.preferencesStr,
    agentContext.pricingRulesStr,
    agentContext.bouncerStr,
    agentContext.attachmentsStr,
    memoryContextStr,
    selectionContextStr,
    intentHintsStr,
    entityContextStr,
  ];

  const compressed = compressPromptBlocks(FULL_PROMPT_BLOCKS, classification.intent, classification.confidence);

  let systemPrompt = buildCrmChatSystemPrompt({
    userRole: agentContext.userRole,
    customerContactPolicyBlock: [agentContext.agentModeStr, agentContext.allowedTimesStr].filter(Boolean).join("\n\n"),
    workspaceContextBlocks,
    pricingIntegrityBlock: compressed.pricingIntegrityBlock || null,
    messagingRuleBlock: compressed.messagingRuleBlock || null,
    uncertaintyBlock: compressed.uncertaintyBlock || null,
    roleGuardBlock: compressed.roleGuardBlock || null,
    multiJobBlock: compressed.multiJobBlock || null,
    jobDraftBlock: compressed.jobDraftBlock || null,
  });

  const messagesTokenEstimate = estimateTokens(toText(modelMessages));
  let totalInputTokenEstimate = estimateTokens(systemPrompt) + messagesTokenEstimate;

  if (totalInputTokenEstimate > MAX_INPUT_TOKENS_ESTIMATE && memoryContextStr) {
    const reducedBlocks = workspaceContextBlocks.filter((b) => b !== memoryContextStr);
    systemPrompt = buildCrmChatSystemPrompt({
      userRole: agentContext.userRole,
      customerContactPolicyBlock: [agentContext.agentModeStr, agentContext.allowedTimesStr].filter(Boolean).join("\n\n"),
      workspaceContextBlocks: reducedBlocks,
      pricingIntegrityBlock: compressed.pricingIntegrityBlock || null,
      messagingRuleBlock: compressed.messagingRuleBlock || null,
      uncertaintyBlock: compressed.uncertaintyBlock || null,
      roleGuardBlock: compressed.roleGuardBlock || null,
      multiJobBlock: compressed.multiJobBlock || null,
      jobDraftBlock: compressed.jobDraftBlock || null,
    });
    totalInputTokenEstimate = estimateTokens(systemPrompt) + messagesTokenEstimate;
  }

  if (totalInputTokenEstimate > MAX_INPUT_TOKENS_ESTIMATE) {
    return new Response(
      JSON.stringify({ error: "This request is too large right now. Please send a shorter message or split it into steps." }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  const llmStartedAt = nowMs();
  let ttftRecorded = false;
  let ttftMs = 0;

  const streamMessages = modelMessages as unknown as ModelMessage[];

  const result = streamText({
    model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
    maxOutputTokens: 512,
    system: systemPrompt,
    messages: streamMessages,
    tools,
    stopWhen: stepCountIs(getAdaptiveMaxSteps(input.content)),
    onChunk: ({ chunk }) => {
      if (!ttftRecorded && chunk.type === "text-delta") {
        ttftRecorded = true;
        ttftMs = nowMs() - llmStartedAt;
        recordLatencyMetric("chat.web.ttft_ms", ttftMs);
      }
    },
    onStepFinish: ({ toolResults }) => {
      if (toolResults) {
        for (const tr of toolResults) {
          if ("output" in tr && typeof (tr as Record<string, unknown>).output !== "undefined") {
            toolOutputsForValidation.push((tr as Record<string, unknown>).output);
            continue;
          }
          if ("result" in tr && typeof (tr as Record<string, unknown>).result !== "undefined") {
            toolOutputsForValidation.push((tr as Record<string, unknown>).result);
          }
        }
      }
    },
    onFinish: async ({ text: responseText }) => {
      const postCtx: PostprocessingContext = {
        workspaceId: input.workspaceId,
        userId: input.userId,
        lastMessageContent: input.lastMessageContent,
        requestStartedAt: input.requestStartedAt,
        preprocessingMs: input.preprocessingMs,
        llmStartedAt,
        toolCallsMs,
        ttftMs,
      };
      runPostprocessing(postCtx, responseText, toolOutputsForValidation);
    },
  });

  const response = result.toUIMessageStreamResponse();
  response.headers.set(
    "Server-Timing",
    `preprocessing;dur=${input.preprocessingMs}, ttft;dur=${ttftMs}, llm_startup;dur=${nowMs() - llmStartedAt}, tool_calls;dur=${toolCallsMs}`,
  );
  return response;
}
