import { streamText, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { saveUserMessage } from "@/actions/chat-actions";
import { getDeals } from "@/actions/deal-actions";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { buildJobDraftFromParams } from "@/lib/chat-utils";
import { parseJobWithAI, parseMultipleJobsWithAI, extractAllJobsFromParagraph } from "@/lib/ai/job-parser";
import { appendTicketNote } from "@/actions/activity-actions";
import { buildAgentContext, fetchMemoryContext, getMemoryClient } from "@/lib/ai/context";
import { getAgentTools } from "@/lib/ai/tools";
import { instrumentToolsWithLatency, nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function shouldAttemptStructuredJobExtraction(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 15) return false;
  const lower = trimmed.toLowerCase();
  if (/^(next|confirm|cancel|ok|okay|yes|no|done|thanks|thank you|undo)\b/.test(lower)) return false;
  const strongSignals =
    /(create|add|book|new job|log|needs|need|repair|install|replace|quote)/i.test(trimmed) ||
    /\$\s*\d+/.test(trimmed) ||
    /\b\d{8,}\b/.test(trimmed) ||
    /@/.test(trimmed) ||
    /\b(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(trimmed) ||
    /\b\d{1,2}\s?(am|pm)\b/i.test(trimmed);
  if (strongSignals) return true;
  const likelyQuestion = /^(what|show|list|how|why|who|when|where)\b/i.test(lower) || trimmed.includes("?");
  if (likelyQuestion) return false;
  const commaCount = (trimmed.match(/,/g) ?? []).length;
  return commaCount >= 2 && /\d/.test(trimmed);
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const workspaceId = (body.workspaceId ?? body.data?.workspaceId ?? "").trim();

    if (!workspaceId || typeof workspaceId !== "string") {
      return new Response(
        JSON.stringify({ error: "workspaceId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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

    if (content) saveUserMessage(workspaceId, content).catch(() => { });

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
            getDeals(workspaceId),
          ]);
          if (settings?.agentMode === "FILTER") {
            return new Response(JSON.stringify({ error: "Agent is currently in FILTER mode and cannot schedule jobs." }), { status: 403 });
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
    const shouldRunStructuredExtraction = shouldAttemptStructuredJobExtraction(content);
    const includeHistoricalPricing = shouldIncludeHistoricalPricing(content);
    const shouldGetMemoryContext = shouldFetchMemory(lastMessageContent);

    // ── PARALLEL: Run job extraction, context building, and memory fetch concurrently ──
    // This is the critical speed optimization — these 3 operations are independent and
    // were previously running sequentially, adding 1-3+ seconds of dead time.
    const [extractedJobs, agentContext, memoryContextStr] = await Promise.all([
      shouldRunStructuredExtraction
        ? withTimeout(extractAllJobsFromParagraph(content), 1400, [])
        : Promise.resolve([]),
      buildAgentContext(workspaceId, userId, { includeHistoricalPricing }),
      shouldGetMemoryContext
        ? withTimeout(fetchMemoryContext(userId, lastMessageContent), 700, "")
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
        if (settings?.agentMode === "FILTER") {
          return new Response(JSON.stringify({ error: "Agent is currently in FILTER mode and cannot schedule jobs." }), { status: 403 });
        }
        const deals = await getDeals(workspaceId);
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
        if (settings?.agentMode === "FILTER") {
          return new Response(JSON.stringify({ error: "Agent is currently in FILTER mode and cannot schedule jobs." }), { status: 403 })
        }
        const deals = await getDeals(workspaceId);
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
    const MAX_HISTORY_MESSAGES = 20;
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

    const multiJobInstruction = useMultiJobFlow
      ? `\n\nMULTIPLE JOBS — CRITICAL: The user has pasted multiple jobs in one message. You MUST process them ONE AT A TIME. First call showJobDraftForConfirmation with ONLY the first job's details (clientName, workDescription, price, address, schedule, phone, email). Then say clearly: "This is the first one. Confirm and I'll create it, then we'll do the next." Do NOT call createJobNatural until the user has confirmed. After the user confirms (e.g. "confirm", "ok", "yes", "done"), call createJobNatural for that job, then call showJobDraftForConfirmation for the NEXT job. Repeat until all jobs are done.`
      : "";

    let toolCallsMs = 0;
    const tools = instrumentToolsWithLatency(
      getAgentTools(workspaceId, settings, userId),
      (toolName, durationMs) => {
        toolCallsMs += durationMs;
        recordLatencyMetric(`chat.web.tool.${toolName}_ms`, durationMs);
      },
    );
    const llmStartedAt = nowMs();
    const result = streamText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: `You are Travis, a concise CRM assistant for tradies. Keep responses SHORT and punchy — tradies are busy. No essays. Use "jobs" not "meetings".
${multiJobInstruction}
${knowledgeBaseStr}
${agentModeStr}
${workingHoursStr}
${agentScriptStr}
${allowedTimesStr}
${preferencesStr}
${pricingRulesStr}
${bouncerStr}
${memoryContextStr}

MESSAGING RULES — CRITICAL:
1. When the user says "message X", "text X", "tell X", "send X a message" — IMMEDIATELY call the sendSms tool. Do NOT ask for confirmation. Just send it.
2. Send EXACTLY what the user says. Never refuse to send a message because it's "not professional" or informal. If the user says "tell Jody JK NVM", send "JK NVM".
3. Keep conversation context. If the user mentions a person's name, and later says "message her" or "text him", use the most recently discussed person.
4. After sending, briefly confirm: "✅ Sent to [Name]: \"[message]\"" — format the message in quotes so it stands out.
5. Never rewrite or "improve" the user's message content unless explicitly asked to.
6. Always check the output of the previous tool. If it contains a SYSTEM_CONTEXT_SIGNAL, follow that instruction for the immediate next turn.

IMPORTANT: You have access to tools for checking the schedule, job history, finances, and client details. If a user asks a question you don't have the answer to in your immediate context, USE THE TOOLS. Do not guess. Always call the appropriate tool to retrieve real data before answering.

UNCERTAINTY & ERROR HANDLING — CRITICAL:
When you don't understand, aren't sure, or encounter problems, follow these rules:

1. UNCLEAR INTENT: If you don't understand what the user wants, say: "I'm not sure what you'd like me to do. Could you clarify? For example, you could say 'Schedule a job for John tomorrow' or 'Show me this week's jobs'."

2. AMBIGUOUS COMMAND: If a request could mean multiple things, ask for clarification: "I can interpret this a few ways:
• Option 1: [interpretation]
• Option 2: [interpretation]  
Which did you mean?"

3. MISSING INFORMATION: If you need more details to complete a task: "To [do action], I need a bit more info:
• [missing info 1]
• [missing info 2]
Could you provide these?"

4. CONTACT NAME MISMATCH: If you can't find a contact, the tools will suggest similar names. Never return blank responses.

5. OUT OF SCOPE: If the user asks for something you can't do: "I can't [do specific thing], but I can help you with [related things I can do]. Would any of those work?"

6. TECHNICAL ERRORS: If a tool fails: "I ran into an issue [brief description]. This might be because [possible reason]. Want to try again, or should I log this for support?"

7. VAGUE REQUESTS: If the request is too vague: "I want to help, but I need more specifics. Could you tell me [what you need to know]?"

8. ALWAYS RESPOND: Never return empty/blank responses. Always provide helpful guidance even when uncertain.
9. DATA RETRIEVAL FAILURE: If tools return no data: "I checked [what you checked] but didn't find [what you expected]. This could mean [possible explanations]. What would you like to do?"

10. USER_ROLE: ${userRole}. DATA CORRECTIONS (manager-only): Only OWNER and MANAGER can confirm changes to data (revenue, job/customer details). If USER_ROLE is TEAM_MEMBER: when the user says something is wrong (e.g. "I made $200 in February"), do NOT offer to update it. Say: "Only your team manager or owner can update that. Ask them to make the change or to confirm it." If USER_ROLE is OWNER or MANAGER: when the user says data is wrong, offer to update it and say they can confirm by typing **confirm** (or "ok", "agree", "yes", or any positive reply) or by clicking the Confirm button. Then call the showConfirmationCard tool with a short summary (e.g. "Update February revenue to $200") so the user sees a Confirm button. When the user replies with "confirm", "ok", "agree", "yes", or any clear positive affirmation, call recordManualRevenue. Only call recordManualRevenue after the user has confirmed.

TOOLS — DATA RETRIEVAL (use these to look up information on demand):
- getSchedule: Fetches jobs for a date range. ALWAYS call this when the user asks about their schedule, availability, or upcoming/past appointments. Also use before scheduling new jobs to check for conflicts and nearby jobs for smart routing.
- searchJobHistory: Search past jobs by keyword (client name, address, description). Use for "When did I last visit X?", "Jobs at Y address", or any historical question.
- getFinancialReport: Revenue, job counts, and completion rates for a date range. Use for "How much did I earn?", "Monthly revenue?", "How many jobs this quarter?"
- showConfirmationCard: Show a Confirm/Cancel button for a data change. Call when you offer to update data so the user can click Confirm or type ok/agree/yes/confirm.
- recordManualRevenue: Record revenue for a period. Call ONLY after the user has confirmed (typed confirm, ok, agree, yes, or clicked Confirm).
- getClientContext: Full client profile — contact info, recent jobs, notes, messages. Use for "Tell me about X", "What's the history with Y?", or before contacting a client.
- getTodaySummary: PREPARATION-FOCUSED daily briefing. Returns today's jobs with readiness checks (missing address, no phone, unassigned, unconfirmed, deposit not paid, materials needed). Use for "What's on today?", "Morning brief", "Am I ready?". CRITICAL: When presenting results, LEAD with preparation alerts (e.g. "Heads up: 2 jobs need attention before you head out") and list specific issues so the tradie can fix them. Then show the schedule.
- getAvailability: Check available time slots on a specific day. Use for "Am I free on Tuesday?", "What slots are open next Monday?", "When can I fit in a job?"
- getConversationHistory: Retrieve text/call/email history with a specific contact.
- createNotification: Create a scheduled notification or reminder alert.
- updateAiPreferences: Save a permanent behavioral rule. Use when the user gives a lasting instruction like "From now on, always add a 1 hour buffer" or "Remember I don't work past 3pm on Fridays". Also use when the user says "Stop taking jobs for X" — prefix with [HARD_CONSTRAINT] to strictly decline or [FLAG_ONLY] to just flag.
- addAgentFlag: Add a private triage warning to a deal. Use when you have concerns about a lead (far distance, tire-kicker, risky) but it does NOT match a hard No-Go rule. The flag appears on the owner's dashboard.
- undoLastAction: Undo the most recent action. Use when the user says "Undo that" or "Revert the last change".
- assignTeamMember: Assign a team member to a job. Use when the user says "Assign Dave to the Henderson job" or "Put Sarah on the plumbing repair".
- contactSupport: Create a support ticket when the user asks for help, reports issues, or needs assistance.

MULTI-JOB FOLLOW-UP — CRITICAL: When the user replies with "Next" or "next job please" in a thread where a job draft was shown ("first one" or "one at a time"), you MUST call the showJobDraftForConfirmation tool with the NEXT job's details (clientName, workDescription, price, address, schedule, phone, email from the user's original message). Do NOT output the job as plain text or bullet points (e.g. "* Client: Bob * Work: ..."). The user must see a draft CARD with Confirm/Cancel buttons. Call the tool, then you may add one short line like "Here's the next one — confirm or cancel." Do NOT call createJobNatural for the job they just confirmed or cancelled; only call showJobDraftForConfirmation for the next job. Repeat until all jobs are shown as draft cards.

After any tool, briefly confirm in a friendly way. If a tool fails, say so and suggest what to try. Never return empty responses.`,
      messages: modelMessages as any,
      tools,
      stopWhen: stepCountIs(getAdaptiveMaxSteps(content)),
      onFinish: async ({ text }) => {
        const llmPhaseMs = nowMs() - llmStartedAt;
        const modelMs = Math.max(0, llmPhaseMs - toolCallsMs);
        const totalMs = nowMs() - requestStartedAt;
        recordLatencyMetric("chat.web.preprocessing_ms", preprocessingMs);
        recordLatencyMetric("chat.web.tool_calls_ms", toolCallsMs);
        recordLatencyMetric("chat.web.model_ms", modelMs);
        recordLatencyMetric("chat.web.total_ms", totalMs);

        // === STEP B: "The Learning" (Post-Generation Memory Storage) ===
        console.log(`[Mem0] Starting memory storage...`);

        const memClientForStorage = getMemoryClient();
        if (!memClientForStorage) {
          console.log(`[Mem0] Memory client not available for storage`);
          return;
        }

        try {
          // Create the message pair for Mem0
          const messagesForMem0 = [
            { role: "user" as const, content: lastMessageContent },
            { role: "assistant" as const, content: text },
          ];

          // Store in Mem0 asynchronously (non-blocking)
          memClientForStorage.add(messagesForMem0, {
            user_id: userId,
            metadata: {
              timestamp: new Date().toISOString(),
              source: "chat",
              workspaceId: workspaceId,
            },
          }).then(() => {
            console.log(`[Mem0] Successfully saved interaction`);
          }).catch((error) => {
            console.error("[Mem0] Error saving interaction:", error);
          });

          // Note: Not awaiting to avoid blocking the response
        } catch (error) {
          console.error("[Mem0] Error in memory storage:", error);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: message.includes("GEMINI") || message.includes("API") ? "AI service error. Please try again." : message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
