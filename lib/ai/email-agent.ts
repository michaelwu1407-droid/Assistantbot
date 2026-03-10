import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { buildCustomerEmailSystemPrompt } from "@/lib/ai/prompt-contract";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

/**
 * Processes an incoming email using Gemini to generate a contextual reply.
 *
 * Implements lead triage logic:
 * - Analyses the email to determine if this is a genuine lead or a low-quality enquiry
 * - For genuine leads: drafts a helpful, professional response
 * - For tire kickers: drafts a polite but brief response to filter them out
 * - Returns null if no reply should be sent (e.g. spam, auto-reply, newsletter)
 */
export async function processIncomingEmailWithGemini(opts: {
  workspaceId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  contactId?: string;
  dealId?: string;
  isFirstReplyForContact?: boolean;
}): Promise<{ reply: string; isGenuineLead: boolean } | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    console.error("[email-agent] Missing GEMINI_API_KEY");
    return null;
  }

  const workspace = await db.workspace.findUnique({
    where: { id: opts.workspaceId },
    select: {
      name: true,
      agentMode: true,
      workingHoursStart: true,
      workingHoursEnd: true,
      aiPreferences: true,
      callOutFee: true,
      industryType: true,
    },
  });

  if (!workspace) {
    console.error("[email-agent] Workspace not found:", opts.workspaceId);
    return null;
  }

  let recentHistory = "";
  if (opts.contactId) {
    const recentActivities = await db.activity.findMany({
      where: { contactId: opts.contactId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { type: true, title: true, content: true, createdAt: true },
    });

    if (recentActivities.length > 0) {
      recentHistory = recentActivities
        .reverse()
        .map((activity) => `[${activity.type}] ${activity.title}: ${(activity.content ?? "").substring(0, 200)}`)
        .join("\n");
    }
  }

  const businessName = workspace.name ?? "our business";
  const hours = `${workspace.workingHoursStart ?? "08:00"} to ${workspace.workingHoursEnd ?? "17:00"}`;
  const callOutFee = workspace.callOutFee ? Number(workspace.callOutFee) : 0;
  const preferences = workspace.aiPreferences ?? "";
  const industry = workspace.industryType === "REAL_ESTATE" ? "real estate" : "trades";

  const systemPrompt = buildCustomerEmailSystemPrompt({
    businessName,
    industry,
    hours,
    callOutFee,
    firstReplyShouldIntroduceAi: opts.isFirstReplyForContact ?? false,
    modeRaw: workspace.agentMode,
    preferences,
    recentHistory,
    senderName: opts.senderName,
    senderEmail: opts.senderEmail,
    subject: opts.subject,
    body: opts.body,
  });

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      prompt: systemPrompt,
      maxOutputTokens: 500,
    });

    const text = result.text?.trim();
    if (!text || text === "NO_REPLY") return null;

    const firstNewline = text.indexOf("\n");
    if (firstNewline === -1) return null;

    const classificationLine = text.substring(0, firstNewline).trim();
    const reply = text.substring(firstNewline + 1).trim();

    if (!reply) return null;

    const isGenuineLead = classificationLine.toUpperCase().startsWith("GENUINE");

    return { reply, isGenuineLead };
  } catch (error) {
    console.error("[email-agent] Gemini error:", error);
    return null;
  }
}
