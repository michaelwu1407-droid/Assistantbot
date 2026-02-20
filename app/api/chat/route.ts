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
} from "@/actions/chat-actions";
import { getDeals } from "@/actions/deal-actions";
import { getWorkspaceSettings } from "@/actions/settings-actions";
import { parseJobOneLiner, buildJobDraftFromParams } from "@/lib/chat-utils";

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
        const settings = await getWorkspaceSettings();
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
    // if ANY message in the history contains an empty string without tool calls.
    modelMessages = modelMessages.filter((msg: any) => {
      if (msg.role === "system") return true;
      const msgHasText = typeof msg.content === "string"
        ? msg.content.trim().length > 0
        : Array.isArray(msg.content) && msg.content.length > 0;
      const msgHasTools = (msg.toolInvocations?.length > 0) || (msg.toolCalls?.length > 0);
      // Assistant responses must have content or a tool activity to be valid.
      return msgHasText || msgHasTools;
    });

    const settings = await getWorkspaceSettings();
    const deals = await getDeals(workspaceId);

    // Build context strings
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

    let glossaryStr = "";

    const nextWeekTimestamp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime();
    const futureJobs = deals.filter(d => d.scheduledAt && new Date(d.scheduledAt).getTime() > Date.now() && new Date(d.scheduledAt).getTime() < nextWeekTimestamp);
    let scheduleStr = "";
    if (futureJobs.length > 0) {
      scheduleStr = "\nUPCOMING SCHEDULE OVER NEXT 7 DAYS (Use this for Smart Geolocation Routing within ~15km radius):\n" + futureJobs.map(d => `- ${d.title} for ${d.contactName} at ${new Date(d.scheduledAt!).toLocaleString()} (${d.address || 'No address'})`).join("\n");
      scheduleStr += "\nSMART ROUTING RULES: When the user requests to schedule a non-urgent job, check the schedule above. If a job exists within the next 7 days in a nearby location, strongly suggest logically scheduling adjacent to it to minimise travel time.";
    }

    const result = streamText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: `You are a helpful CRM assistant. You manage deals, jobs, and pipeline stages.
${agentModeStr}
${workingHoursStr}
${preferencesStr}
${pricingRulesStr}
${glossaryStr}
${scheduleStr}

TOOLS:
- listDeals: Call when the user asks to see deals, pipeline, jobs, or what they have. Use it to get exact deal names before moving or describing.
- moveDeal: Move a deal to another stage. Use the deal's title (from listDeals if needed) and target stage (e.g. completed, quoted, scheduled, in progress, new request, deleted).
- createDeal: Create a new deal. Needs title; optional company/client name and value. Creates or finds a contact by company name.
- createJobNatural: Create a job from full details: clientName, workDescription, price; optional address and schedule. USE THIS whenever the user sends a single message that describes a job: a person/client name, what work is needed, and optionally address, time, and price. Examples: "Sally at 12 Wyndham St Alexandria needs her sink fixed tomorrow at 2pm. $200 price agreed" or "Sharon from 17 Alexandria St needs sink fixed quoted $200 for tomorrow 2pm". You MUST call createJobNatural with the extracted clientName, workDescription, price, and if mentioned address and schedule—do not only acknowledge. If they mention a date or time (e.g. tomorrow 2pm), always pass it in the schedule parameter so the job is created in the Scheduled column.
- proposeReschedule: When the user wants to propose a different time for an existing job (e.g. after seeing a clash warning, or "let's propose 3pm instead", "propose scheduling at Tuesday 10am"), call this with the job title and the new proposed time. It logs the proposed time on the job, adds a note, and creates a follow-up task to contact the customer to confirm.
- updateInvoiceAmount: Modifies the final invoiced amount for a job, independent of the initial quote/value. Use when a user says "Invoice John for $300" or "Change the final invoice for Kitchen Reno to $500".
- logActivity: Record a call, meeting, note, or email explicitly. e.g "Log that I called John", "Note: client was unhappy".
- createTask: Create a reminder or to-do task. e.g "Remind me tomorrow to order pipes", "Schedule a task to check up on Mary".
- searchContacts: Look up people or companies in the database CRM.
- createContact: Add a new person or company to the database CRM explicitly.

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
            "Create a job from a one-liner: extract clientName, workDescription, price; optional address and schedule. REQUIRED when the user pastes a single message describing a job (person + work + optional address/time/price). Always pass schedule when a date or time is mentioned so the job goes to the Scheduled column.",
          inputSchema: z.object({
            clientName: z.string().describe("Client name"),
            workDescription: z.string().describe("What work is needed"),
            price: z.number().describe("Price in dollars"),
            address: z.string().optional().describe("Address"),
            schedule: z.string().optional().describe("When e.g. tomorrow 2pm"),
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
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Something went wrong",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
