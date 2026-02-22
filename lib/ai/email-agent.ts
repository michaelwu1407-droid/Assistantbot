import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

/**
 * Processes an incoming email using Gemini to generate a contextual reply.
 *
 * Implements "Tire Kicker" filter logic:
 * - Analyses the email to determine if this is a genuine lead or a low-quality enquiry
 * - For genuine leads: drafts a helpful, professional response
 * - For tire kickers: drafts a polite but brief response to filter them out
 * - Returns null if no reply should be sent (e.g., spam, auto-reply, newsletter)
 */
export async function processIncomingEmailWithGemini(opts: {
  workspaceId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  contactId?: string;
  dealId?: string;
}): Promise<{ reply: string; isGenuineLead: boolean } | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    console.error("[email-agent] Missing GEMINI_API_KEY");
    return null;
  }

  // Fetch workspace context for personalised responses
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

  // Fetch recent activity history with this contact for context
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
        .map(
          (a) =>
            `[${a.type}] ${a.title}: ${(a.content ?? "").substring(0, 200)}`
        )
        .join("\n");
    }
  }

  const businessName = workspace.name ?? "our business";
  const hours = `${workspace.workingHoursStart ?? "08:00"} to ${workspace.workingHoursEnd ?? "17:00"}`;
  const callOutFee = workspace.callOutFee ? Number(workspace.callOutFee) : 0;
  const preferences = workspace.aiPreferences ?? "";
  const industry =
    workspace.industryType === "REAL_ESTATE" ? "real estate" : "trades";

  // Determine agent autonomy level
  let modeInstruction = "";
  if (workspace.agentMode === "EXECUTE") {
    modeInstruction =
      "You have full autonomy. You may schedule jobs, confirm appointments, and take action directly.";
  } else if (workspace.agentMode === "ORGANIZE") {
    modeInstruction =
      "You are in liaison mode. Collect information, propose options, but tell the customer the business owner will confirm. Do not commit to times or pricing.";
  } else {
    modeInstruction =
      "You are a receptionist only. Collect the customer's details and what they need, then let them know someone will be in touch. Do NOT schedule, quote, or make any commitments.";
  }

  const systemPrompt = `You are the AI email assistant for "${businessName}", a ${industry} business.
You are replying to an incoming email from a potential customer.

## TIRE KICKER FILTER
First, analyse the email to determine the lead quality:
- GENUINE LEAD: Specific request, mentions a real problem/need, provides some details, asks about availability/pricing
- TIRE KICKER: Vague enquiry, just "how much?", no details about what they need, unrealistic expectations, clearly shopping around with no intent

## RESPONSE RULES
- Write a professional, warm email reply (3-6 sentences)
- For GENUINE leads: Be helpful, acknowledge their specific need, and guide next steps
- For TIRE KICKERS: Be polite but brief; ask them to provide more details about their specific needs before you can help
- NEVER agree on a final price. ${callOutFee > 0 ? `Mention the standard call-out fee of $${callOutFee} if relevant.` : ""}
- Business hours: ${hours}
- ${modeInstruction}
- Do NOT include a subject line — just write the email body
- Do NOT include email headers or signatures — the system adds those automatically
- If the email appears to be spam, an auto-reply, or a newsletter, respond with exactly: NO_REPLY
${preferences ? `\nBUSINESS PREFERENCES:\n${preferences}` : ""}
${recentHistory ? `\nRECENT INTERACTION HISTORY WITH THIS CONTACT:\n${recentHistory}` : ""}

## INCOMING EMAIL
From: ${opts.senderName} <${opts.senderEmail}>
Subject: ${opts.subject}
Body:
${opts.body}

## YOUR RESPONSE FORMAT
Start your response with either GENUINE: or TIRE_KICKER: on the first line, then write the email body on subsequent lines.`;

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      prompt: systemPrompt,
      maxOutputTokens: 500,
    });

    const text = result.text?.trim();
    if (!text || text === "NO_REPLY") return null;

    // Parse the response: first line is classification, rest is the reply
    const firstNewline = text.indexOf("\n");
    if (firstNewline === -1) return null;

    const classificationLine = text.substring(0, firstNewline).trim();
    const reply = text.substring(firstNewline + 1).trim();

    if (!reply) return null;

    const isGenuineLead = classificationLine
      .toUpperCase()
      .startsWith("GENUINE");

    return { reply, isGenuineLead };
  } catch (error) {
    console.error("[email-agent] Gemini error:", error);
    return null;
  }
}
