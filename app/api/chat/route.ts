import { streamText, convertToModelMessages, tool, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { MemoryClient } from "mem0ai";
import {
  runMoveDeal,
  runListDeals,
  runCreateDeal,
  runCreateJobNatural,
  runProposeReschedule,
  saveUserMessage,
  runUpdateInvoiceAmount,
  runUpdateAiPreferences,
  runLogActivity,
  runCreateTask,
  runSearchContacts,
  runCreateContact,
  runSendSms,
  runSendEmail,
  runMakeCall,
  runGetConversationHistory,
  runCreateScheduledNotification,
  runUndoLastAction,
  runAssignTeamMember,
  handleSupportRequest,
  recordManualRevenue,
} from "@/actions/chat-actions";
import {
  runGetSchedule,
  runSearchJobHistory,
  runGetFinancialReport,
  runGetClientContext,
  runGetTodaySummary,
  runGetAvailability,
} from "@/actions/agent-tools";
import { getDeals } from "@/actions/deal-actions";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { buildJobDraftFromParams } from "@/lib/chat-utils";
import { parseJobWithAI, parseMultipleJobsWithAI, extractAllJobsFromParagraph } from "@/lib/ai/job-parser";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cost-effective Gemini model for chat + tools */
const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

// Lazy initialization of Mem0 Memory Client
let memoryClient: MemoryClient | null = null;

function getMemoryClient(): MemoryClient | null {
  if (!memoryClient && process.env.MEM0_API_KEY) {
    try {
      // Dynamic import to avoid SSR issues
      const { MemoryClient } = require("mem0ai");
      memoryClient = new MemoryClient({
        apiKey: process.env.MEM0_API_KEY,
      });
      console.log("[Mem0] Memory client initialized successfully");
    } catch (error) {
      console.error("[Mem0] Failed to initialize memory client:", error);
      return null;
    }
  }
  return memoryClient;
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

    if (content) saveUserMessage(workspaceId, content).catch(() => { });

    // "Next" in multi-job flow: find original multi-job message in history and return the next job's draft card (no AI)
    const isNextMessage = /^\s*next\s*(job)?\s*(please)?\s*$/i.test(content.trim()) || content.trim().toLowerCase() === "next";
    if (isNextMessage && Array.isArray(messages) && messages.length >= 2) {
      const getMessageText = (m: { role?: string; parts?: { type?: string; text?: string }[]; content?: string }) => {
        if (m?.role !== "user") return "";
        const textPart = m.parts?.find((p: { type?: string }) => p.type === "text");
        return (textPart as { text?: string } | undefined)?.text ?? (typeof (m as { content?: string }).content === "string" ? (m as { content: string }).content : "") ?? "";
      };
      let jobsFromHistory: Awaited<ReturnType<typeof parseMultipleJobsWithAI>> = null;
      let multiJobMessageIndex = -1;
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i] as { role?: string; parts?: { type?: string; text?: string }[]; content?: string };
        const text = getMessageText(msg).trim();
        if (!text) continue;
        const parsed = await parseMultipleJobsWithAI(text);
        if (parsed && parsed.length >= 2) {
          jobsFromHistory = parsed;
          multiJobMessageIndex = i;
          break;
        }
      }
      if (jobsFromHistory && multiJobMessageIndex >= 0) {
        let nextCount = 0;
        for (let i = multiJobMessageIndex + 1; i < messages.length; i++) {
          const msg = messages[i] as { role?: string; parts?: { type?: string; text?: string }[]; content?: string };
          if (msg?.role !== "user") continue;
          const text = getMessageText(msg).trim().toLowerCase();
          if (text === "next" || /^next\s*(job)?\s*(please)?\s*$/.test(text)) nextCount++;
        }
        if (nextCount < jobsFromHistory.length) {
          const jobIndex = nextCount;
          const nextJob = jobsFromHistory[jobIndex];
          const draft = buildJobDraftFromParams(nextJob) as ReturnType<typeof buildJobDraftFromParams> & { warnings?: string[] };
          draft.warnings = [];
          try {
            const settings = await getWorkspaceSettingsById(workspaceId);
            if (settings?.agentMode === "FILTER") {
              return new Response(JSON.stringify({ error: "Agent is currently in FILTER mode and cannot schedule jobs." }), { status: 403 });
            }
            const deals = await getDeals(workspaceId);
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
          } catch {
            // ignore
          }
          const multiJobRemaining = jobIndex < jobsFromHistory.length - 1;
          const textId = "text-multi-next";
          const toolCallId = `showJobDraft-multi-${jobIndex + 1}`;
          const toolInput = { clientName: draft.clientName ?? "", workDescription: draft.workDescription ?? "Job", price: Number(String(draft.price).replace(/,/g, "")) || 0, address: draft.address || undefined, schedule: draft.rawSchedule || undefined, phone: draft.phone || undefined, email: draft.email || undefined };
          const stream = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: "start" });
              writer.write({ type: "text-start", id: textId });
              writer.write({ type: "text-delta", id: textId, delta: multiJobRemaining ? "Here's the next one — edit if needed, then confirm or cancel." : "Here's the last one — edit if needed, then confirm." });
              writer.write({ type: "text-end", id: textId });
              writer.write({ type: "tool-input-available", toolCallId, toolName: "showJobDraftForConfirmation", input: toolInput });
              writer.write({ type: "tool-output-available", toolCallId, output: { draft, multiJobRemaining } });
              writer.write({ type: "finish" });
            },
          });
          return createUIMessageStreamResponse({ stream });
        }
      }
    }

    // One extraction call: works for natural language, dashed list, or mixed. No dependency on " - ".
    const extractedJobs = await extractAllJobsFromParagraph(content);
    const multipleJobs = extractedJobs.length >= 2 ? extractedJobs : null;
    const useMultiJobFlow = multipleJobs !== null;
    const singleJobFromParagraph = extractedJobs.length === 1 ? extractedJobs[0] : null;

    if (useMultiJobFlow && multipleJobs && multipleJobs.length >= 2) {
      // Return first job as a proper draft card so the UI shows Confirm/Cancel (not AI text).
      const first = multipleJobs[0];
      const draft = buildJobDraftFromParams(first) as ReturnType<typeof buildJobDraftFromParams> & { warnings?: string[] };
      draft.warnings = [];
      try {
        const settings = await getWorkspaceSettingsById(workspaceId);
        if (settings?.agentMode === "FILTER") {
          return new Response(JSON.stringify({ error: "Agent is currently in FILTER mode and cannot schedule jobs." }), { status: 403 });
        }
        const deals = await getDeals(workspaceId);
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
          const fmt = (d: { title?: string; contactName?: string; scheduledAt: Date }) => {
            const t = new Date(d.scheduledAt);
            return `${(d.title || d.contactName || "Job").trim()} at ${t.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })}`;
          };
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
      } catch {
        // ignore
      }
      const textId = "text-multi-draft";
      const toolCallId = "showJobDraft-multi-1";
      const toolInput = { clientName: draft.clientName ?? "", workDescription: draft.workDescription ?? "Job", price: Number(String(draft.price).replace(/,/g, "")) || 0, address: draft.address || undefined, schedule: draft.rawSchedule || undefined, phone: draft.phone || undefined, email: draft.email || undefined };
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: "I'll process these one at a time. Here's the first one — edit if needed, then confirm and I'll create it and move to the next." });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "tool-input-available", toolCallId, toolName: "showJobDraftForConfirmation", input: toolInput });
          writer.write({ type: "tool-output-available", toolCallId, output: { draft, multiJobRemaining: true } });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

    const parsed = useMultiJobFlow ? null : (singleJobFromParagraph ?? await parseJobWithAI(content));
    if (parsed) {
      // One-liner: return a draft card for confirmation; do not create the job until user confirms.
      const draft = buildJobDraftFromParams(parsed) as ReturnType<typeof buildJobDraftFromParams> & { warnings?: string[] };
      draft.warnings = [];
      try {
        const settings = await getWorkspaceSettingsById(workspaceId);
        if (settings?.agentMode === "FILTER") {
          return new Response(JSON.stringify({ error: "Agent is currently in FILTER mode and cannot schedule jobs." }), { status: 403 })
        }

        const deals = await getDeals(workspaceId);
        // Minimum gap between jobs (minutes). Show which appointments are before/after so the user can decide.
        const MIN_GAP_MINUTES = 60;
        const minGapMs = MIN_GAP_MINUTES * 60 * 1000;
        if (draft.scheduleISO) {
          const draftTime = new Date(draft.scheduleISO).getTime();
          const withTime = deals.filter((d): d is typeof d & { scheduledAt: NonNullable<typeof d.scheduledAt> } =>
            !!d.scheduledAt && Math.abs(new Date(d.scheduledAt).getTime() - draftTime) < minGapMs
          );
          const before = withTime
            .filter((d) => new Date(d.scheduledAt).getTime() < draftTime)
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
          const after = withTime
            .filter((d) => new Date(d.scheduledAt).getTime() > draftTime)
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
          const fmt = (d: { title?: string; contactName?: string; scheduledAt: Date }) => {
            const t = new Date(d.scheduledAt);
            const time = t.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
            const label = (d.title || d.contactName || "Job").trim();
            return `${label} at ${time}`;
          };
          if (before.length > 0 || after.length > 0) {
            const beforeStr = before.length > 0 ? fmt(before[0]) + " beforehand" : "";
            const afterStr = after.length > 0 ? fmt(after[0]) + " after" : "";
            const parts = [beforeStr, afterStr].filter(Boolean);
            draft.warnings.push("You have " + parts.join(" and ") + ". Check if that’s too tight.");
          }
        }
        const first = (draft.clientName ?? "").split(/\s+/)[0]?.toLowerCase() ?? "";
        const descLower = (draft.workDescription ?? "").toLowerCase();
        const hasDuplicate = deals.some((d) => {
          const name = (d.contactName ?? "").toLowerCase();
          const title = (d.title ?? "").toLowerCase();
          if (!first || !name.includes(first)) return false;
          if (descLower && (title.includes(descLower) || descLower.includes(title))) return true;
          if (title && descLower && (title.includes("plumb") && descLower.includes("plumb"))) return true;
          return false;
        });
        if (hasDuplicate) draft.warnings.push("A similar job may already exist for this client.");
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
          writer.write({ type: "text-delta", id: textId, delta: "Here's what I got — edit anything before confirming." });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "tool-input-available", toolCallId, toolName: "showJobDraftForConfirmation", input: toolInput });
          writer.write({ type: "tool-output-available", toolCallId, output: { draft } });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

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
          writer.write({ type: "text-delta", id: textId, delta: "I didn't quite catch that. Could you please provide more details?" });
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
          writer.write({ type: "text-delta", id: textId, delta: "I didn't quite catch that. Could you rephrase?" });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

    const settings = await getWorkspaceSettingsById(workspaceId);

    // Resolve current user's role in this workspace (for data-correction / manager-only rules)
    let userRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" = "TEAM_MEMBER";
    try {
      const authUser = await getAuthUser();
      if (authUser?.email) {
        const dbUser = await db.user.findFirst({
          where: { workspaceId, email: authUser.email },
          select: { role: true },
        });
        if (dbUser?.role) userRole = dbUser.role as "OWNER" | "MANAGER" | "TEAM_MEMBER";
      }
    } catch {
      // default TEAM_MEMBER so only managers can confirm data changes
    }
    const isManager = userRole === "OWNER" || userRole === "MANAGER";

    // Keep BusinessProfile and WorkspaceSettings in system prompt (small & static)
    const workspaceInfo = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, location: true, twilioPhoneNumber: true },
    });
    let businessProfile: { tradeType: string; website: string | null; baseSuburb: string; serviceRadius: number; standardWorkHours: string; emergencyService: boolean; emergencySurcharge: number | null } | null = null;
    try {
      businessProfile = await db.businessProfile.findFirst({
        where: { user: { workspaceId } },
        select: { tradeType: true, website: true, baseSuburb: true, serviceRadius: true, standardWorkHours: true, emergencyService: true, emergencySurcharge: true },
      });
    } catch {
      // BusinessProfile table may not exist yet if migration hasn't been run
    }

    let knowledgeBaseStr = "\nBUSINESS IDENTITY:";
    if (workspaceInfo?.name) knowledgeBaseStr += `\n- Business Name: ${workspaceInfo.name}`;
    if (workspaceInfo?.location) knowledgeBaseStr += `\n- Service Area: ${workspaceInfo.location}`;
    if (workspaceInfo?.twilioPhoneNumber) knowledgeBaseStr += `\n- Business Phone: ${workspaceInfo.twilioPhoneNumber}`;
    if (businessProfile) {
      if (businessProfile.tradeType) knowledgeBaseStr += `\n- Trade: ${businessProfile.tradeType}`;
      if (businessProfile.website) knowledgeBaseStr += `\n- Website: ${businessProfile.website}`;
      if (businessProfile.baseSuburb) knowledgeBaseStr += `\n- Base Location: ${businessProfile.baseSuburb}`;
      if (businessProfile.serviceRadius) knowledgeBaseStr += `\n- Service Radius: ${businessProfile.serviceRadius}km`;
      if (businessProfile.standardWorkHours) knowledgeBaseStr += `\n- Standard Hours: ${businessProfile.standardWorkHours}`;
      if (businessProfile.emergencyService) knowledgeBaseStr += `\n- Emergency Service: Available${businessProfile.emergencySurcharge ? ` (+$${businessProfile.emergencySurcharge} surcharge)` : ""}`;
    }
    knowledgeBaseStr += "\nUse this information when texting, calling, or emailing customers on behalf of the business. Always represent the business professionally.";
    knowledgeBaseStr += "\nOn incoming voice calls, Travis (the voice agent) can transfer callers to the tradie's mobile if they ask to speak to the human; the tradie's number is stored in the app profile.";

    // Build context strings (static workspace settings only — no data stuffing)
    const agentModeStr = settings?.agentMode === "EXECUTE"
      ? "\nAGENT OVERRIDE MODE: EXECUTE. You have full autonomy. Calculate the price based on standard glossary pricing below. If no exact match, make an educated estimate. You may execute creation, moving, scheduling, or proposing of jobs directly based on smart geolocation."
      : settings?.agentMode === "ORGANIZE"
        ? "\nAGENT OVERRIDE MODE: ORGANIZE. You are operating as a liaison. Always wait for user approvals or confirmations. You should propose times to the customer, but rely on the UX 'Draft' cards for final user confirmation."
        : "\nAGENT OVERRIDE MODE: FILTER. You are a screening receptionist ONLY. Extract information, but DO NOT schedule, propose times, or provide pricing. Tell the user you will pass their details on.";

    const workingHoursStr = `\nWORKING HOURS: Your company working hours are strictly ${settings?.workingHoursStart || "08:00"} to ${settings?.workingHoursEnd || "17:00"}. DO NOT SCHEDULE jobs outside of this window.`;

    const businessName = (settings as { agentBusinessName?: string })?.agentBusinessName?.trim() || workspaceInfo?.name || "this business";
    const openingMsg = (settings as { agentOpeningMessage?: string })?.agentOpeningMessage?.trim();
    const closingMsg = (settings as { agentClosingMessage?: string })?.agentClosingMessage?.trim();
    const defaultOpening = `Hi I'm Travis, the AI assistant for ${businessName}`;
    const defaultClosing = `Kind regards, Travis (AI assistant for ${businessName})`;
    const parts: string[] = [];
    if (openingMsg) {
      parts.push(`\nAGENT INTRODUCTION (customers only): When YOU contact a CUSTOMER (SMS, email, or call to them — not in this dashboard chat), START with this exact opening (or very close): "${openingMsg}". Do NOT use this when replying in the dashboard chat to the business owner.`);
    } else {
      parts.push(`\nAGENT INTRODUCTION (customers only): When YOU contact a CUSTOMER (SMS, email, or call to them — not in this dashboard chat), START with: "${defaultOpening}". Do NOT use this when replying in the dashboard chat to the business owner.`);
    }
    if (closingMsg) {
      parts.push(`\nAGENT SIGN-OFF (customers only): When YOU contact a CUSTOMER, END messages with this exact sign-off (or very close): "${closingMsg}". Do NOT use this sign-off when replying in the dashboard chat to the business owner.`);
    } else {
      parts.push(`\nAGENT SIGN-OFF (customers only): When YOU contact a CUSTOMER, END with: "${defaultClosing}". Do NOT use this sign-off when replying in the dashboard chat to the business owner.`);
    }
    const agentScriptStr = parts.join("");

    const textStart = (settings as { textAllowedStart?: string })?.textAllowedStart ?? "08:00";
    const textEnd = (settings as { textAllowedEnd?: string })?.textAllowedEnd ?? "20:00";
    const callStart = (settings as { callAllowedStart?: string })?.callAllowedStart ?? "08:00";
    const callEnd = (settings as { callAllowedEnd?: string })?.callAllowedEnd ?? "20:00";
    const allowedTimesStr = `\nALLOWED TIMES: Only send texts between ${textStart} and ${textEnd} (local time). Only place outbound calls between ${callStart} and ${callEnd}. If the user asks to message or call outside these windows, say you're outside contact hours and will do it during the allowed window.`;

    const preferencesStr = settings?.aiPreferences
      ? `\nUSER PREFERENCES (Follow these strictly):\n${settings.aiPreferences}`
      : "";

    const callOutFee = settings?.callOutFee || 0;
    const pricingRulesStr = `\nSTRICT PRICING RULES:
1. NEVER agree on a final price immediately UNLESS it is an EXACT match for a task in the Glossary below.
2. Focus heavily on locking down the booking/assessment first.
3. If asked for general pricing, quote the standard Call-Out Fee of $${callOutFee}. You can say something like "Our standard call-out fee is $${callOutFee} which covers the assessment, then we can give you a firm quote."
4. If the user requests a common task that exists in the Glossary, you may quote that specific price range instead of the call-out fee.`;

    // === STEP A: "The Recall" (Pre-Generation Memory Search) ===
    console.log(`[Mem0] Starting memory recall for workspace: ${workspaceId}`);
    
    // Extract user ID from headers or use workspaceId as fallback
    const userId = req.headers.get("x-user-id") || workspaceId;
    console.log(`[Mem0] User ID: ${userId}`);
    
    // Get the last user message for memory search
    const lastUserMessage = messages.filter((m: { role?: string }) => m.role === "user").pop();
    const lastMessageContent = lastUserMessage?.content || "";
    console.log(`[Mem0] Last message: "${lastMessageContent.substring(0, 50)}..."`);
    
    let memoryContextStr = "";
    const memClient = getMemoryClient();
    
    if (memClient && lastMessageContent) {
      try {
        console.log(`[Mem0] Searching for relevant memories...`);
        const searchResults = await memClient.search(lastMessageContent, {
          user_id: userId,
          limit: 5,
        });
        
        console.log(`[Mem0] Found ${searchResults.length} memories`);
        
        if (searchResults.length > 0) {
          const facts = searchResults.map((memory: any, index: number) => {
            console.log(`[Mem0] Memory ${index + 1}: ${memory.memory}`);
            return `- ${memory.memory}`;
          }).join("\n");
          
          memoryContextStr = `\n\n[[RELEVANT MEMORY CONTEXT]]\nThe following facts are retrieved from previous conversations with this user:\n${facts}\n[[END MEMORY CONTEXT]]\n\nUse these facts to personalize your response.`;
        } else {
          console.log(`[Mem0] No relevant memories found`);
          memoryContextStr = `\n\n[[RELEVANT MEMORY CONTEXT]]\nNo previous context found for this query.\n[[END MEMORY CONTEXT]]`;
        }
      } catch (error) {
        console.error("[Mem0] Error searching memories:", error);
        memoryContextStr = `\n\n[[RELEVANT MEMORY CONTEXT]]\nUnable to retrieve memories at this time.\n[[END MEMORY CONTEXT]]`;
      }
    } else {
      console.log(`[Mem0] Memory client not available or no message content`);
      memoryContextStr = "";
    }
    
    console.log(`[Mem0] Memory context prepared, proceeding to stream generation`);

    const multiJobInstruction = useMultiJobFlow
      ? `\n\nMULTIPLE JOBS — CRITICAL: The user has pasted multiple jobs in one message. You MUST process them ONE AT A TIME. First call showJobDraftForConfirmation with ONLY the first job's details (clientName, workDescription, price, address, schedule, phone, email). Then say clearly: "This is the first one. Confirm and I'll create it, then we'll do the next." Do NOT call createJobNatural until the user has confirmed. After the user confirms (e.g. "confirm", "ok", "yes", "done"), call createJobNatural for that job, then call showJobDraftForConfirmation for the NEXT job. Repeat until all jobs are done.`
      : "";

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
${memoryContextStr}

