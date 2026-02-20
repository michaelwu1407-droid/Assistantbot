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
} from "@/actions/chat-actions";
import { getDeals } from "@/actions/deal-actions";
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
    if (content && content.trim().length > 0) {
      const lastMsg = modelMessages[modelMessages.length - 1] as { role?: string; content?: string | unknown[] };
      const lastContent = lastMsg?.content;
      const lastHasParts =
        typeof lastContent === "string"
          ? lastContent.trim().length > 0
          : Array.isArray(lastContent) && lastContent.some((p: unknown) => typeof p === "object" && p !== null && "text" in (p as object) && String((p as { text?: string }).text).trim().length > 0);
      if (lastMsg?.role === "user" && !lastHasParts) {
        modelMessages = [...modelMessages.slice(0, -1), { role: "user", content }];
      }
    }

    const result = streamText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: `You are a helpful CRM assistant. You manage deals, jobs, and pipeline stages.

TOOLS:
- listDeals: Call when the user asks to see deals, pipeline, jobs, or what they have. Use it to get exact deal names before moving or describing.
- moveDeal: Move a deal to another stage. Use the deal's title (from listDeals if needed) and target stage (e.g. completed, quoted, scheduled, in progress, new request, deleted).
- createDeal: Create a new deal. Needs title; optional company/client name and value. Creates or finds a contact by company name.
- createJobNatural: Create a job from full details: clientName, workDescription, price; optional address and schedule. USE THIS whenever the user sends a single message that describes a job: a person/client name, what work is needed, and optionally address, time, and price. Examples: "Sally at 12 Wyndham St Alexandria needs her sink fixed tomorrow at 2pm. $200 price agreed" or "Sharon from 17 Alexandria St needs sink fixed quoted $200 for tomorrow 2pm". You MUST call createJobNatural with the extracted clientName, workDescription, price, and if mentioned address and schedule—do not only acknowledge. If they mention a date or time (e.g. tomorrow 2pm), always pass it in the schedule parameter so the job is created in the Scheduled column.
- proposeReschedule: When the user wants to propose a different time for an existing job (e.g. after seeing a clash warning, or "let's propose 3pm instead", "propose scheduling at Tuesday 10am"), call this with the job title and the new proposed time. It logs the proposed time on the job, adds a note, and creates a follow-up task to contact the customer to confirm.

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
