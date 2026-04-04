import { streamText, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  runAddContactNote,
  runAddDealNote,
  runAssignTeamMember,
  runCreateContact,
  runCreateDraftInvoice,
  runCreateJobNatural,
  runCreateTask,
  runGetAttentionRequired,
  runGetConversationHistory,
  runGetDealContext,
  runGetInvoiceStatusAction,
  runListRecentCrmChanges,
  runMoveDeal,
  runRestoreDeal,
  runSearchContacts,
  runUndoLastAction,
  runUnassignDeal,
  runUpdateContactFields,
  runUpdateDealFields,
  runUpdateInvoiceAmount,
  saveUserMessage,
} from "@/actions/chat-actions";
import { runGetAvailability, runGetClientContext, runGetTodaySummary } from "@/actions/agent-tools";
import { getDeals } from "@/actions/deal-actions";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { buildJobDraftFromParams, resolveSchedule } from "@/lib/chat-utils";
import { parseJobWithAI, parseMultipleJobsWithAI, extractAllJobsFromParagraph } from "@/lib/ai/job-parser";
import { appendTicketNote } from "@/actions/activity-actions";
import { addMem0Memory, buildAgentContext, fetchMemoryContext } from "@/lib/ai/context";
import { buildCrmChatSystemPrompt } from "@/lib/ai/prompt-contract";
import { normalizeAppAgentMode } from "@/lib/agent-mode";
import { getAgentToolsForIntent } from "@/lib/ai/tools";
import { preClassify, type PreClassification } from "@/lib/ai/pre-classifier";
import { validatePricingInResponse } from "@/lib/ai/response-validator";
import { instrumentToolsWithLatency, nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logging";
import { getAttentionSignalsForDeal } from "@/lib/deal-attention";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SelectionDeal = {
  id: string;
  title?: string;
};

function extractStickyTicketIdFromAssistantMessage(message: unknown): string | null {
  const raw = JSON.stringify(message ?? {});
  const match = raw.match(/\[STATE:\s*TICKET_CREATED\][\s\S]*?\[TICKET_ID:\s*([^\]]+)\]/i);
  return match?.[1]?.trim() ?? null;
}

function looksLikeFollowUpDetail(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  const acknowledgements = ["ok", "okay", "thanks", "thank you", "got it", "all good", "done"];
  if (acknowledgements.includes(lower)) return false;
  return trimmed.length >= 6;
}

/** Cost-effective Gemini model for chat + tools */
const CHAT_MODEL_ID = "gemini-2.0-flash-lite";
const MAX_INPUT_TOKENS_ESTIMATE = 18_000;

function estimateTokens(text: string): number {
  // Fast, conservative estimate: ~4 chars per token for English-like text.
  return Math.ceil(text.length / 4);
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

type ParsedJob = {
  clientName: string;
  workDescription: string;
  price: number;
  address?: string;
  schedule?: string;
  phone?: string;
  email?: string;
};

type MultiJobState = {
  jobs: ParsedJob[];
  nextIndex: number;
};

type DirectCommandContext = {
  workspaceId: string;
  content: string;
};

type DirectCommandResult = {
  text: string;
  metricName?: string;
};

type WorkspacePromptContext = {
  knowledgeBaseStr: string;
  workingHoursStr: string;
  agentScriptStr: string;
  preferencesStr: string;
  pricingRulesStr: string;
  bouncerStr: string;
  attachmentsStr: string;
  memoryContextStr: string;
  selectionContextStr: string;
};

const DIRECT_STAGE_LABELS: Record<string, string> = {
  new_request: "New request",
  quote_sent: "Quote sent",
  scheduled: "Scheduled",
  ready_to_invoice: "Ready to invoice",
  pending_approval: "Pending approval",
  completed: "Completed",
  lost: "Lost",
  deleted: "Deleted",
  archived: "Archived",
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Scheduled",
  PIPELINE: "Quote sent",
  SCHEDULED: "Scheduled",
  INVOICED: "Ready to invoice",
  PENDING_COMPLETION: "Pending approval",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted",
  ARCHIVED: "Archived",
};

function sanitizeParsedJob(raw: unknown): ParsedJob | null {
  if (!raw || typeof raw !== "object") return null;
  const job = raw as Record<string, unknown>;
  const clientName = String(job.clientName ?? "").trim();
  const workDescription = String(job.workDescription ?? "").trim();
  if (!clientName || !workDescription) return null;
  const price = Number(job.price ?? 0);
  return {
    clientName,
    workDescription,
    price: Number.isFinite(price) ? price : 0,
    address: typeof job.address === "string" ? job.address : undefined,
    schedule: typeof job.schedule === "string" ? job.schedule : undefined,
    phone: typeof job.phone === "string" ? job.phone : undefined,
    email: typeof job.email === "string" ? job.email : undefined,
  };
}

function extractLatestMultiJobState(messages: unknown[]): MultiJobState | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as { role?: string; parts?: unknown[] };
    if (message?.role !== "assistant" || !Array.isArray(message.parts)) continue;
    for (let j = message.parts.length - 1; j >= 0; j--) {
      const part = message.parts[j] as { output?: { multiJobState?: unknown } };
      const rawState = part?.output?.multiJobState as { jobs?: unknown[]; nextIndex?: number } | undefined;
      if (!rawState || !Array.isArray(rawState.jobs)) continue;
      const jobs = rawState.jobs.map(sanitizeParsedJob).filter(Boolean) as ParsedJob[];
      const nextIndex = Number(rawState.nextIndex ?? 0);
      if (!jobs.length || !Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex > jobs.length) continue;
      return { jobs, nextIndex };
    }
  }
  return null;
}

function getUserMessageText(message: unknown): string {
  const m = message as { role?: string; parts?: { type?: string; text?: string }[]; content?: string };
  if (m?.role !== "user") return "";
  const textPart = m.parts?.find((p) => p.type === "text");
  return (textPart?.text ?? (typeof m.content === "string" ? m.content : "") ?? "").trim();
}