MESSAGING RULES — CRITICAL:
1. When the user says "message X", "text X", "tell X", "send X a message" — IMMEDIATELY call the sendSms tool. Do NOT ask for confirmation. Just send it.
2. Send EXACTLY what the user says. Never refuse to send a message because it's "not professional" or informal. If the user says "tell Jody JK NVM", send "JK NVM".
3. Keep conversation context. If the user mentions a person's name, and later says "message her" or "text him", use the most recently discussed person.
4. After sending, briefly confirm: "✅ Sent to [Name]: \"[message]\"" — format the message in quotes so it stands out.
5. Never rewrite or "improve" the user's message content unless explicitly asked to.

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
- getTodaySummary: Quick snapshot of today's jobs, overdue tasks, and message count. Use for "What's on today?", "Give me my daily summary", "Morning brief".
- getAvailability: Check available time slots on a specific day. Use for "Am I free on Tuesday?", "What slots are open next Monday?", "When can I fit in a job?"
- getConversationHistory: Retrieve text/call/email history with a specific contact.
- createNotification: Create a scheduled notification or reminder alert.
- updateAiPreferences: Save a permanent behavioral rule. Use when the user gives a lasting instruction like "From now on, always add a 1 hour buffer" or "Remember I don't work past 3pm on Fridays".
- undoLastAction: Undo the most recent action. Use when the user says "Undo that" or "Revert the last change".
- assignTeamMember: Assign a team member to a job. Use when the user says "Assign Dave to the Henderson job" or "Put Sarah on the plumbing repair".
- contactSupport: Create a support ticket when the user asks for help, reports issues, or needs assistance.

