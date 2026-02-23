import { streamText, convertToModelMessages, tool, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
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
import { parseJobOneLiner, buildJobDraftFromParams } from "@/lib/chat-utils";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cost-effective Gemini model for chat + tools */
const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

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

    const parsed = parseJobOneLiner(content);
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
            const time = t.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
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
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: "Here's what I got — edit anything before confirming." });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "tool-input-available", toolCallId, toolName: "showJobDraft", input: {} });
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

    // Build context strings (static workspace settings only — no data stuffing)
    const agentModeStr = settings?.agentMode === "EXECUTE"
      ? "\nAGENT OVERRIDE MODE: EXECUTE. You have full autonomy. Calculate the price based on standard glossary pricing below. If no exact match, make an educated estimate. You may execute creation, moving, scheduling, or proposing of jobs directly based on smart geolocation."
      : settings?.agentMode === "ORGANIZE"
        ? "\nAGENT OVERRIDE MODE: ORGANIZE. You are operating as a liaison. Always wait for user approvals or confirmations. You should propose times to the customer, but rely on the UX 'Draft' cards for final user confirmation."
        : "\nAGENT OVERRIDE MODE: FILTER. You are a screening receptionist ONLY. Extract information, but DO NOT schedule, propose times, or provide pricing. Tell the user you will pass their details on.";

    const workingHoursStr = `\nWORKING HOURS: Your company working hours are strictly ${settings?.workingHoursStart || "08:00"} to ${settings?.workingHoursEnd || "17:00"}. DO NOT SCHEDULE jobs outside of this window.`;

    const preferencesStr = settings?.aiPreferences
      ? `\nUSER PREFERENCES (Follow these strictly):\n${settings.aiPreferences}`
      : "";

    const callOutFee = settings?.callOutFee || 0;
    const pricingRulesStr = `\nSTRICT PRICING RULES:
1. NEVER agree on a final price immediately UNLESS it is an EXACT match for a task in the Glossary below.
2. Focus heavily on locking down the booking/assessment first.
3. If asked for general pricing, quote the standard Call-Out Fee of $${callOutFee}. You can say something like "Our standard call-out fee is $${callOutFee} which covers the assessment, then we can give you a firm quote."
4. If the user requests a common task that exists in the Glossary, you may quote that specific price range instead of the call-out fee.`;

    const result = streamText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: `You are Travis, a concise CRM assistant for tradies. Keep responses SHORT and punchy — tradies are busy. No essays. Use "jobs" not "meetings".
${knowledgeBaseStr}
${agentModeStr}
${workingHoursStr}
${preferencesStr}
${pricingRulesStr}

IMPORTANT: You have access to tools for checking the schedule, job history, finances, and client details. If a user asks a question you don't have the answer to in your immediate context, USE THE TOOLS. Do not guess. Always call the appropriate tool to retrieve real data before answering.

TOOLS — DATA RETRIEVAL (use these to look up information on demand):
- getSchedule: Fetches jobs for a date range. ALWAYS call this when the user asks about their schedule, availability, or upcoming/past appointments. Also use before scheduling new jobs to check for conflicts and suggest smart geolocation routing (group nearby jobs).
- searchJobHistory: Search past jobs by keyword (client name, address, description). Use for "When did I last visit X?", "Jobs at Y address", or any historical question.
- getFinancialReport: Revenue, job counts, and completion rates for a date range. Use for "How much did I earn?", "Monthly revenue?", "How many jobs this quarter?".
- getClientContext: Full client profile — contact info, recent jobs, notes, messages. Use for "Tell me about X", "What's the history with Y?", or before contacting a client.
- getTodaySummary: Quick snapshot of today's jobs, overdue tasks, and message count. Use for "What's on today?", "Give me my daily summary", "Morning brief".
- getAvailability: Check available time slots on a specific day. Use for "Am I free on Tuesday?", "What slots are open next Monday?", "When can I fit in a job?".

TOOLS — CRM ACTIONS:
- listDeals: Call when the user asks to see deals, pipeline, jobs, or what they have. Use it to get exact deal names before moving or describing.
- moveDeal: Move a deal to a different stage. Use the deal's title (from listDeals if needed) and target stage (e.g. completed, quoted, scheduled, in progress, new request, deleted).
- createDeal: Create a new deal. Needs title; optional company/client name and value. Creates or finds a contact by company name.
- createJobNatural: Create a job from full details: clientName, workDescription, price; optional address and schedule. USE THIS whenever the user sends a single message that describes a job: a person/client name, what work is needed, and optionally address, time, and price. IMPORTANT: Before creating a scheduled job, call getSchedule first to check for conflicts and nearby jobs for smart routing.
- proposeReschedule: When the user wants to propose a different time for an existing job (e.g. after a clash warning, or "let's propose 3pm instead", "propose scheduling at Tuesday 10am"), call this with the job title and the new proposed time.
- updateInvoiceAmount: Modifies the final invoiced amount for a job. Use when a user says "Invoice John for $300".

TOOLS — COMMUNICATION & LOGGING:
- logActivity: Record a call, job site visit, note, or email explicitly. e.g "Log that I called John", "Note: client was unhappy".
- createTask: Create a reminder or to-do task. e.g "Remind me tomorrow to order pipes", "Schedule a task to check up on Mary".
- searchContacts: Look up people or companies in the database CRM.
- createContact: Add a new person or company to the database CRM explicitly.
- sendSms: Send an SMS text message to a contact. Use when the user says "Text Steven I'm on my way" or "Send Steven a message saying we'll be there at 3".
- sendEmail: Send an email to a contact. Use when the user says "Email Mary the quote".
- makeCall: Initiate an outbound phone call to a contact via the AI voice agent.
- getConversationHistory: Retrieve text/call/email history with a specific contact.
- createNotification: Create a scheduled notification or reminder alert.
- updateAiPreferences: Save a permanent behavioral rule. Use when the user gives a lasting instruction like "From now on, always add a 1 hour buffer" or "Remember I don't work past 3pm on Fridays".
- undoLastAction: Undo the most recent action. Use when the user says "Undo that" or "Revert the last change".

After any tool, briefly confirm in a friendly way. If a tool fails, say so and suggest what to try.`,
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
