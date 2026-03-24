import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildAgentContext, fetchMemoryContext } from "@/lib/ai/context";
import { buildCustomerSmsSystemPrompt } from "@/lib/ai/prompt-contract";
import { enforceCustomerFacingResponsePolicy, type CustomerFacingResponsePolicyOutcome } from "@/lib/agent-mode";
import { instrumentToolsWithLatency, nowMs, recordLatencyMetric } from "@/lib/telemetry/latency";
import {
    runGetAvailability,
    runGetSchedule,
    runGetClientContext,
} from "@/actions/agent-tools";
import {
    runCreateJobNatural,
    runSearchContacts,
    runLogActivity,
    runCreateContact,
    runCreateDeal,
    runAddAgentFlag,
} from "@/actions/chat-actions";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

export type GeneratedSmsResponse = {
    text: string;
    policyOutcome: CustomerFacingResponsePolicyOutcome;
};

function shouldFetchMemory(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (trimmed.split(/\s+/).length <= 2) return false;
    if (/^(ok|okay|thanks|thank you|yes|no|done|next|confirm|cancel)\b/i.test(trimmed)) return false;
    return true;
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
 * Returns customer-facing tools for inbound SMS conversations.
 * This is a safe subset — no outbound comms, no CRM management, no invoicing.
 */
export function getSmsCustomerTools(workspaceId: string, settings: any) {
    return {
        getAvailability: tool({
            description: "Check available time slots on a specific date.",
            inputSchema: z.object({
                date: z.string().describe("Target date (ISO string)"),
            }),
            execute: async ({ date }) =>
                runGetAvailability(workspaceId, {
                    date,
                    workingHoursStart: settings?.workingHoursStart || "08:00",
                    workingHoursEnd: settings?.workingHoursEnd || "17:00",
                    workspaceTimezone: settings?.workspaceTimezone || "Australia/Sydney",
                }),
        }),
        getSchedule: tool({
            description: "Fetch jobs for a date range to check for conflicts before booking.",
            inputSchema: z.object({
                startDate: z.string().describe("Range start (ISO string)"),
                endDate: z.string().describe("Range end (ISO string)"),
            }),
            execute: async ({ startDate, endDate }) =>
                runGetSchedule(workspaceId, { startDate, endDate }),
        }),
        createJobNatural: tool({
            description: "Create a job from natural language. Use when the customer confirms a booking. Always extract phone if included.",
            inputSchema: z.object({
                clientName: z.string().describe("Client full name"),
                workDescription: z.string().describe("What work is needed"),
                price: z.number().describe("Price in dollars"),
                address: z.string().optional().describe("Street address"),
                schedule: z.string().optional().describe("When, e.g. tomorrow 2pm"),
                phone: z.string().optional().describe("Client phone number"),
                email: z.string().optional().describe("Client email"),
            }),
            execute: async (params) => runCreateJobNatural(workspaceId, params),
        }),
        createDeal: tool({
            description: "Create a new deal/job entry to track this customer enquiry.",
            inputSchema: z.object({
                title: z.string().describe("Deal or job title"),
                company: z.string().optional().describe("Client or company name"),
                value: z.number().optional().describe("Deal value in dollars"),
            }),
            execute: async ({ title, company, value }) =>
                runCreateDeal(workspaceId, { title, company, value }),
        }),
        getClientContext: tool({
            description: "Full client profile: contact info, recent jobs, notes, messages. Use to personalize responses for returning customers.",
            inputSchema: z.object({
                clientName: z.string().describe("Client name (fuzzy matched)"),
            }),
            execute: async ({ clientName }) =>
                runGetClientContext(workspaceId, { clientName }),
        }),
        searchContacts: tool({
            description: "Look up contacts by name or keyword in the CRM.",
            inputSchema: z.object({
                query: z.string().describe("Name or keyword to search"),
            }),
            execute: async ({ query }) => runSearchContacts(workspaceId, query),
        }),
        createContact: tool({
            description: "Add a new contact to the CRM when a new customer provides their details.",
            inputSchema: z.object({
                name: z.string().describe("Full name or company name"),
                email: z.string().optional().describe("Email address"),
                phone: z.string().optional().describe("Phone number"),
            }),
            execute: async (params) => runCreateContact(workspaceId, params),
        }),
        logActivity: tool({
            description: "Record a notable event from this conversation (e.g., emergency reported, special request).",
            inputSchema: z.object({
                type: z.enum(["CALL", "EMAIL", "NOTE", "MEETING", "TASK"]).describe("Activity type"),
                content: z.string().describe("What happened"),
            }),
            execute: async ({ type, content }) => runLogActivity({ type, content }),
        }),
        addAgentFlag: tool({
            description: "Flag a concern for the business owner to review. Use for leads that seem out of scope but don't match No-Go rules.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Deal title to flag"),
                flag: z.string().describe("Short warning note"),
            }),
            execute: async ({ dealTitle, flag }) =>
                runAddAgentFlag(workspaceId, { dealTitle, flag }),
        }),
    };
}