MULTI-JOB FOLLOW-UP — CRITICAL: When the user replies with "Next" or "next job please" in a thread where a job draft was shown ("first one" or "one at a time"), you MUST call the showJobDraftForConfirmation tool with the NEXT job's details (clientName, workDescription, price, address, schedule, phone, email from the user's original message). Do NOT output the job as plain text or bullet points (e.g. "* Client: Bob * Work: ..."). The user must see a draft CARD with Confirm/Cancel buttons. Call the tool, then you may add one short line like "Here's the next one — confirm or cancel." Do NOT call createJobNatural for the job they just confirmed or cancelled; only call showJobDraftForConfirmation for the next job. Repeat until all jobs are shown as draft cards.

After any tool, briefly confirm in a friendly way. If a tool fails, say so and suggest what to try. Never return empty responses.`,
      messages: modelMessages as any,
      tools: {
        listDeals: tool({
          description:
            "List all deals/jobs in the pipeline. Use when the user asks to see deals, pipeline, jobs, or what they have. Returns id, title, stage, value for each deal.",
          inputSchema: z.object({}),
          execute: async () => runListDeals(workspaceId),
        }),
        moveDeal: tool({
          description:
            "Move a deal to a different stage. Use deal title (from listDeals if unsure) and target stage: completed, quoted, scheduled, in progress, new request, pipeline, ready to invoice, deleted.",
          inputSchema: z.object({
            dealTitle: z.string().describe("Name/title of the deal or job to move"),
            newStage: z.string().describe("Target stage name"),
          }),
          execute: async ({ dealTitle, newStage }) =>
            runMoveDeal(workspaceId, dealTitle.trim(), newStage.trim()),
        }),
        createDeal: tool({
          description:
            "Create a new deal. Requires title; optional company/client name and value (number).",
          inputSchema: z.object({
            title: z.string().describe("Deal or job title"),
            company: z.string().optional().describe("Client or company name"),
            value: z.number().optional().describe("Deal value in dollars"),
          }),
          execute: async ({ title, company, value }) =>
            runCreateDeal(workspaceId, { title, company, value }),
        }),
        createJobNatural: tool({
          description:
            "Create a job from a one-liner: extract clientName, workDescription, price; optional address, schedule, phone, email. REQUIRED when the user pastes a single message describing a job (person + work + optional address/time/price/phone). Always extract the client's phone number if included. Always pass schedule when a date or time is mentioned so the job goes to the Scheduled column.",
          inputSchema: z.object({
            clientName: z.string().describe("Client full name (first and last)"),
            workDescription: z.string().describe("What work is needed"),
            price: z.number().describe("Price in dollars"),
            address: z.string().optional().describe("Street address for the job"),
            schedule: z.string().optional().describe("When e.g. tomorrow 2pm"),
            phone: z.string().optional().describe("Client phone number if provided (e.g. 0434955958 or +61434955958)"),
            email: z.string().optional().describe("Client email if provided"),
          }),
          execute: async (params) => runCreateJobNatural(workspaceId, params),
        }),
        showJobDraftForConfirmation: tool({
          description:
            "REQUIRED when showing any job in a multi-job flow. Shows a draft CARD with Confirm/Cancel buttons — the user must see this card, not a text description. When the user says 'Next' or you are showing the 2nd, 3rd, etc. job from their list: call this tool with that job's clientName, workDescription, price, address, schedule, phone, email (extract from the user's original message). Do NOT reply with bullet points like '* Client: X * Work: Y' — that is wrong. Always call this tool so the UI displays the draft card. After the user confirms the card, they will send 'Next' and you call this tool again for the next job.",
          inputSchema: z.object({
            clientName: z.string().describe("Client full name (first and last)"),
            workDescription: z.string().describe("What work is needed"),
            price: z.number().describe("Price in dollars"),
            address: z.string().optional().describe("Street address for the job"),
            schedule: z.string().optional().describe("When e.g. tomorrow 2pm"),
            phone: z.string().optional().describe("Client phone number if provided"),
            email: z.string().optional().describe("Client email if provided"),
          }),
          execute: async (params) => {
            const draft = buildJobDraftFromParams({
              clientName: params.clientName,
              workDescription: params.workDescription,
              price: params.price,
              address: params.address,
              schedule: params.schedule,
              phone: params.phone,
              email: params.email,
            });
            return { draft };
          },
        }),
        proposeReschedule: tool({
          description:
            "Propose a new time for an existing job. Use when the user says to propose a different time (e.g. after a clash warning, or 'let's schedule at 3pm instead'). Logs the proposed time, adds a note, and creates a task to contact the customer to confirm.",
          inputSchema: z.object({
            dealTitle: z.string().describe("Job/deal title (e.g. Plumbing Replacement, or the client/job name)"),
            proposedSchedule: z.string().describe("The new proposed time, e.g. tomorrow 3pm, Tuesday 10am"),
          }),
          execute: async ({ dealTitle, proposedSchedule }) =>
            runProposeReschedule(workspaceId, { dealTitle, proposedSchedule }),
        }),
        updateInvoiceAmount: tool({
          description: "Update the final invoiced amount for a job. Use this when the user mentions invoicing a job or changing the invoice amount.",
          inputSchema: z.object({
            dealTitle: z.string().describe("Job/deal title to invoice"),
            amount: z.number().describe("The final invoiced amount as a number"),
          }),
          execute: async ({ dealTitle, amount }) =>
            runUpdateInvoiceAmount(workspaceId, { dealTitle, amount }),
        }),
        updateAiPreferences: tool({
          description: "Use this when the user gives you a permanent instruction about how you should behave, quote, or schedule in the future (e.g., 'From now on, always add a 1 hour buffer', 'Remember I dont work past 3pm on Fridays').",
          inputSchema: z.object({
            rule: z.string().describe("The specific behavioral rule to save permanently in your memory bank."),
          }),
          execute: async ({ rule }) => runUpdateAiPreferences(workspaceId, rule),
        }),
        logActivity: tool({
          description: "Record a call, meeting, note, or email explicitly. Use when the user says 'Log a call with John' or 'Note down that the pipe was broken'.",
          inputSchema: z.object({
            type: z.enum(["CALL", "EMAIL", "NOTE", "MEETING", "TASK"]).describe("The type of activity to record"),
            content: z.string().describe("What happened or what the note is about"),
          }),
          execute: async ({ type, content }) => runLogActivity({ type, content }),
        }),
        createTask: tool({
          description: "Create a reminder or to-do task. Use when the user says 'Remind me tomorrow to order pipes' or 'Task: check up on Mary'.",
          inputSchema: z.object({
            title: z.string().describe("The name or title of the task"),
            dueAtISO: z.string().optional().describe("ISO date string for when the task is due. Default is tomorrow 9am if omitted."),
            description: z.string().optional().describe("Optional extra details about the task"),
          }),
          execute: async (params) => runCreateTask(params),
        }),
        searchContacts: tool({
          description: "Look up people or companies in the database CRM. Use when the user asks 'Find John Doe' or 'Search my contacts for Acme Corp'.",
          inputSchema: z.object({
            query: z.string().describe("The name or keyword to search for"),
          }),
          execute: async ({ query }) => runSearchContacts(workspaceId, query),
        }),
        createContact: tool({
          description: "Add a new person or company to the database CRM explicitly.",
          inputSchema: z.object({
            name: z.string().describe("The contact's full name or company name"),
            email: z.string().optional().describe("The contact's email address"),
            phone: z.string().optional().describe("The contact's phone number"),
          }),
          execute: async (params) => runCreateContact(workspaceId, params),
        }),
        sendSms: tool({
          description: "Send an SMS text message to a contact. Use when the user says 'Text Steven I'm on my way' or 'Send a message to Mary saying we'll be there at 3pm'. Finds the contact by name and sends via their phone number.",
          inputSchema: z.object({
            contactName: z.string().describe("Name of the contact to text"),
            message: z.string().describe("The SMS message to send"),
          }),
          execute: async ({ contactName, message }) =>
            runSendSms(workspaceId, { contactName, message }),
        }),
        sendEmail: tool({
          description: "Send an email to a contact. Use when the user says 'Email Mary the quote' or 'Send John an email confirming his appointment'. Finds the contact by name and uses their email address.",
          inputSchema: z.object({
            contactName: z.string().describe("Name of the contact to email"),
            subject: z.string().describe("Email subject line"),
            body: z.string().describe("Email body content"),
          }),
          execute: async ({ contactName, subject, body }) =>
            runSendEmail(workspaceId, { contactName, subject, body }),
        }),
        makeCall: tool({
          description: "Initiate an outbound phone call to a contact via the AI voice agent (Retell AI). Use when the user says 'Call John', 'Ring Mary about the quote', or 'Phone Steven to confirm'. The AI voice agent will handle the conversation.",
          inputSchema: z.object({
            contactName: z.string().describe("Name of the contact to call"),
            purpose: z.string().optional().describe("Brief purpose of the call, e.g. 'confirm appointment for Thursday' or 'follow up on quote'"),
          }),
          execute: async ({ contactName, purpose }) =>
            runMakeCall(workspaceId, { contactName, purpose }),
        }),
        getConversationHistory: tool({
          description: "Retrieve text/call/email history with a specific contact. Use when the user asks 'Show me my texts with Steven' or 'What's my history with Mary?' or 'Show me my conversation with John'.",
          inputSchema: z.object({
            contactName: z.string().describe("Name of the contact to look up history for"),
            limit: z.number().optional().describe("How many recent items to return (default 20)"),
          }),
          execute: async ({ contactName, limit }) =>
            runGetConversationHistory(workspaceId, { contactName, limit }),
        }),
        createNotification: tool({
          description: "Create a scheduled notification or reminder alert. Use when the user says 'Notify me 2 days before Wendy's job' or 'Alert me Friday if John hasn't responded' or 'Remind me to follow up with the plumber'.",
          inputSchema: z.object({
            title: z.string().describe("Short notification title"),
            message: z.string().describe("Notification details/body"),
            scheduledAtISO: z.string().optional().describe("ISO date for when to trigger (e.g. 2026-02-25T09:00:00). Omit for immediate."),
            link: z.string().optional().describe("Optional URL to navigate to when clicked"),
          }),
          execute: async (params) =>
            runCreateScheduledNotification(workspaceId, params),
        }),
        undoLastAction: tool({
          description: "Undo the most recent action. Use when the user says 'Undo that', 'Revert', 'Take that back', or 'Oops undo'. Reverses the last deal creation, stage move, or other reversible action.",
          inputSchema: z.object({}),
          execute: async () => runUndoLastAction(workspaceId),
        }),
        assignTeamMember: tool({
          description: "Assign a team member to a job/deal. Use when the user says 'Assign Dave to the Henderson job', 'Put Sarah on the plumbing repair', or 'Give the roof job to Mike'. Fuzzy-matches both the job title and team member name.",
          inputSchema: z.object({
            dealTitle: z.string().describe("The job/deal title or description to assign"),
            teamMemberName: z.string().describe("The team member's name (or email) to assign the job to"),
          }),
          execute: async ({ dealTitle, teamMemberName }) =>
            runAssignTeamMember(workspaceId, { dealTitle, teamMemberName }),
        }),
        contactSupport: tool({
          description: "Create a support ticket when the user asks for help, reports issues, or needs assistance. Use for phrases like 'I need help', 'support', 'contact support', 'something is broken', 'phone number not working', 'billing issue', etc. Automatically categorizes and prioritizes the request.",
          inputSchema: z.object({
            message: z.string().describe("The user's support request or issue description"),
          }),
          execute: async ({ message }) => {
            const { getAuthUserId } = await import("@/lib/auth");
            const userId = await getAuthUserId();
            if (!userId) return "Unable to identify user for support request.";
            return handleSupportRequest(message, userId, workspaceId);
          },
        }),

        // ─── Phase 2: Just-in-Time Retrieval Tools ──────────────────────
        getSchedule: tool({
          description: "Fetches scheduled jobs for a specific date range. Use this when the user asks 'What am I doing next week?', 'Do I have space on Tuesday?', 'What's my schedule for March?', or any question about upcoming or past appointments. Also use before scheduling new jobs to check for conflicts and nearby jobs for smart geolocation routing.",
          inputSchema: z.object({
            startDate: z.string().describe("Start of date range as ISO string (e.g. 2026-02-21T00:00:00)"),
            endDate: z.string().describe("End of date range as ISO string (e.g. 2026-02-28T23:59:59)"),
          }),
          execute: async ({ startDate, endDate }) =>
            runGetSchedule(workspaceId, { startDate, endDate }),
        }),
        searchJobHistory: tool({
          description: "Searches for past jobs (completed, cancelled, or any status) based on keywords. Use for queries like 'When was the last time I visited Mrs. Jones?', 'Jobs at 10 Henderson St', 'Have I done work for Acme Corp before?', or any question about past job history.",
          inputSchema: z.object({
            query: z.string().describe("Search keywords — client name, address, or job description"),
            limit: z.number().optional().describe("Max results to return (default 5)"),
          }),
          execute: async ({ query, limit }) =>
            runSearchJobHistory(workspaceId, { query, limit }),
        }),
        getFinancialReport: tool({
          description: "Calculates revenue, job count, and completion rates for a date range. Use when the user asks 'How much did I earn this month?', 'What's my revenue for February?', 'How many jobs did I complete last quarter?', or any financial/performance question.",
          inputSchema: z.object({
            startDate: z.string().describe("Start of date range as ISO string"),
            endDate: z.string().describe("End of date range as ISO string"),
          }),
          execute: async ({ startDate, endDate }) =>
            runGetFinancialReport(workspaceId, { startDate, endDate }),
        }),
        showConfirmationCard: tool({
          description: "Show a Confirm button so the user can approve a data change (e.g. update revenue). Call this when you offer to update data and want the user to confirm. Pass a short summary of what will change.",
          inputSchema: z.object({
            summary: z.string().describe("Short summary of the change, e.g. 'Update February revenue to $200'"),
          }),
          execute: async ({ summary }) => ({ showConfirmButton: true, summary }),
        }),
        recordManualRevenue: tool({
          description: "Record manual revenue for a period. Call ONLY after the user has confirmed (typed 'confirm', 'ok', 'agree', 'yes', or clicked Confirm). Use the amount and date range the user originally gave.",
          inputSchema: z.object({
            amount: z.number().describe("Revenue amount in dollars"),
            startDate: z.string().describe("Start of period as ISO string (e.g. 2026-02-01T00:00:00)"),
            endDate: z.string().describe("End of period as ISO string (e.g. 2026-02-28T23:59:59)"),
          }),
          execute: async ({ amount, startDate, endDate }) =>
            recordManualRevenue(workspaceId, { amount, startDate, endDate }),
        }),
        getClientContext: tool({
          description: "Fetches a complete profile for a specific client: their contact info, recent jobs, notes, and message history. Use when the user asks 'Tell me about Mrs. Jones', 'What's the history with John Smith?', 'Pull up Steven's details', or needs context about a client before a call/visit.",
          inputSchema: z.object({
            clientName: z.string().describe("The client name to look up (fuzzy matched)"),
          }),
          execute: async ({ clientName }) =>
            runGetClientContext(workspaceId, { clientName }),
        }),
        getTodaySummary: tool({
          description: "Quick snapshot of today's scheduled jobs, overdue tasks, and recent message count. Use for 'What's on today?', 'Give me my daily summary', 'Morning brief', or when the user opens the chat without a specific question.",
          inputSchema: z.object({}),
          execute: async () => runGetTodaySummary(workspaceId),
        }),
        getAvailability: tool({
          description: "Check available time slots on a specific date given existing scheduled jobs and working hours. Use for 'Am I free on Tuesday?', 'What slots are open next Monday?', 'When can I fit in a job this week?'.",
          inputSchema: z.object({
            date: z.string().describe("The target date as ISO string (e.g. 2026-02-25)"),
          }),
          execute: async ({ date }) =>
            runGetAvailability(workspaceId, {
              date,
              workingHoursStart: settings?.workingHoursStart || "08:00",
              workingHoursEnd: settings?.workingHoursEnd || "17:00",
            }),
        }),
      },
      stopWhen: stepCountIs(5),
      onFinish: async ({ text }) => {
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
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