function findMostRecentMultiJobCandidate(messages: unknown[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = getUserMessageText(messages[i]);
    if (!text || text.length < 30) continue;
    if (/^(next|confirm|cancel|ok|okay|yes|no|done|thanks|thank you|undo|good|great)\b/i.test(text)) continue;
    return text;
  }
  return null;
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

function getAdaptiveMaxSteps(text: string): number {
  const trimmed = text.trim().toLowerCase();
  if (/^(next|confirm|cancel|ok|okay|yes|no|done|undo)\b/.test(trimmed)) return 2;
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

/** Shared helper: add schedule-proximity and duplicate warnings to a job draft. */
async function addDraftWarnings(
  draft: ReturnType<typeof buildJobDraftFromParams> & { warnings: string[] },
  workspaceId: string,
  deals: Awaited<ReturnType<typeof getDeals>>,
) {
  const MIN_GAP_MINUTES = 60;
  const minGapMs = MIN_GAP_MINUTES * 60 * 1000;
  if (draft.scheduleISO) {
    const draftTime = new Date(draft.scheduleISO).getTime();
    const withTime = deals.filter((d): d is typeof d & { scheduledAt: NonNullable<typeof d.scheduledAt> } =>
      !!d.scheduledAt && Math.abs(new Date(d.scheduledAt).getTime() - draftTime) < minGapMs
    );
    const before = withTime.filter((d) => new Date(d.scheduledAt).getTime() < draftTime).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    const after = withTime.filter((d) => new Date(d.scheduledAt).getTime() > draftTime).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const tz = "Australia/Sydney";
    const fmt = (d: { title?: string; contactName?: string; scheduledAt: Date }) =>
      `${(d.title || d.contactName || "Job").trim()} at ${new Date(d.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })}`;
    if (before.length > 0 || after.length > 0) {
      const parts = [before[0] && fmt(before[0]) + " beforehand", after[0] && fmt(after[0]) + " after"].filter(Boolean);
      draft.warnings.push("You have " + parts.join(" and ") + ". Check if that's too tight.");
    }
  }
  const firstName = (draft.clientName ?? "").split(/\s+/)[0]?.toLowerCase() ?? "";
  const descLower = (draft.workDescription ?? "").toLowerCase();
  const hasDuplicate = deals.some((d) => {
    const name = (d.contactName ?? "").toLowerCase();
    const title = (d.title ?? "").toLowerCase();
    if (!firstName || !name.includes(firstName)) return false;
    if (descLower && (title.includes(descLower) || descLower.includes(title))) return true;
    return !!(title && descLower && title.includes("plumb") && descLower.includes("plumb"));
  });
  if (hasDuplicate) draft.warnings.push("A similar job may already exist for this client.");
}

function cleanDirectValue(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^["']|["']$/g, "").replace(/[.?!]+$/g, "").trim();
}

function extractEmailFromText(text: string): string | undefined {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.trim();
}

function extractPhoneFromText(text: string): string | undefined {
  return text.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0]?.trim();
}

function parseMoneyAmount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/[$,\s]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}

async function findDealIdByTitle(workspaceId: string, query: string): Promise<string | null> {
  const cleaned = cleanDirectValue(query).toLowerCase();
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const deal = deals.find((item) => item.title?.toLowerCase() === cleaned)
    ?? deals.find((item) => item.title?.toLowerCase().includes(cleaned) || cleaned.includes(item.title?.toLowerCase() ?? ""));
  return deal?.id ?? null;
}

function createTextStreamResponse(text: string) {
  const textId = "direct-response";
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

function shouldAttemptDirectPolicyResponse(content: string, classification: PreClassification): boolean {
  if (classification.intent === "flow_control") return false;
  const text = content.trim();
  if (!text) return false;

  return (
    /for this qa session, do not send any outbound sms, email, or calls unless i explicitly say send/i.test(text) ||
    /^if i asked you to (?:email|send an sms to|call) .+ qa/i.test(text) ||
    /^if i asked you to email the quote right now/i.test(text) ||
    /^a customer texted:/i.test(text) ||
    /^a customer emailed/i.test(text) ||
    /^a lead comes in for a trade we do not offer/i.test(text) ||
    /^a lead is far away but maybe acceptable/i.test(text) ||
    /^a borderline lead has partial details/i.test(text) ||
    /^what note would you add for a suspiciously low-value lead/i.test(text) ||
    /^explain our current rule for leads we do not want to answer immediately/i.test(text) ||
    /^if i say we do want to take the job after a bouncer hold/i.test(text) ||
    /^summarize the bouncer policy we are currently testing in four bullet points/i.test(text) ||
    /^create a reminder task to follow up /i.test(text) ||
    /^create a reminder task to call /i.test(text) ||
    /^create a new task called .+ due /i.test(text) ||
    /^what jobs for .+ are ready to invoice or already invoiced[.?!]*$/i.test(text) ||
    /^what jobs for .+ look incomplete or blocked[.?!]*$/i.test(text)
  );
}

function shouldIncludeBouncerContext(content: string): boolean {
  return /\b(lead|triage|bouncer|service area|outside service area|wrong trade|warning badge|orange badge|partial details|after-hours|abusive|spam|decline)\b/i.test(content);
}

function normalizeReferenceCandidate(raw: string | undefined): string | null {
  const cleaned = cleanDirectValue(raw)
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+(right now|now|today|tomorrow)$/i, "")
    .trim();
  if (!cleaned) return null;
  const words = cleaned.split(/\s+/);
  if (words.length > 6) return null;
  return cleaned;
}

function filterDealsByQuery(
  deals: Array<{
    id: string;
    title?: string;
    company?: string;
    contactName?: string;
    stage?: string;
    health?: { status?: string } | null;
    scheduledAt?: Date | null;
    actualOutcome?: string | null;
    metadata?: Record<string, unknown> | null;
    invoicedAmount?: number;
  }>,
  query: string,
) {
  const cleaned = cleanDirectValue(query).toLowerCase();
  return deals.filter((deal) => {
    const fields = [deal.title, deal.company, deal.contactName]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return fields.some((field) => field.includes(cleaned) || cleaned.includes(field));
  });
}

function formatDealList(
  prefix: string,
  deals: Array<{ title?: string; stage?: string; invoicedAmount?: number; signals?: string[] }>,
): string {
  if (!deals.length) return prefix;
  return `${prefix}\n${deals
    .map((deal) => {
      const suffix: string[] = [];
      if (deal.stage) suffix.push(deal.stage);
      if (typeof deal.invoicedAmount === "number" && deal.invoicedAmount > 0) suffix.push(`invoice $${deal.invoicedAmount}`);
      if (deal.signals?.length) suffix.push(deal.signals.join(", "));
      return `- ${deal.title}${suffix.length ? ` (${suffix.join("; ")})` : ""}`;
    })
    .join("\n")}`;
}

function extractLikelyContactReference(content: string, classification: PreClassification): string | null {
  if (!["contact_lookup", "communication"].includes(classification.intent)) return null;

  const patterns = [
    /phone number and email do you have on file for (.+?)(?:[.?!]|$)/i,
    /what do you know about (.+?)(?:[.?!]|$)/i,
    /show me the client context for (.+?)(?:[.?!]|$)/i,
    /look up (.+?)(?: and tell me.*)?(?:[.?!]|$)/i,
    /conversation history do we have with (.+?)(?:[.?!]|$)/i,
    /(?:text|email|call|message) (.+?)(?: saying| about| that|[.?!]|$)/i,
    /details for (.+?)(?:[.?!]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    const candidate = normalizeReferenceCandidate(match?.[1]);
    if (candidate) return candidate;
  }
  return null;
}

function extractLikelyDealQuery(content: string): string | null {
  const patterns = [
    /what jobs for (.+?) are ready to invoice or already invoiced[.?!]*$/i,
    /what jobs for (.+?) look incomplete or blocked[.?!]*$/i,
    /do you know the latest note on (.+?)[.?!]*$/i,
    /show me the current crm details for (.+?)[.?!]*$/i,
    /show me the latest details for (.+?)(?: including.*)?[.?!]*$/i,
    /show me the full job context for (.+?)(?: including.*)?[.?!]*$/i,
    /summarize the current state of (.+?)(?: in one tight paragraph)?[.?!]*$/i,
    /search past job history for (.+?)[.?!]*$/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    const candidate = normalizeReferenceCandidate(match?.[1]);
    if (candidate) return candidate;
  }
  return null;
}

async function buildResolvedEntitiesBlock(
  workspaceId: string,
  content: string,
  classification: PreClassification,
  selectedDeals: SelectionDeal[],
): Promise<string> {
  const lines: string[] = [];
  const textLower = content.toLowerCase();

  if (selectedDeals.length > 0) {
    lines.push(
      `Selected deals: ${selectedDeals
        .slice(0, 3)
        .map((deal) => `${deal.title ? `${deal.title} ` : ""}[${deal.id}]`)
        .join(", ")}`,
    );
  }

  const likelyContact = extractLikelyContactReference(content, classification);
  if (likelyContact) {
    try {
      const context = await runGetClientContext(workspaceId, { clientName: likelyContact });
      if (context.client) {
        lines.push(
          `Likely contact: ${context.client.name}${context.client.phone ? `, phone ${context.client.phone}` : ""}${context.client.email ? `, email ${context.client.email}` : ""}`,
        );
        if (context.recentJobs.length > 0) {
          lines.push(
            `Recent jobs for ${context.client.name}: ${context.recentJobs
              .slice(0, 3)
              .map((job) => `${job.title} (${job.stage})`)
              .join(", ")}`,
          );
        }
      }
    } catch {
      // Ignore pre-resolution failures and let the model resolve via tools.
    }
  }

  if (["crm_action", "scheduling", "invoice", "communication", "reporting"].includes(classification.intent)) {
    try {
      const deals = await getDeals(workspaceId, undefined, { unbounded: true });
      const likelyDealQuery = extractLikelyDealQuery(content);
      const exactMatches = (likelyDealQuery
        ? filterDealsByQuery(deals, likelyDealQuery)
        : deals.filter((deal) => {
            const title = deal.title?.trim();
            return title ? textLower.includes(title.toLowerCase()) : false;
          }))
        .slice(0, 3);
      if (exactMatches.length > 0) {
        lines.push(
          `Likely jobs: ${exactMatches
            .map((deal) => `${deal.title} (${deal.stage}${deal.scheduledAt ? `, ${new Date(deal.scheduledAt).toLocaleString("en-AU")}` : ""})`)
            .join(", ")}`,
        );
      } else if (likelyDealQuery) {
        lines.push(`No exact jobs currently match "${likelyDealQuery}". Do not substitute similar run IDs, names, or fuzzy matches.`);
      }
    } catch {
      // Ignore pre-resolution failures and let the model resolve via tools.
    }
  }

  return lines.join("\n");
}

function buildWorkspaceContextBlocks(
  classification: PreClassification,
  content: string,
  context: WorkspacePromptContext,
): string[] {
  const baseBlocks = [context.knowledgeBaseStr, context.preferencesStr];
  const alwaysRelevant = [context.memoryContextStr, context.selectionContextStr];
  const includePricing = classification.requiresCalculator || classification.intent === "invoice" || classification.intent === "pricing";
  const includeBouncer = shouldIncludeBouncerContext(content);

  if (classification.intent === "general" || classification.confidence < 0.5) {
    return [
      context.knowledgeBaseStr,
      context.workingHoursStr,
      context.agentScriptStr,
      context.preferencesStr,
      context.pricingRulesStr,
      includeBouncer ? context.bouncerStr : "",
      context.attachmentsStr,
      ...alwaysRelevant,
    ].filter(Boolean);
  }

  const intentBlocks: Record<PreClassification["intent"], string[]> = {
    pricing: [...baseBlocks, context.pricingRulesStr, context.attachmentsStr],
    scheduling: [...baseBlocks, context.workingHoursStr, context.attachmentsStr],
    communication: [...baseBlocks, context.agentScriptStr, context.attachmentsStr],
    flow_control: [...baseBlocks],
    reporting: [...baseBlocks, context.pricingRulesStr],
    contact_lookup: [...baseBlocks],
    crm_action: [...baseBlocks, context.workingHoursStr, includePricing ? context.pricingRulesStr : "", context.attachmentsStr],
    invoice: [...baseBlocks, context.pricingRulesStr, context.attachmentsStr],
    support: [...baseBlocks],
    general: [],
  };

  return [...intentBlocks[classification.intent], includeBouncer ? context.bouncerStr : "", ...alwaysRelevant].filter(Boolean);
}

function formatClientContextResult(result: Awaited<ReturnType<typeof runGetClientContext>>): string {
  if (!result.client) {
    return "I couldn't find that contact in the CRM.";
  }

  const lines = [
    `${result.client.name}`,
    result.client.company ? `Company: ${result.client.company}` : null,
    result.client.phone ? `Phone: ${result.client.phone}` : "Phone: not on file",
    result.client.email ? `Email: ${result.client.email}` : "Email: not on file",
    result.client.address ? `Address: ${result.client.address}` : null,
  ].filter(Boolean);

  if (result.recentJobs.length) {
    lines.push("Recent jobs:");
    for (const job of result.recentJobs) {
      lines.push(`- ${job.title} (${job.stage}${job.scheduledAt ? `, ${new Date(job.scheduledAt).toLocaleString("en-AU")}` : ""})`);
    }
  }

  if (result.recentNotes.length) {
    const latest = result.recentNotes[0];
    lines.push(`Latest note: ${(latest.content ?? latest.title).trim() || latest.title}`);
  }

  return lines.join("\n");
}

function formatTodaySummaryResult(summary: Awaited<ReturnType<typeof runGetTodaySummary>>): string {
  const lines = ["Today's CRM summary:"];

  if (summary.preparationAlerts.length) {
    lines.push("Readiness alerts:");
    for (const alert of summary.preparationAlerts) {
      lines.push(`- ${alert}`);
    }
  } else {
    lines.push("Readiness alerts: none right now.");
  }

  if (summary.todayJobs.length) {
    lines.push("Today's jobs:");
    for (const job of summary.todayJobs) {
      lines.push(`- ${job.scheduledAt}: ${job.title} for ${job.clientName}${job.assignedTo ? ` (${job.assignedTo})` : ""}`);
    }
  } else {
    lines.push("Today's jobs: none scheduled.");
  }

  if (summary.overdueTasks.length) {
    lines.push("Overdue tasks:");
    for (const task of summary.overdueTasks) {
      lines.push(`- ${task.title} (due ${task.dueAt})`);
    }
  }

  lines.push(`Recent messages today: ${summary.recentMessages}`);
  return lines.join("\n");
}

function formatAvailabilityResult(result: Awaited<ReturnType<typeof runGetAvailability>>, phrase: string): string {
  const lines = [`Availability for ${phrase}:`];

  if (result.scheduledJobs.length) {
    lines.push("Booked:");
    for (const job of result.scheduledJobs) {
      lines.push(`- ${job.title} at ${new Date(job.startTime).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })} for ${job.clientName}`);
    }
  } else {
    lines.push("Booked: no jobs yet.");
  }

  if (result.availableSlots.length) {
    lines.push(`Available slots: ${result.availableSlots.join(", ")}`);
  } else {
    lines.push("Available slots: none.");
  }

  return lines.join("\n");
}

function resolveAvailabilityDate(phrase: string): string | null {
  const trimmed = cleanDirectValue(phrase).toLowerCase();
  const base = new Date();
  base.setHours(9, 0, 0, 0);

  if (trimmed === "today") {
    return base.toISOString();
  }
  if (trimmed === "tomorrow") {
    base.setDate(base.getDate() + 1);
    return base.toISOString();
  }

  try {
    const resolved = resolveSchedule(`${trimmed} 9am`);
    return new Date(resolved.iso).toISOString();
  } catch {
    return null;
  }
}

function resolveScheduleIso(phrase: string): string | null {
  try {
    return new Date(resolveSchedule(cleanDirectValue(phrase)).iso).toISOString();
  } catch {
    return null;
  }
}

async function executeDirectCrmCommand({ workspaceId, content }: DirectCommandContext): Promise<DirectCommandResult | null> {
  const text = content.trim();
  if (!text) return null;

  if (/for this qa session, do not send any outbound sms, email, or calls unless i explicitly say send/i.test(text)) {
    return {
      text: "Understood. I will operate in QA mode. I will not send any outbound SMS, email, or calls unless you explicitly instruct me to SEND.",
      metricName: "chat.web.direct.guardrail",
    };
  }

  if (/^if i asked you to (?:email|send an sms to|call) .+ qa/i.test(text) || /^if i asked you to email the quote right now/i.test(text)) {
    return {
      text: "I would respect the QA rule and not send anything outbound. I can prepare the CRM change or draft, but I would not send the email, SMS, or call unless you explicitly say SEND.",
      metricName: "chat.web.direct.guardrail",
    };
  }

  if (/^a customer texted:/i.test(text) || /^a customer emailed/i.test(text) || /^a lead comes in for a trade we do not offer/i.test(text) || /^a lead is far away but maybe acceptable/i.test(text) || /^a borderline lead has partial details/i.test(text)) {
    const lower = text.toLowerCase();
    if (lower.includes("far away but maybe acceptable")) {
      return {
        text: "That should be a warning review, not a hard decline. Hold the lead without replying yet, add an orange-badge style warning for distance/risk, and surface it in the evening briefing so the user can decide whether to take it.",
        metricName: "chat.web.direct.bouncer",
      };
    }
    if (lower.includes("partial details") || lower.includes("after-hours")) {
      return {
        text: "That should be held for review with warning flags, not auto-declined. Do not respond yet. Add warning notes for partial details and after-hours risk, and include it in the evening briefing for the user to review.",
        metricName: "chat.web.direct.bouncer",
      };
    }
    if (lower.includes("do not offer") || lower.includes("outside your service area") || lower.includes("no phone number")) {
      return {
        text: "Under the current Bouncer policy, do not auto-decline and do not reply yet. Hold the lead, record why it looks out-of-scope or incomplete, and surface it in the evening briefing so the user can decide whether to take it.",
        metricName: "chat.web.direct.bouncer",
      };
    }
  }

  if (/^what note would you add for a suspiciously low-value lead/i.test(text)) {
    return {
      text: "Suggested note: Low-value lead flagged for review. Do not reply yet. Surface in evening briefing so the user can decide whether to accept, price-adjust, or decline manually.",
      metricName: "chat.web.direct.bouncer",
    };
  }

  if (/^explain our current rule for leads we do not want to answer immediately/i.test(text)) {
    return {
      text: "Current rule: do not auto-decline and do not auto-reply. Hold the lead silently, record the reason it needs review, and include it in the evening briefing. If the user later says to take the job, continue the CRM flow from there.",
      metricName: "chat.web.direct.bouncer",
    };
  }

  if (/^if i say we do want to take the job after a bouncer hold/i.test(text)) {
    return {
      text: "Once the user says to take the job, continue the normal CRM flow: create or update the contact, log the deal, keep the warning history on the record, and move it forward like any other lead.",
      metricName: "chat.web.direct.bouncer",
    };
  }

  if (/^summarize the bouncer policy we are currently testing in four bullet points/i.test(text)) {
    return {
      text: "- Do not auto-decline leads.\n- Do not auto-reply to risky or unclear leads yet.\n- Hold them for review with warning notes or orange-badge style flags.\n- Surface them in the evening briefing so the user decides whether to take the job.",
      metricName: "chat.web.direct.bouncer",
    };
  }

  let match = text.match(/^create a new (business )?contact called (.+?) with (.+)$/i);
  if (match) {
    const contactType = match[1] ? "BUSINESS" : "PERSON";
    const name = cleanDirectValue(match[2]);
    const details = match[3];
    const email = extractEmailFromText(details);
    const phone = extractPhoneFromText(details);
    return {
      text: await runCreateContact(workspaceId, { name, email, phone }),
      metricName: "chat.web.direct.create_contact",
    };
  }

  match = text.match(/^(?:what phone number and email do you have on file for|look up) (.+?)(?: and tell me the exact phone and email on file)?[.?!]*$/i);
  if (match) {
    const result = await runGetClientContext(workspaceId, { clientName: cleanDirectValue(match[1]) });
    return {
      text: formatClientContextResult(result),
      metricName: "chat.web.direct.contact_context",
    };
  }

  match = text.match(/^(?:what do you know about|show me the client context for|what are the most important facts you have about) (.+?)(?: right now| without guessing)?[.?!]*$/i);
  if (match) {
    const result = await runGetClientContext(workspaceId, { clientName: cleanDirectValue(match[1]) });
    return {
      text: formatClientContextResult(result),
      metricName: "chat.web.direct.contact_context",
    };
  }

  match = text.match(/^what conversation history do we have with (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runGetConversationHistory(workspaceId, { contactName: cleanDirectValue(match[1]) }),
      metricName: "chat.web.direct.contact_history",
    };
  }

  match = text.match(/^list the jobs you can find for (.+?)[.?!]*$/i);
  if (match) {
    const result = await runGetClientContext(workspaceId, { clientName: cleanDirectValue(match[1]) });
    if (!result.client) {
      return {
        text: "I couldn't find that contact in the CRM.",
        metricName: "chat.web.direct.contact_jobs",
      };
    }
    const jobLines = result.recentJobs.length
      ? result.recentJobs.map((job) => `- ${job.title} (${job.stage}${job.scheduledAt ? `, ${new Date(job.scheduledAt).toLocaleString("en-AU")}` : ""})`).join("\n")
      : "No jobs found for that contact.";
    return {
      text: `Jobs for ${result.client.name}:\n${jobLines}`,
      metricName: "chat.web.direct.contact_jobs",
    };
  }

  match = text.match(/^find contacts matching (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runSearchContacts(workspaceId, cleanDirectValue(match[1])),
      metricName: "chat.web.direct.search_contacts",
    };
  }

  match = text.match(/^update (.+?) so the phone number is (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runUpdateContactFields(workspaceId, { contactName: cleanDirectValue(match[1]), phone: cleanDirectValue(match[2]) }),
      metricName: "chat.web.direct.update_contact",
    };
  }

  match = text.match(/^update (.+?) so the email is (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runUpdateContactFields(workspaceId, { contactName: cleanDirectValue(match[1]), email: cleanDirectValue(match[2]) }),
      metricName: "chat.web.direct.update_contact",
    };
  }

  match = text.match(/^update (.+?) so the company name is (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runUpdateContactFields(workspaceId, { contactName: cleanDirectValue(match[1]), company: cleanDirectValue(match[2]) }),
      metricName: "chat.web.direct.update_contact",
    };
  }

  match = text.match(/^create a new job called (.+?) for (.+?) at (.+?) with (?:a quoted value of|value) \$?([\d,]+(?:\.\d+)?)[.?!]*$/i);
  if (match) {
    const settings = await getWorkspaceSettingsById(workspaceId);
    if (normalizeAppAgentMode(settings?.agentMode) === "INFO_ONLY") {
      return {
        text: "Agent is currently in Info only mode and cannot create jobs.",
        metricName: "chat.web.direct.create_job",
      };
    }
    const result = await runCreateJobNatural(workspaceId, {
      workDescription: cleanDirectValue(match[1]),
      clientName: cleanDirectValue(match[2]),
      address: cleanDirectValue(match[3]),
      price: parseMoneyAmount(match[4]) ?? 0,
    });
    return {
      text: result.message,
      metricName: "chat.web.direct.create_job",
    };
  }

  match = text.match(/^create a reminder task to follow up (.+?) (tomorrow.+?|on .+?|monday.+?|tuesday.+?|wednesday.+?|thursday.+?|friday.+?|saturday.+?|sunday.+?) about (.+?)[.?!]*$/i);
  if (match) {
    const dueAtISO = resolveScheduleIso(match[2]);
    const dealId = await findDealIdByTitle(workspaceId, match[1]);
    if (!dealId) {
      return {
        text: `Couldn't find a job matching "${cleanDirectValue(match[1])}".`,
        metricName: "chat.web.direct.task",
      };
    }
    return {
      text: await runCreateTask({
        title: `Follow up ${cleanDirectValue(match[1])}`,
        dueAtISO: dueAtISO ?? undefined,
        description: cleanDirectValue(match[3]),
        dealId,
      }),
      metricName: "chat.web.direct.task",
    };
  }

  match = text.match(/^create a reminder task to call (.+?) (tomorrow.+?|on .+?|monday.+?|tuesday.+?|wednesday.+?|thursday.+?|friday.+?|saturday.+?|sunday.+?) about (.+?)[.?!]*$/i);
  if (match) {
    const dueAtISO = resolveScheduleIso(match[2]);
    const clientContext = await runGetClientContext(workspaceId, { clientName: cleanDirectValue(match[1]) });
    return {
      text: await runCreateTask({
        title: `Call ${cleanDirectValue(match[1])}`,
        dueAtISO: dueAtISO ?? undefined,
        description: cleanDirectValue(match[3]),
        contactId: clientContext.client?.id,
      }),
      metricName: "chat.web.direct.task",
    };
  }

  match = text.match(/^create a new task called (.+?) due (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runCreateTask({
        title: cleanDirectValue(match[1]),
        dueAtISO: resolveScheduleIso(match[2]) ?? undefined,
      }),
      metricName: "chat.web.direct.task",
    };
  }

  match = text.match(/^what jobs for (.+?) are ready to invoice or already invoiced[.?!]*$/i);
  if (match) {
    const deals = await getDeals(workspaceId, undefined, { unbounded: true });
    const matches = filterDealsByQuery(deals, match[1]).filter((deal) =>
      deal.stage === "ready_to_invoice" || (typeof deal.invoicedAmount === "number" && deal.invoicedAmount > 0),
    );
    return {
      text: formatDealList(
        matches.length
          ? `Jobs matching "${cleanDirectValue(match[1])}" that are ready to invoice or already invoiced:`
          : `I couldn't find any jobs matching "${cleanDirectValue(match[1])}" that are ready to invoice or already invoiced.`,
        matches.map((deal) => ({
          title: deal.title,
          stage: deal.stage,
          invoicedAmount: deal.invoicedAmount,
        })),
      ),
      metricName: "chat.web.direct.invoice_jobs",
    };
  }

  match = text.match(/^what jobs for (.+?) look incomplete or blocked[.?!]*$/i);
  if (match) {
    const deals = await getDeals(workspaceId, undefined, { unbounded: true });
    const matches = filterDealsByQuery(deals, match[1])
      .map((deal) => ({
        ...deal,
        signals: getAttentionSignalsForDeal({
          id: deal.id,
          title: deal.title ?? deal.contactName ?? "Job",
          stage: deal.stage ?? "new_request",
          health: deal.health ?? null,
          scheduledAt: deal.scheduledAt ?? null,
          actualOutcome: deal.actualOutcome ?? null,
          metadata: deal.metadata ?? null,
        }).map((signal) => signal.label),
      }))
      .filter((deal) => !["completed", "lost", "deleted", "archived"].includes(String(deal.stage)) || deal.signals.length > 0);
    return {
      text: formatDealList(
        matches.length
          ? `Jobs matching "${cleanDirectValue(match[1])}" that still look incomplete or blocked:`
          : `I couldn't find any jobs matching "${cleanDirectValue(match[1])}" that look incomplete or blocked.`,
        matches.map((deal) => ({
          title: deal.title,
          stage: deal.stage,
          signals: deal.signals,
        })),
      ),
      metricName: "chat.web.direct.attention_jobs",
    };
  }

  match = text.match(/^for (.+?), update the value to \$?([\d,]+(?:\.\d+)?) and rename it to (.+?)[.?!]*$/i);
  if (match) {
    const result = await runUpdateDealFields(workspaceId, {
      dealTitle: cleanDirectValue(match[1]),
      value: parseMoneyAmount(match[2]),
      newTitle: cleanDirectValue(match[3]),
    });
    return {
      text: result.message,
      metricName: "chat.web.direct.update_deal",
    };
  }

  match = text.match(/^update (.+?) so the address is (.+?)[.?!]*$/i);
  if (match) {
    const result = await runUpdateDealFields(workspaceId, {
      dealTitle: cleanDirectValue(match[1]),
      address: cleanDirectValue(match[2]),
    });
    return {
      text: result.message,
      metricName: "chat.web.direct.update_deal",
    };
  }

  match = text.match(/^update (.+?) so the schedule is (.+?)[.?!]*$/i);
  if (match) {
    const result = await runUpdateDealFields(workspaceId, {
      dealTitle: cleanDirectValue(match[1]),
      schedule: cleanDirectValue(match[2]),
    });
    return {
      text: result.message,
      metricName: "chat.web.direct.update_deal",
    };
  }

  match = text.match(/^update (.+?) so the value is \$?([\d,]+(?:\.\d+)?)[.?!]*$/i);
  if (match) {
    const result = await runUpdateDealFields(workspaceId, {
      dealTitle: cleanDirectValue(match[1]),
      value: parseMoneyAmount(match[2]),
    });
    return {
      text: result.message,
      metricName: "chat.web.direct.update_deal",
    };
  }

  match = text.match(/^create a draft invoice for (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runCreateDraftInvoice(workspaceId, { dealTitle: cleanDirectValue(match[1]) }),
      metricName: "chat.web.direct.invoice",
    };
  }

  match = text.match(/^(?:what is the latest invoice status for|show me the invoice status for) (.+?)[.?!]*$/i);
  if (match) {
    return {
      text: await runGetInvoiceStatusAction(workspaceId, { dealTitle: cleanDirectValue(match[1]) }),
      metricName: "chat.web.direct.invoice",
    };
  }

  match = text.match(/^update the final invoice amount for (.+?) to \$?([\d,]+(?:\.\d+)?)[.?!]*$/i);
  if (match) {
    return {
      text: await runUpdateInvoiceAmount(workspaceId, {
        dealTitle: cleanDirectValue(match[1]),
        amount: parseMoneyAmount(match[2]) ?? 0,
      }),
      metricName: "chat.web.direct.invoice",
    };
  }

  match = text.match(/^assign (.+?) to (.+?)(?: if .*|[.?!]*)$/i);
  if (match) {
    const result = await runAssignTeamMember(workspaceId, {
      dealTitle: cleanDirectValue(match[1]),
      teamMemberName: cleanDirectValue(match[2]),
    });
    return {
      text: result.message,
      metricName: "chat.web.direct.assign",
    };
  }

  match = text.match(/^unassign (.+?)(?: if .*|[.?!]*)$/i);
  if (match) {
    const dealId = await findDealIdByTitle(workspaceId, match[1]);
    if (!dealId) {
      return {
        text: `Couldn't find a job matching "${cleanDirectValue(match[1])}".`,
        metricName: "chat.web.direct.assign",
      };
    }
    return {
      text: await runUnassignDeal(workspaceId, { dealId }),
      metricName: "chat.web.direct.assign",
    };
  }

  match = text.match(/^restore (.+?)(?: if .*|[.?!]*)$/i);
  if (match) {
    const dealId = await findDealIdByTitle(workspaceId, match[1]);
    if (!dealId) {
      return {
        text: `Couldn't find a job matching "${cleanDirectValue(match[1])}".`,
        metricName: "chat.web.direct.restore",
      };
    }
    return {
      text: await runRestoreDeal(workspaceId, { dealId }),
      metricName: "chat.web.direct.restore",
    };
  }

  match = text.match(/^move (.+?) to (.+?)(?: and .*|[.?!]*)$/i);
  if (match) {
    const normalizedStage = cleanDirectValue(match[2]).replace(/^back to\s+/i, "");
    const result = await runMoveDeal(workspaceId, cleanDirectValue(match[1]), normalizedStage);
    return {
      text: result.message,
      metricName: "chat.web.direct.move_deal",
    };
  }

  match = text.match(/^(?:show me the current crm details for|show me the latest details for|show me the full job context for|summarize the current state of|what recent notes or updates exist for|what changed most recently in the crm for|what are the most important facts you have about) (.+?)(?: including.*| in one tight paragraph| without guessing)?[.?!]*$/i);
  if (match) {
    return {
      text: await runGetDealContext(workspaceId, { dealTitle: cleanDirectValue(match[1]) }),
      metricName: "chat.web.direct.deal_context",
    };
  }

  match = text.match(/^(?:add a note to|create another note on|create an internal note on) (.+?) saying (.+)$/i);
  if (match) {
    const target = cleanDirectValue(match[1]);
    const note = cleanDirectValue(match[2]);
    const dealResult = await runAddDealNote(workspaceId, { dealTitle: target, note });
    if (dealResult.success) {
      return {
        text: dealResult.message,
        metricName: "chat.web.direct.note",
      };
    }
    const contactResult = await runAddContactNote(workspaceId, { contactName: target, note });
    return {
      text: contactResult.message,
      metricName: "chat.web.direct.note",
    };
  }

  match = text.match(/^(?:what stage is|what is the exact current stage of) (.+?)(?: in now| now)?[.?!]*$/i);
  if (match) {
    const deals = await getDeals(workspaceId, undefined, { unbounded: true });
    const query = cleanDirectValue(match[1]).toLowerCase();
    const deal = deals.find((item) => item.title?.toLowerCase() === query)
      ?? deals.find((item) => item.title?.toLowerCase().includes(query) || query.includes(item.title?.toLowerCase() ?? ""));
    if (!deal) {
      return {
        text: `Couldn't find a job matching "${cleanDirectValue(match[1])}".`,
        metricName: "chat.web.direct.stage_lookup",
      };
    }
    const stageKey = String((deal as { stage?: string }).stage ?? "");
    const stageLabel = DIRECT_STAGE_LABELS[stageKey] ?? DIRECT_STAGE_LABELS[stageKey.toUpperCase()] ?? stageKey;
    return {
      text: `"${deal.title}" is currently in ${stageLabel}.`,
      metricName: "chat.web.direct.stage_lookup",
    };
  }

  if (/^what recent crm changes happened overall in the workspace[.?!]*$/i.test(text) || /^list recent crm changes/i.test(text)) {
    return {
      text: await runListRecentCrmChanges(workspaceId),
      metricName: "chat.web.direct.recent_changes",
    };
  }

  if (/^which jobs need attention right now[.?!]*$/i.test(text) || /^which of the .* jobs look stale or overdue[.?!]*$/i.test(text)) {
    const result = await runGetAttentionRequired(workspaceId);
    return {
      text: result.message,
      metricName: "chat.web.direct.attention",
    };
  }

  if (/^give me today'?s summary with readiness alerts first[.?!]*$/i.test(text) || /^what preparation issues exist in today'?s jobs[.?!]*$/i.test(text) || /^what should i focus on first this morning based on the crm[.?!]*$/i.test(text)) {
    const result = await runGetTodaySummary(workspaceId);
    return {
      text: formatTodaySummaryResult(result),
      metricName: "chat.web.direct.today_summary",
    };
  }

  match = text.match(/^what availability do we have (.+?)[.?!]*$/i);
  if (match) {
    const date = resolveAvailabilityDate(match[1]);
    if (!date) {
      return {
        text: "I couldn't work out that date for availability. Try something like tomorrow or Monday.",
        metricName: "chat.web.direct.availability",
      };
    }
    const settings = await getWorkspaceSettingsById(workspaceId);
    const result = await runGetAvailability(workspaceId, {
      date,
      workingHoursStart: typeof settings?.workingHoursStart === "string" ? settings.workingHoursStart : undefined,
      workingHoursEnd: typeof settings?.workingHoursEnd === "string" ? settings.workingHoursEnd : undefined,
      weeklyHours: settings?.weeklyHours as Parameters<typeof runGetAvailability>[1]["weeklyHours"],
      workspaceTimezone: typeof settings?.workspaceTimezone === "string" ? settings.workspaceTimezone : undefined,
    });
    return {
      text: formatAvailabilityResult(result, cleanDirectValue(match[1])),
      metricName: "chat.web.direct.availability",
    };
  }

  if (/^undo the last crm action if it is safe to do so[.?!]*$/i.test(text)) {
    return {
      text: await runUndoLastAction(workspaceId),
      metricName: "chat.web.direct.undo",
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const workspaceId = (body.workspaceId ?? body.data?.workspaceId ?? "").trim();
    const selectedDeals = Array.isArray(body.data?.selectedDeals)
      ? body.data.selectedDeals
        .filter((item: unknown): item is SelectionDeal => {
          if (!item || typeof item !== "object") return false;
          const value = item as { id?: unknown };
          return typeof value.id === "string" && value.id.trim().length > 0;
        })
        .map((item: SelectionDeal) => ({
          id: item.id.trim(),
          title: typeof item.title === "string" ? item.title.trim() : undefined,
        }))
      : [];

    if (!workspaceId || typeof workspaceId !== "string") {
      return new Response(
        JSON.stringify({ error: "workspaceId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 30 requests per minute per workspace
    const rl = await rateLimit(`chat:${workspaceId}`, 30, 60_000);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const lastUser = messages.filter((m: { role?: string }) => m.role === "user").pop();
    let content = "";
    if (lastUser) {
      const textPart = lastUser.parts?.find((p: { type?: string; text?: string }) => p.type === "text");
      content = (textPart?.text ?? (typeof (lastUser as { content?: string }).content === "string" ? (lastUser as { content: string }).content : "") ?? "").trim();
    }
    if (!content && typeof body.prompt === "string") content = body.prompt.trim();
    if (!content && typeof body.input === "string") content = body.input.trim();
    if (!content && typeof body.message === "string") content = body.message.trim();
    const requestStartedAt = nowMs();

    // Sticky context: if previous assistant turn created a support ticket,
    // treat the immediate next user message as an addendum note.
    const lastUserIndex = Array.isArray(messages) ? [...messages].map((m: any) => m?.role).lastIndexOf("user") : -1;
    if (lastUserIndex > 0 && looksLikeFollowUpDetail(content)) {
      const previousAssistant = [...messages]
        .slice(0, lastUserIndex)
        .reverse()
        .find((m: any) => m?.role === "assistant");
      const stickyTicketId = extractStickyTicketIdFromAssistantMessage(previousAssistant);
      if (stickyTicketId) {
        try {
          const result = await appendTicketNote(stickyTicketId, content);
          const textId = "sticky-ticket-note";
          const stream = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: "start" });
              writer.write({ type: "text-start", id: textId });
              writer.write({ type: "text-delta", id: textId, delta: `${result} I've attached that to the same support ticket.` });
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "finish" });
            },
          });
          return createUIMessageStreamResponse({ stream });
        } catch {
          // If append fails, continue normal flow.
        }
      }
    }

    if (content) saveUserMessage(workspaceId, content).catch((err) => {
      logger.error("Failed to save user message", { component: "chat-api", workspaceId }, err as Error);
    });

    // "Next" in multi-job flow: use persisted multi-job state from previous tool outputs.
    const isNextMessage = /^\s*next\s*(job)?\s*(please)?\s*$/i.test(content.trim()) || content.trim().toLowerCase() === "next";
    if (isNextMessage && Array.isArray(messages) && messages.length >= 2) {
      const cachedMultiJobState = extractLatestMultiJobState(messages);
      let jobsFromHistory: ParsedJob[] | null = cachedMultiJobState?.jobs ?? null;
      let jobIndex = cachedMultiJobState?.nextIndex ?? 0;

      // Backward-compatible fallback when state is unavailable in old messages.
      if (!jobsFromHistory) {
        const candidate = findMostRecentMultiJobCandidate(messages);
        if (candidate) {
          const parsedFallback = await withTimeout(parseMultipleJobsWithAI(candidate), 1500, null);
          if (parsedFallback && parsedFallback.length >= 2) {
            jobsFromHistory = parsedFallback.map((job) => ({
              clientName: job.clientName,
              workDescription: job.workDescription,
              price: job.price,
              address: job.address,
              schedule: job.schedule,
              phone: job.phone,
              email: job.email,
            }));
            jobIndex = Math.min(1, jobsFromHistory.length - 1);
          }
        }
      }

      if (jobsFromHistory && jobIndex < jobsFromHistory.length) {
        const nextJob = jobsFromHistory[jobIndex];
        const draft = buildJobDraftFromParams(nextJob) as ReturnType<typeof buildJobDraftFromParams> & { warnings: string[] };
        draft.warnings = [];
        try {
          const [settings, deals] = await Promise.all([
            getWorkspaceSettingsById(workspaceId),
            getDeals(workspaceId, undefined, { unbounded: true }),
          ]);
          if (normalizeAppAgentMode(settings?.agentMode) === "INFO_ONLY") {
            return new Response(JSON.stringify({ error: "Agent is currently in Info only mode and cannot schedule jobs." }), { status: 403 });
          }
          await addDraftWarnings(draft, workspaceId, deals);
        } catch {
          // ignore
        }

        const nextIndex = jobIndex + 1;
        const multiJobRemaining = nextIndex < jobsFromHistory.length;
        const textId = "text-multi-next";
        const toolCallId = `showJobDraft-multi-${jobIndex + 1}`;
        const toolInput = {
          clientName: draft.clientName ?? "",
          workDescription: draft.workDescription ?? "Job",
          price: Number(String(draft.price).replace(/,/g, "")) || 0,
          address: draft.address || undefined,
          schedule: draft.rawSchedule || undefined,
          phone: draft.phone || undefined,
          email: draft.email || undefined,
        };
        const nextState: MultiJobState = { jobs: jobsFromHistory, nextIndex };
        const stream = createUIMessageStream({
          execute: ({ writer }) => {
            writer.write({ type: "start" });
            writer.write({ type: "text-start", id: textId });
            writer.write({ type: "text-delta", id: textId, delta: multiJobRemaining ? "Here's the next one — edit if needed, then confirm or cancel." : "Here's the last one — edit if needed, then confirm." });
            writer.write({ type: "text-end", id: textId });
            writer.write({ type: "tool-input-available", toolCallId, toolName: "showJobDraftForConfirmation", input: toolInput });
            writer.write({ type: "tool-output-available", toolCallId, output: { draft, multiJobRemaining, multiJobState: nextState } });
            writer.write({ type: "finish" });
          },
        });
        return createUIMessageStreamResponse({ stream });
      }
    }

    // Extract user ID from headers or use workspaceId as fallback
    const userId = req.headers.get("x-user-id") || workspaceId;
    const preprocessingStartedAt = nowMs();
    const lastUserMessage = messages.filter((m: { role?: string }) => m.role === "user").pop();
    const lastMessageContent = getUserMessageText(lastUserMessage) || content;

    // Pre-classify intent BEFORE preprocessing so flow-control messages can skip expensive work
    const classification = preClassify(content);
    const isFlowControl = classification.intent === 'flow_control';

    const directCommand = shouldAttemptDirectPolicyResponse(content, classification)
      ? await executeDirectCrmCommand({ workspaceId, content })
      : null;
    if (directCommand) {
      const elapsed = nowMs() - requestStartedAt;
      recordLatencyMetric(directCommand.metricName ?? "chat.web.direct", elapsed);
      recordLatencyMetric("chat.web.total_ms", elapsed);
      return createTextStreamResponse(directCommand.text);
    }

    const shouldRunStructuredExtraction = !isFlowControl && shouldAttemptStructuredJobExtraction(content, classification);
    const includeHistoricalPricing = !isFlowControl && shouldIncludeHistoricalPricing(content);
    const shouldGetMemoryContext = !isFlowControl && shouldFetchMemory(lastMessageContent);

    // ── PARALLEL: Run job extraction, context building, and memory fetch concurrently ──
    // This is the critical speed optimization — these 3 operations are independent and
    // were previously running sequentially, adding 1-3+ seconds of dead time.
    const jobExtractionStart = nowMs();
    const agentContextStart = nowMs();
    const memoryFetchStart = nowMs();
    const [extractedJobs, agentContext, memoryContextStr] = await Promise.all([
      (shouldRunStructuredExtraction
        ? withTimeout(extractAllJobsFromParagraph(content), 1400, [])
        : Promise.resolve([])
      ).then(r => { recordLatencyMetric('chat.web.preprocessing.job_extraction_ms', nowMs() - jobExtractionStart); return r; }),
      buildAgentContext(workspaceId, userId, { includeHistoricalPricing, pricingAudience: "business" })
        .then(r => { recordLatencyMetric('chat.web.preprocessing.agent_context_ms', nowMs() - agentContextStart); return r; }),
      (shouldGetMemoryContext
        ? withTimeout(fetchMemoryContext(userId, lastMessageContent), 400, "")
        : Promise.resolve("")
      ).then(r => { recordLatencyMetric('chat.web.preprocessing.memory_fetch_ms', nowMs() - memoryFetchStart); return r; }),
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

    // ── Handle job extraction results (draft card early-returns) ──
    const multipleJobs = extractedJobs.length >= 2 ? extractedJobs : null;
    const useMultiJobFlow = multipleJobs !== null;

    if (useMultiJobFlow && multipleJobs && multipleJobs.length >= 2) {
      // Return first job as a proper draft card so the UI shows Confirm/Cancel (not AI text).
      const first = multipleJobs[0];
      const draft = buildJobDraftFromParams(first) as ReturnType<typeof buildJobDraftFromParams> & { warnings: string[] };
      draft.warnings = [];
      try {
        if (normalizeAppAgentMode(settings?.agentMode) === "INFO_ONLY") {
          return new Response(JSON.stringify({ error: "Agent is currently in Info only mode and cannot schedule jobs." }), { status: 403 });
        }
        const deals = await getDeals(workspaceId, undefined, { unbounded: true });
        await addDraftWarnings(draft, workspaceId, deals);
      } catch {
        // ignore
      }
      const textId = "text-multi-draft";
      const toolCallId = "showJobDraft-multi-1";
      const toolInput = { clientName: draft.clientName ?? "", workDescription: draft.workDescription ?? "Job", price: Number(String(draft.price).replace(/,/g, "")) || 0, address: draft.address || undefined, schedule: draft.rawSchedule || undefined, phone: draft.phone || undefined, email: draft.email || undefined };
      const initialState: MultiJobState = {
        jobs: multipleJobs.map((job) => ({
          clientName: job.clientName,
          workDescription: job.workDescription,
          price: job.price,
          address: job.address,
          schedule: job.schedule,
          phone: job.phone,
          email: job.email,
        })),
        nextIndex: 1,
      };
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: "I’ll process these one at a time. Here’s the first one — edit if needed, then confirm and I’ll create it and move to the next." });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "tool-input-available", toolCallId, toolName: "showJobDraftForConfirmation", input: toolInput });
          writer.write({ type: "tool-output-available", toolCallId, output: { draft, multiJobRemaining: true, multiJobState: initialState } });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

    const singleJobFromParagraph = extractedJobs.length === 1 ? extractedJobs[0] : null;
    const parsed = useMultiJobFlow
      ? null
      : (singleJobFromParagraph ??
        (shouldRunStructuredExtraction ? await withTimeout(parseJobWithAI(content), 1400, null) : null));
    if (parsed) {
      // One-liner: return a draft card for confirmation; do not create the job until user confirms.
      const draft = buildJobDraftFromParams(parsed) as ReturnType<typeof buildJobDraftFromParams> & { warnings: string[] };
      draft.warnings = [];
      try {
        if (normalizeAppAgentMode(settings?.agentMode) === "INFO_ONLY") {
          return new Response(JSON.stringify({ error: "Agent is currently in Info only mode and cannot schedule jobs." }), { status: 403 })
        }
        const deals = await getDeals(workspaceId, undefined, { unbounded: true });
        await addDraftWarnings(draft, workspaceId, deals);
      } catch {
        // ignore
      }
      const textId = "text-draft";
      const toolCallId = "showJobDraft-1";
      const toolInput = { clientName: draft.clientName ?? "", workDescription: draft.workDescription ?? "Job", price: Number(String(draft.price).replace(/,/g, "")) || 0, address: draft.address || undefined, schedule: draft.rawSchedule || undefined, phone: draft.phone || undefined, email: draft.email || undefined };
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: "Here’s what I got — edit anything before confirming." });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "tool-input-available", toolCallId, toolName: "showJobDraftForConfirmation", input: toolInput });
          writer.write({ type: "tool-output-available", toolCallId, output: { draft } });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

    // ── Prepare model messages for LLM ──
    const google = createGoogleGenerativeAI({ apiKey });

    let modelMessages: unknown[];
    try {
      const converted = await convertToModelMessages(messages);
      modelMessages = Array.isArray(converted) ? converted : [];
    } catch {
      modelMessages = content ? [{ role: "user", content }] : [];
    }
    if (!modelMessages?.length && content) modelMessages = [{ role: "user", content }];
    if (!modelMessages?.length) {
      return new Response(
        JSON.stringify({ error: "No messages to process" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Gemini requires at least one "parts" (prompt input). Ensure the latest user turn has content.
    const lastMsg = modelMessages[modelMessages.length - 1] as any;
    const isLastUser = lastMsg?.role === "user";
    const lastContent = lastMsg?.content;
    const hasParts = typeof lastContent === "string"
      ? lastContent.trim().length > 0
      : Array.isArray(lastContent) && lastContent.some((p: any) => p && typeof p === "object" && "text" in p && String(p.text).trim().length > 0);

    // If there is valid `content` string but the last message object is empty, patch it.
    if (isLastUser && !hasParts && content?.trim()) {
      modelMessages = [...modelMessages.slice(0, -1), { role: "user", content }];
    }
    // If it is genuinely empty, return a fallback stream to avoid the 500 API crash.
    else if (isLastUser && !hasParts) {
      const textId = "empty-fallback";
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: "I didn’t quite catch that. Could you please provide more details?" });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

    // CRITICAL API FIX: Google SDK crashes with "must include at least one parts field"
    // if ANY message in the history has empty content and no tool calls.
    // We must deep-check arrays for actual text content, not just array length.
    modelMessages = modelMessages.filter((msg: any) => {
      if (msg.role === "system") return true;
      let msgHasText = false;
      if (typeof msg.content === "string") {
        msgHasText = msg.content.trim().length > 0;
      } else if (Array.isArray(msg.content)) {
        msgHasText = msg.content.some((p: any) => {
          if (!p || typeof p !== "object") return false;
          if ("text" in p && typeof p.text === "string" && p.text.trim().length > 0) return true;
          if ("type" in p && p.type === "text" && "text" in p && String(p.text ?? "").trim().length > 0) return true;
          if ("type" in p && (p.type === "tool-call" || p.type === "tool-result")) return true;
          return false;
        });
      }
      const msgHasTools = !!(msg.toolInvocations?.length || msg.toolCalls?.length);
      return msgHasText || msgHasTools;
    });

    // Context pruning: keep only the last MAX_HISTORY_MESSAGES to avoid unbounded
    // token growth and rising latency/cost. System messages always pass through.
    const MAX_HISTORY_MESSAGES = 8;
    if (modelMessages.length > MAX_HISTORY_MESSAGES) {
      const systemMsgs = modelMessages.filter((m: any) => m.role === "system");
      const nonSystemMsgs = modelMessages.filter((m: any) => m.role !== "system");
      modelMessages = [...systemMsgs, ...nonSystemMsgs.slice(-MAX_HISTORY_MESSAGES)];
    }

    // Final safety: ensure last message is user with content. If history was entirely
    // filtered away, create a minimal user message from the extracted content.
    if (!modelMessages.length && content?.trim()) {
      modelMessages = [{ role: "user", content }];
    }
    if (!modelMessages.length) {
      const textId = "empty-fallback-2";
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: "I didn’t quite catch that. Could you rephrase?" });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

    // multiJobInstruction removed — the multi-job early-return (lines above)
    // handles this before streamText is reached, so it was always "".

    // ── Intent hints for context injection (classification already done above) ──
    const intentHintsStr = classification.contextHints.length > 0
      ? classification.contextHints.join("\n")
      : "";

    let toolCallsMs = 0;
    const toolOutputsForValidation: unknown[] = [];
    const selectionContextStr = selectedDeals.length
      ? `CURRENT CRM SELECTION:\n${selectedDeals
        .map((deal: SelectionDeal, index: number) => `${index + 1}. ${deal.title ? `${deal.title} ` : ""}[${deal.id}]`)
        .join("\n")}\nWhen the user says "these", "selected", or "current selection", use these deal IDs for bulk tools. Do not assume this selection if the user is referring to some other set.`
      : "";
    const tools = instrumentToolsWithLatency(
      getAgentToolsForIntent(workspaceId, settings, userId, classification),
      (toolName, durationMs) => {
        toolCallsMs += durationMs;
        recordLatencyMetric(`chat.web.tool.${toolName}_ms`, durationMs);
      },
    );
    const resolvedEntitiesBlock = await buildResolvedEntitiesBlock(
      workspaceId,
      content,
      classification,
      selectedDeals,
    );
    const workspaceContextBlocks = buildWorkspaceContextBlocks(classification, content, {
      knowledgeBaseStr,
      workingHoursStr,
      agentScriptStr,
      preferencesStr,
      pricingRulesStr,
      bouncerStr,
      attachmentsStr,
      memoryContextStr,
      selectionContextStr,
    });
    let systemPrompt = buildCrmChatSystemPrompt({
      userRole,
      customerContactPolicyBlock: [agentModeStr, allowedTimesStr].filter(Boolean).join("\n\n"),
      workspaceContextBlocks,
      resolvedEntitiesBlock,
      intentHintBlock: intentHintsStr,
      pricingIntegrityBlock: `- NEVER quote, calculate, or mention a dollar amount unless it comes from a tool result (pricingLookup, pricingCalculator, getFinancialReport, etc.).
- For ANY arithmetic involving money (totals, tax, discounts, multi-item quotes), you MUST call pricingCalculator. Never do math in your head.
- Before quoting any service price, you MUST call pricingLookup first to get the approved or historical price.
- If pricingLookup returns no match, say "I don’t have an approved price in your glossary for this. For a firm quote, an on-site assessment is required (or add an approved glossary price so we can quote next time)." Do NOT estimate or guess.
- When reporting a price, cite where it came from: "Our approved rate for X is $Y" or "Similar jobs have been $X-$Y".`,
      messagingRuleBlock: `On "message/text/tell/send [name]" call sendSms immediately with no confirmation. Send the user's exact words and never rewrite or refuse them. Track pronouns from context. Confirm with: "Sent to [Name]: \\"[msg]\\"". Follow any SYSTEM_CONTEXT_SIGNAL from tool output.`,
      uncertaintyBlock: "Never return blank. Ask to clarify if unclear. List options if ambiguous. Request missing info. If a tool fails, explain and suggest retry. If no data exists, say what you checked. For getTodaySummary, lead with preparation alerts before the schedule.",
      roleGuardBlock: `Data changes: OWNER and MANAGER users confirm via showConfirmationCard, then recordManualRevenue after the user says "confirm", "ok", or "yes". TEAM_MEMBER users cannot change restricted data and should be told to ask their manager.`,
      multiJobBlock: `Always use showJobDraftForConfirmation instead of plain text. Handle one job at a time. Do not call createJobNatural until the user confirms.`,
      jobDraftBlock: `When showJobDraftForConfirmation is used, the card itself is the full draft summary. Do not repeat the draft details, call-out fee, address, phone, or a second confirmation line underneath it. If needed, add only a very short instruction like "Use the card to confirm or edit."`,
    });

    // Hard cap prompt growth to prevent over-limit requests/cost spikes.
    const messagesTokenEstimate = estimateTokens(toText(modelMessages));
    let totalInputTokenEstimate = estimateTokens(systemPrompt) + messagesTokenEstimate;
    if (totalInputTokenEstimate > MAX_INPUT_TOKENS_ESTIMATE && memoryContextStr) {
      const reducedPrompt = buildCrmChatSystemPrompt({
        userRole,
        customerContactPolicyBlock: [agentModeStr, allowedTimesStr].filter(Boolean).join("\n\n"),
        workspaceContextBlocks: workspaceContextBlocks.filter((b) => b !== memoryContextStr),
        resolvedEntitiesBlock,
        intentHintBlock: intentHintsStr,
        pricingIntegrityBlock: `- NEVER quote, calculate, or mention a dollar amount unless it comes from a tool result (pricingLookup, pricingCalculator, getFinancialReport, etc.).
- For ANY arithmetic involving money (totals, tax, discounts, multi-item quotes), you MUST call pricingCalculator. Never do math in your head.
- Before quoting any service price, you MUST call pricingLookup first to get the approved or historical price.
- If pricingLookup returns no match, say "I don’t have an approved price in your glossary for this. For a firm quote, an on-site assessment is required (or add an approved glossary price so we can quote next time)." Do NOT estimate or guess.
- When reporting a price, cite where it came from: "Our approved rate for X is $Y" or "Similar jobs have been $X-$Y".`,
        messagingRuleBlock: `On "message/text/tell/send [name]" call sendSms immediately with no confirmation. Send the user's exact words and never rewrite or refuse them. Track pronouns from context. Confirm with: "Sent to [Name]: \\"[msg]\\"". Follow any SYSTEM_CONTEXT_SIGNAL from tool output.`,
        uncertaintyBlock: "Never return blank. Ask to clarify if unclear. List options if ambiguous. Request missing info. If a tool fails, explain and suggest retry. If no data exists, say what you checked. For getTodaySummary, lead with preparation alerts before the schedule.",
        roleGuardBlock: `Data changes: OWNER and MANAGER users confirm via showConfirmationCard, then recordManualRevenue after the user says "confirm", "ok", or "yes". TEAM_MEMBER users cannot change restricted data and should be told to ask their manager.`,
        multiJobBlock: `Always use showJobDraftForConfirmation instead of plain text. Handle one job at a time. Do not call createJobNatural until the user confirms.`,
        jobDraftBlock: `When showJobDraftForConfirmation is used, the card itself is the full draft summary. Do not repeat the draft details, call-out fee, address, phone, or a second confirmation line underneath it. If needed, add only a very short instruction like "Use the card to confirm or edit."`,
      });
      systemPrompt = reducedPrompt;
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
    const result = streamText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      maxOutputTokens: 512,
      system: systemPrompt,
      messages: modelMessages as any,
      tools,
      stopWhen: stepCountIs(getAdaptiveMaxSteps(content)),
      onChunk: ({ chunk }) => {
        if (!ttftRecorded && chunk.type === 'text-delta') {
          ttftRecorded = true;
          ttftMs = nowMs() - llmStartedAt;
          recordLatencyMetric('chat.web.ttft_ms', ttftMs);
        }
      },
      onStepFinish: ({ toolResults }) => {
        if (toolResults) {
          for (const tr of toolResults) {
            if ("output" in tr && typeof tr.output !== "undefined") {
              toolOutputsForValidation.push(tr.output);
              continue;
            }
            if ("result" in tr && typeof tr.result !== "undefined") {
              toolOutputsForValidation.push(tr.result);
            }
          }
        }
      },
      onFinish: async ({ text }) => {
        const llmPhaseMs = nowMs() - llmStartedAt;
        const modelMs = Math.max(0, llmPhaseMs - toolCallsMs);
        const totalMs = nowMs() - requestStartedAt;
        recordLatencyMetric("chat.web.preprocessing_ms", preprocessingMs);
        recordLatencyMetric("chat.web.tool_calls_ms", toolCallsMs);
        recordLatencyMetric("chat.web.model_ms", modelMs);
        recordLatencyMetric("chat.web.total_ms", totalMs);

        // === Pricing Response Validation ===
        const validation = validatePricingInResponse(text, toolOutputsForValidation);
        if (!validation.valid) {
          console.warn(
            `[PricingValidator] Unsourced amounts detected in response: ${validation.unsourcedAmounts.join(", ")}. ` +
            `Sourced: ${validation.sourcedAmounts.join(", ")}. Mentioned: ${validation.mentionedAmounts.join(", ")}.`
          );
          recordLatencyMetric("chat.web.pricing_validation_fail", 1);
        }

        // === STEP B: "The Learning" (Post-Generation Memory Storage) ===
        console.log(`[Mem0] Starting memory storage...`);

        try {
          addMem0Memory({
            userId,
            messages: [
              { role: "user", content: lastMessageContent },
              { role: "assistant", content: text },
            ],
            metadata: {
              timestamp: new Date().toISOString(),
              source: "chat",
              workspaceId,
            },
          })
            .then(() => {
              console.log(`[Mem0] Successfully saved interaction`);
            })
            .catch((error: unknown) => {
              logger.error("Mem0 save interaction failed", { component: "chat-api", workspaceId, userId }, error as Error);
            });

          // Note: Not awaiting to avoid blocking the response
        } catch (error) {
          logger.error("Mem0 storage pipeline failed", { component: "chat-api", workspaceId, userId }, error as Error);
        }
      },
    });

    const response = result.toUIMessageStreamResponse();
    response.headers.set("Server-Timing", `preprocessing;dur=${preprocessingMs}, ttft;dur=${ttftMs}, llm_startup;dur=${nowMs() - llmStartedAt}, tool_calls;dur=${toolCallsMs}`);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    logger.error("Chat API error", { component: "chat-api" }, error as Error);
    return new Response(
      JSON.stringify({
        error: message.includes("GEMINI") || message.includes("API") ? "AI service error. Please try again." : message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

