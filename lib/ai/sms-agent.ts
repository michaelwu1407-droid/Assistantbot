import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

export async function generateSMSResponse(
  interactionId: string,
  userMessage: string,
  workspaceId: string
): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY for SMS agent");
    return "Thanks for your message! Someone will get back to you shortly.";
  }

  // Fetch workspace settings for agent context
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      agentMode: true,
      workingHoursStart: true,
      workingHoursEnd: true,
      aiPreferences: true,
      callOutFee: true,
    },
  });

  // Fetch recent conversation history for this interaction
  const recentMessages = await db.chatMessage.findMany({
    where: { workspaceId, metadata: { path: ["activityId"], equals: interactionId } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { role: true, content: true },
  });

  const historyStr = recentMessages
    .reverse()
    .map((m) => `${m.role === "user" ? "Customer" : "You"}: ${m.content}`)
    .join("\n");

  const agentMode = workspace?.agentMode ?? "ORGANIZE";
  const businessName = workspace?.name ?? "our business";
  const hours = `${workspace?.workingHoursStart ?? "08:00"} to ${workspace?.workingHoursEnd ?? "17:00"}`;
  const callOutFee = workspace?.callOutFee ? Number(workspace.callOutFee) : 0;
  const preferences = workspace?.aiPreferences ?? "";

  // Fetch glossary
  const repairItems = await db.repairItem.findMany({
    where: { workspaceId },
    select: { title: true, description: true },
  });
  let glossaryStr = "\n\nGLOSSARY OF APPROVED PRICES:\n";
  if (repairItems.length > 0) {
    glossaryStr += repairItems.map(item => `- ${item.title}: ${item.description || 'No pricing specified'}`).join("\n");
  } else {
    glossaryStr += "(Empty - No approved standard prices exist. Do not quote specific prices for any task.)";
  }

  let modeInstruction = "";
  if (agentMode === "EXECUTE") {
    modeInstruction =
      "You have full autonomy. You may schedule jobs, confirm appointments, and take action directly on behalf of the business.";
  } else if (agentMode === "ORGANIZE") {
    modeInstruction =
      "You are in liaison mode. Collect information, propose options, but always tell the customer that the business owner will confirm. Do not commit to specific times or pricing without saying it needs confirmation.";
  } else {
    modeInstruction =
      "You are a receptionist only. Collect the customer's details and what they need, then let them know someone will be in touch. Do NOT schedule, quote, or make any commitments.";
  }

  const systemPrompt = `You are the AI SMS assistant for ${businessName}. You are texting a customer on behalf of the business.

RULES:
- Keep responses SHORT (1-3 sentences max). This is SMS, not email.
- Be friendly, professional, and helpful.
- Business hours: ${hours}.
- ${modeInstruction}
- PRICING HARD BRAKE: NEVER agree on a final price for custom work. ONLY quote a specific price if the exact requested work exists in the GLOSSARY OF APPROVED PRICES below. If it is NOT in the glossary, you MUST state that a firm quote requires an on-site assessment and mention the standard call-out fee is $${callOutFee}. Do not hallucinate or estimate prices.
${glossaryStr}
${preferences ? `\nBUSINESS PREFERENCES:\n${preferences}` : ""}

${historyStr ? `RECENT CONVERSATION:\n${historyStr}\n` : ""}
Customer's latest message: ${userMessage}

Reply as the business SMS assistant. Keep it brief and natural.`;

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      prompt: systemPrompt,
      maxOutputTokens: 200,
    });
    const text = result.text?.trim();
    if (text) return text;
  } catch (error) {
    console.error("SMS Gemini error:", error);
  }

  // Fallback if Gemini fails
  return `Thanks for your message! Someone from ${businessName} will get back to you shortly.`;
}
