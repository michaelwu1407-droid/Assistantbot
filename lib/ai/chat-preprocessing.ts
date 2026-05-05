/**
 * Chat Preprocessing — runs BEFORE the LLM to gather context and detect intent.
 *
 * Extracted from route.ts for testability and clarity. This module handles:
 * - Pre-classification (intent detection)
 * - Job extraction from natural language
 * - Agent context building (workspace config, pricing, rules)
 * - Memory fetch (Mem0 long-term memory)
 * - Entity pre-resolution (resolve mentioned names to CRM records)
 */

import { preClassify, type PreClassification } from "@/lib/ai/pre-classifier";
import { buildAgentContext, fetchMemoryContext } from "@/lib/ai/context";
import { extractAllJobsFromParagraph, parseJobWithAI, parseMultipleJobsWithAI, type JobOneLinerParsed } from "@/lib/ai/job-parser";
import { getCachedEntity, setCachedEntity } from "@/lib/ai/entity-cache";
import { nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";
import { runSearchContacts } from "@/actions/chat-actions";
import { runGetClientContext } from "@/actions/agent-tools";

export type PreprocessingResult = {
  classification: PreClassification;
  extractedJobs: JobOneLinerParsed[];
  agentContext: Awaited<ReturnType<typeof buildAgentContext>>;
  memoryContextStr: string;
  preprocessingMs: number;
  entityPreResolution: EntityPreResolution | null;
};

export type EntityPreResolution = {
  contactId: string;
  contactName: string;
  dealCount: number;
  confidence: number;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutHandle) clearTimeout(timeoutHandle);
  return result;
}

export function shouldAttemptStructuredJobExtraction(text: string, classification: PreClassification): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 15) return false;
  const lower = trimmed.toLowerCase();
  if (/^(next|confirm|cancel|ok|okay|yes|no|done|thanks|thank you|undo)\b/.test(lower)) return false;
  if (/^create a new job called .+? for .+? at .+? with (?:a quoted value of|value) \$?[\d,]+(?:\.\d+)?[.?!]*$/i.test(trimmed)) return false;
  if (/\b(task|reminder)\b/i.test(trimmed)) return false;
  if (classification.intent === "flow_control" || classification.intent === "contact_lookup" || classification.intent === "reporting" || classification.intent === "support") {
    return false;
  }
  if (/\b(move|moved|assign|assigned|unassign|update|updated|change|changed|edit|edited|rename|set|mark|marked|show|list|find|search|look up|lookup|who is|what is|status|note|reminder|invoice|email|text|message|call)\b/i.test(trimmed)) {
    return false;
  }
  const explicitCreationIntent =
    /\b(create|add|book|log)\b/i.test(trimmed) ||
    /\b(new job|new lead|inbound lead|lead from|customer called|customer texted|customer emailed|new enquiry)\b/i.test(trimmed);
  if (!explicitCreationIntent) return false;
  const enoughJobPayload =
    /\$\s*\d+/.test(trimmed) ||
    /\b\d{8,}\b/.test(trimmed) ||
    /@/.test(trimmed) ||
    /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(trimmed) ||
    /\b\d{1,2}\s?(am|pm)\b/i.test(trimmed) ||
    (trimmed.match(/,/g) ?? []).length >= 2;
  if (enoughJobPayload) return true;
  const likelyQuestion = /^(what|show|list|how|why|who|when|where)\b/i.test(lower) || trimmed.includes("?");
  if (likelyQuestion) return false;
  return false;
}

function shouldIncludeHistoricalPricing(text: string): boolean {
  return /\b(price|pricing|quote|quoted|cost|how much|rate|fee|invoice)\b/i.test(text) || /\$/.test(text);
}

function shouldFetchMemory(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^(next|confirm|cancel|ok|okay|yes|no|done|thanks|thank you|undo)\b/i.test(trimmed.toLowerCase())) return false;
  if (trimmed.split(/\s+/).length <= 2) return false;
  return true;
}

const NAME_PATTERN = /\b(?:for|about|from|to|with|contact|client|customer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/;

function extractMentionedName(text: string): string | null {
  const match = text.match(NAME_PATTERN);
  return match?.[1]?.trim() ?? null;
}

async function preResolveEntity(
  workspaceId: string,
  text: string,
  classification: PreClassification,
): Promise<EntityPreResolution | null> {
  if (classification.intent === "flow_control" || classification.intent === "general") {
    return null;
  }

  const name = extractMentionedName(text);
  if (!name) return null;

  const cached = getCachedEntity(workspaceId, name, "contact");
  if (cached && cached.confidence >= 0.9) {
    return {
      contactId: cached.id,
      contactName: cached.name,
      dealCount: (cached.data.dealCount as number) ?? 0,
      confidence: cached.confidence,
    };
  }

  try {
    const result = await withTimeout(
      runGetClientContext(workspaceId, { clientName: name }),
      500,
      null,
    );
    if (!result?.client) return null;

    const resolution: EntityPreResolution = {
      contactId: result.client.id,
      contactName: result.client.name,
      dealCount: result.recentJobs?.length ?? 0,
      confidence: 1.0,
    };

    setCachedEntity(workspaceId, {
      id: result.client.id,
      name: result.client.name,
      type: "contact",
      confidence: 1.0,
      data: { dealCount: resolution.dealCount },
    });

    return resolution;
  } catch {
    return null;
  }
}

/**
 * Run all preprocessing steps in parallel.
 */
export async function runPreprocessing(
  workspaceId: string,
  userId: string,
  content: string,
  lastMessageContent: string,
): Promise<PreprocessingResult> {
  const preprocessingStartedAt = nowMs();

  const classification = preClassify(content);
  const isFlowControl = classification.intent === "flow_control";

  const shouldRunStructuredExtraction = !isFlowControl && shouldAttemptStructuredJobExtraction(content, classification);
  const includeHistoricalPricing = !isFlowControl && shouldIncludeHistoricalPricing(content);
  const shouldGetMemoryContext = !isFlowControl && shouldFetchMemory(lastMessageContent);
  const shouldPreResolve = !isFlowControl && classification.confidence >= 0.65;

  const jobExtractionStart = nowMs();
  const agentContextStart = nowMs();
  const memoryFetchStart = nowMs();

  const [extractedJobs, agentContext, memoryContextStr, entityPreResolution] = await Promise.all([
    (shouldRunStructuredExtraction
      ? withTimeout(extractAllJobsFromParagraph(content), 1400, [])
      : Promise.resolve([])
    ).then(r => { recordLatencyMetric("chat.web.preprocessing.job_extraction_ms", nowMs() - jobExtractionStart); return r; }),

    buildAgentContext(workspaceId, userId, { includeHistoricalPricing, pricingAudience: "business" })
      .then(r => { recordLatencyMetric("chat.web.preprocessing.agent_context_ms", nowMs() - agentContextStart); return r; }),

    (shouldGetMemoryContext
      ? withTimeout(fetchMemoryContext(userId, lastMessageContent), 400, "")
      : Promise.resolve("")
    ).then(r => { recordLatencyMetric("chat.web.preprocessing.memory_fetch_ms", nowMs() - memoryFetchStart); return r; }),

    shouldPreResolve
      ? preResolveEntity(workspaceId, content, classification)
      : Promise.resolve(null),
  ]);

  const preprocessingMs = nowMs() - preprocessingStartedAt;

  return {
    classification,
    extractedJobs,
    agentContext,
    memoryContextStr,
    preprocessingMs,
    entityPreResolution,
  };
}
