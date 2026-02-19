import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import {
  runMoveDeal,
  runListDeals,
  runCreateDeal,
  runCreateJobNatural,
  saveUserMessage,
} from "@/actions/chat-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cost-effective Gemini model for chat + tools */
const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const workspaceId = body.workspaceId ?? body.data?.workspaceId ?? "";

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

    // Persist the latest user message (non-blocking)
    const lastUser = messages.filter((m: { role: string }) => m.role === "user").pop();
    if (lastUser?.parts?.some((p: { type: string }) => p.type === "text")) {
      const textPart = lastUser.parts.find((p: { type: string }) => p.type === "text");
      const content = textPart?.text ?? "";
      if (content.trim()) saveUserMessage(workspaceId, content).catch(() => {});
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const result = streamText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: `You are a helpful CRM assistant. You manage deals, jobs, and pipeline stages.

TOOLS:
- listDeals: Call this when the user asks to see their deals, pipeline, jobs, or what they have. Use it to know exact deal names before moving or describing them.
- moveDeal: Move a deal to a different stage. Use the deal's title (from listDeals if needed) and target stage (e.g. completed, quoted, scheduled, in progress, new request, deleted).
- createDeal: Create a new deal. Need title; optional company/client name and value. Creates or finds a contact by company name.
- createJobNatural: Create a job from full details: clientName, workDescription, price; optional address and schedule. Use when the user gives a one-liner like "Sharon from 17 Alexandria St needs sink fixed quoted $200 for tomorrow 2pm".

After any tool, briefly confirm in a friendly way. If a tool fails, say so and suggest what to try.`,
      messages: await convertToModelMessages(messages),
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
            "Create a job from full details: client name, work description, price; optional address and schedule. Use when user gives a one-liner like 'Sharon from 17 Alexandria St needs sink fixed quoted $200 for tomorrow 2pm'.",
          inputSchema: z.object({
            clientName: z.string().describe("Client name"),
            workDescription: z.string().describe("What work is needed"),
            price: z.number().describe("Price in dollars"),
            address: z.string().optional().describe("Address"),
            schedule: z.string().optional().describe("When e.g. tomorrow 2pm"),
          }),
          execute: async (params) => runCreateJobNatural(workspaceId, params),
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