export async function generateSMSResponse(
    interactionId: string,
    userMessage: string,
    workspaceId: string
): Promise<GeneratedSmsResponse> {
    const requestStartedAt = nowMs();

    const apiKey =
        process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY for SMS agent");
        const policyOutcome = enforceCustomerFacingResponsePolicy({
            modeRaw: undefined,
            text: "Thanks for your message! Someone will get back to you shortly.",
            channel: "sms",
        });
        return { text: policyOutcome.finalText, policyOutcome };
    }

    try {
        const preprocessingStartedAt = nowMs();

        // Fetch conversation history, agent context, and memory in parallel
        const [recentMessages, agentContext, memoryContextStr] = await Promise.all([
            db.chatMessage.findMany({
                where: { workspaceId, metadata: { path: ["activityId"], equals: interactionId } },
                orderBy: { createdAt: "desc" },
                take: 10,
                select: { role: true, content: true },
            }),
            buildAgentContext(workspaceId),
            shouldFetchMemory(userMessage)
                ? withTimeout(fetchMemoryContext(workspaceId, userMessage), 700, "")
                : Promise.resolve(""),
        ]);

        const conversationHistory = recentMessages.reverse().map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }));
        const hasPriorAssistantReply = recentMessages.some((message) => message.role === "assistant");

        const {
            settings,
            businessName,
            knowledgeBaseStr,
            workingHoursStr,
            agentScriptStr,
            allowedTimesStr,
            preferencesStr,
            pricingRulesStr,
            bouncerStr,
            attachmentsStr,
        } = agentContext;
        const modeRaw = (settings as { agentMode?: string | null })?.agentMode;

        // SMS-specific sentence guidance from workspace settings
        const wsSettings = (settings as Record<string, unknown>) ?? {};
        const responseLength = Number(wsSettings.agentResponseLength ?? 50);
        const sentenceGuidance =
            responseLength <= 30 ? "Keep replies to 1 sentence." :
            responseLength <= 70 ? "Keep replies to 1-2 sentences." :
            "Keep replies to 1-3 sentences.";

        const preprocessingMs = nowMs() - preprocessingStartedAt;

        const systemPrompt = buildCustomerSmsSystemPrompt({
            businessName,
            firstReplyShouldIntroduceAi: !hasPriorAssistantReply,
            sentenceGuidance,
            modeRaw,
            businessContextBlocks: [
                knowledgeBaseStr,
                workingHoursStr,
                agentScriptStr,
                allowedTimesStr,
                preferencesStr,
                pricingRulesStr,
                bouncerStr,
                attachmentsStr,
                memoryContextStr,
            ],
        });

        const google = createGoogleGenerativeAI({ apiKey });

        let toolCallsMs = 0;
        const tools = instrumentToolsWithLatency(
            getSmsCustomerTools(workspaceId, settings),
            (toolName, durationMs) => {
                toolCallsMs += durationMs;
                recordLatencyMetric(`sms.inbound.tool.${toolName}_ms`, durationMs);
            },
        );

        const llmStartedAt = nowMs();
        const result = await generateText({
            model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
            system: systemPrompt,
            messages: conversationHistory.length > 0
                ? [...conversationHistory, { role: "user" as const, content: userMessage }]
                : [{ role: "user" as const, content: userMessage }],
            tools,
            // @ts-ignore - Some versions of AI SDK declare this outside CallSettings
            maxSteps: 3,
        });

        const llmPhaseMs = nowMs() - llmStartedAt;
        const modelMs = Math.max(0, llmPhaseMs - toolCallsMs);
        const totalMs = nowMs() - requestStartedAt;
        recordLatencyMetric("sms.inbound.preprocessing_ms", preprocessingMs);
        recordLatencyMetric("sms.inbound.tool_calls_ms", toolCallsMs);
        recordLatencyMetric("sms.inbound.model_ms", modelMs);
        recordLatencyMetric("sms.inbound.total_ms", totalMs);

        const text = result.text?.trim();
        if (text) {
            const policyOutcome = enforceCustomerFacingResponsePolicy({
                modeRaw,
                text,
                channel: "sms",
            });
            return {
                text: policyOutcome.finalText || text,
                policyOutcome,
            };
        }
    } catch (error) {
        console.error("[SMS Agent] Error generating response:", error);
    }

    // Fallback if Gemini fails
    const policyOutcome = enforceCustomerFacingResponsePolicy({
        modeRaw: undefined,
        text: "Thanks for your message! Someone will get back to you shortly.",
        channel: "sms",
    });
    return { text: policyOutcome.finalText, policyOutcome };
}

