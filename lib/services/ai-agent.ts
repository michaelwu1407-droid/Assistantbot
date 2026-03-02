import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { buildAgentContext, fetchMemoryContext } from "@/lib/ai/context";
import { getAgentTools } from "@/lib/ai/tools";
import { saveUserMessage } from "@/actions/chat-actions";
import { instrumentToolsWithLatency, nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

function shouldIncludeHistoricalPricing(text: string): boolean {
    return /\b(price|pricing|quote|quoted|cost|how much|rate|fee|invoice)\b/i.test(text) || /\$/.test(text);
}

function shouldFetchMemory(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (trimmed.split(/\s+/).length <= 2) return false;
    if (/^(ok|okay|thanks|thank you|yes|no|done|next|confirm|cancel)\b/i.test(trimmed)) return false;
    return true;
}

function getAdaptiveMaxSteps(text: string): number {
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) return 2;
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

/**
 * Processes a command received from a user via the WhatsApp Assistant (Headless UI).
 * 
 * @param userId - The ID of the authenticated Earlymark user.
 * @param message - The raw text message sent by the user.
 * @returns The text response to be sent back to the user via WhatsApp.
 */
export async function processAgentCommand(userId: string, message: string): Promise<string> {
    const requestStartedAt = nowMs();
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
        const preprocessingStartedAt = nowMs();

        const includeHistoricalPricing = shouldIncludeHistoricalPricing(message);
        const shouldGetMemory = shouldFetchMemory(message);

        const [agentContext, memoryContextStr] = await Promise.all([
            buildAgentContext(workspaceId, userId, { includeHistoricalPricing }),
            shouldGetMemory
                ? withTimeout(fetchMemoryContext(userId, message), 700, "")
                : Promise.resolve(""),
        ]);

        const {
            settings,
            knowledgeBaseStr,
            agentModeStr,
            workingHoursStr,
            agentScriptStr,
            allowedTimesStr,
            preferencesStr,
            pricingRulesStr
        } = agentContext;
        const preprocessingMs = nowMs() - preprocessingStartedAt;

        const systemPrompt = `You are Travis, a concise CRM assistant for tradies. Be SHORT and punchy — no essays. Say "jobs" not "meetings".
${knowledgeBaseStr}
${agentModeStr}
${workingHoursStr}
${agentScriptStr}
${allowedTimesStr}
${preferencesStr}
${pricingRulesStr}
${memoryContextStr}

MESSAGING: On "message/text/tell/send [name]" → call sendSms immediately, no confirmation. Send EXACT words. Confirm: "✅ Sent to [Name]: \"[msg]\"". Track pronouns from context.

USE TOOLS for real data — never guess. If uncertain, say what went wrong and suggest a correction.`;

        const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            console.error("Missing Gemini API Key");
            return "Internal Error: AI service configuration is missing.";
        }

        const google = createGoogleGenerativeAI({ apiKey });

        let toolCallsMs = 0;
        const tools = instrumentToolsWithLatency(
            getAgentTools(workspaceId, settings, userId),
            (toolName, durationMs) => {
                toolCallsMs += durationMs;
                recordLatencyMetric(`chat.headless.tool.${toolName}_ms`, durationMs);
            },
        );
        const llmStartedAt = nowMs();
        const result = await generateText({
            model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
            system: systemPrompt,
            prompt: message,
            tools,
            // @ts-ignore - Some versions of AI SDK declare this outside CallSettings
            maxSteps: getAdaptiveMaxSteps(message),
        });
        const llmPhaseMs = nowMs() - llmStartedAt;
        const modelMs = Math.max(0, llmPhaseMs - toolCallsMs);
        const totalMs = nowMs() - requestStartedAt;
        recordLatencyMetric("chat.headless.preprocessing_ms", preprocessingMs);
        recordLatencyMetric("chat.headless.tool_calls_ms", toolCallsMs);
        recordLatencyMetric("chat.headless.model_ms", modelMs);
        recordLatencyMetric("chat.headless.total_ms", totalMs);

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
