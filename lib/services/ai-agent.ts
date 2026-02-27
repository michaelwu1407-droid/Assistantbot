import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { buildAgentContext, fetchMemoryContext } from "@/lib/ai/context";
import { getAgentTools } from "@/lib/ai/tools";
import { saveUserMessage } from "@/actions/chat-actions";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

/**
 * Processes a command received from a user via the WhatsApp Assistant (Headless UI).
 * 
 * @param userId - The ID of the authenticated Earlymark user.
 * @param message - The raw text message sent by the user.
 * @returns The text response to be sent back to the user via WhatsApp.
 */
export async function processAgentCommand(userId: string, message: string): Promise<string> {
    try {
        console.log("AI Agent processing:", message, "from user:", userId);

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { workspaceId: true }
        });

        if (!user || !user.workspaceId) {
            return "Error: Could not find your Earlymark workspace. Please contact support.";
        }

        const workspaceId = user.workspaceId;

        // Save incoming message to chat history for dashboard visibility
        await saveUserMessage(workspaceId, message).catch(() => { });

        // Build context and tools
        const {
            settings,
            knowledgeBaseStr,
            agentModeStr,
            workingHoursStr,
            agentScriptStr,
            allowedTimesStr,
            preferencesStr,
            pricingRulesStr
        } = await buildAgentContext(workspaceId, userId);

        const memoryContextStr = await fetchMemoryContext(userId, message);

        const systemPrompt = `You are Travis, a concise CRM assistant for tradies. Keep responses SHORT and punchy — tradies are busy. No essays. Use "jobs" not "meetings".
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
2. After sending, briefly confirm: "✅ Sent to [Name]: \"[message]\"" — format the message in quotes so it stands out.
3. Keep conversation context. If the user mentions a person's name, and later says "message her" or "text him", use the most recently discussed person.

IMPORTANT: You have access to tools for checking the schedule, job history, finances, and client details. If a user asks a question you don't have the answer to in your immediate context, USE THE TOOLS. Do not guess.

UNCERTAINTY & ERROR HANDLING — CRITICAL:
When you don't understand, aren't sure, or encounter problems, follow these rules:
1. NEVER guess or make up a command.
2. Tell the user clearly what went wrong (e.g. "I can't find a job with that name" or "I'm not sure what you mean by 'flibbertigibbet'").
3. Suggest a corrective action (e.g. "Did you mean the plumbing job?" or "Try saying 'Create job for [Name]'").`;

        const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            console.error("Missing Gemini API Key");
            return "Internal Error: AI service configuration is missing.";
        }

        const google = createGoogleGenerativeAI({ apiKey });

        const result = await generateText({
            model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
            system: systemPrompt,
            prompt: message,
            tools: getAgentTools(workspaceId, settings, userId),
            // @ts-ignore - Some versions of AI SDK declare this outside CallSettings
            maxSteps: 5,
        });

        // Optionally save Assistant's reply
        if (result.text) {
            // Webhook mode: we won't log the assistant reply directly into the UI chat to keep it clean, or handled by webhook logging.
        }

        return result.text;
    } catch (error) {
        console.error("Error in processAgentCommand:", error);
        return "I encountered an error trying to process your request. Please try again or contact support if the issue persists.";
    }
}
