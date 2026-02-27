import { db } from "@/lib/db";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { getAuthUser } from "@/lib/auth";
import type { MemoryClient } from "mem0ai";

/**
 * Builds the comprehensive prompt context for the AI agent given a workspace and user.
 * This is shared by both the Web dashboard chat UI and the headless WhatsApp agent.
 */
export async function buildAgentContext(workspaceId: string, providedUserId?: string) {
    const settings = await getWorkspaceSettingsById(workspaceId);

    // Resolve current user's role in this workspace (for data-correction / manager-only rules)
    let userRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" = "TEAM_MEMBER";
    try {
        const authUser = await getAuthUser();
        if (authUser?.email) {
            const dbUser = await db.user.findFirst({
                where: { workspaceId, email: authUser.email },
                select: { role: true },
            });
            if (dbUser?.role) userRole = dbUser.role as "OWNER" | "MANAGER" | "TEAM_MEMBER";
        }
    } catch {
        // If auth fails (e.g. from a webhook), we fallback to TEAM_MEMBER
    }

    // If a specific userId is provided via webhook, try to find their role
    if (providedUserId) {
        try {
            const dbUser = await db.user.findUnique({
                where: { id: providedUserId },
                select: { role: true },
            });
            if (dbUser?.role) userRole = dbUser.role as "OWNER" | "MANAGER" | "TEAM_MEMBER";
        } catch {
            // Fallback
        }
    }

    const isManager = userRole === "OWNER" || userRole === "MANAGER";

    // Keep BusinessProfile and WorkspaceSettings in system prompt
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
        // BusinessProfile table may not exist yet
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
    knowledgeBaseStr += "\nOn incoming voice calls, Travis (the voice agent) can transfer callers to the tradie's mobile if they ask to speak to the human; the tradie's number is stored in the app profile.";

    // Fetch Glossary for Pricing Safeguards
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

    // Build context strings
    const agentModeStr = settings?.agentMode === "EXECUTE"
        ? "\nAGENT OVERRIDE MODE: EXECUTE. You have full autonomy. Calculate the price based on standard glossary pricing below. If no exact match, make an educated estimate. You may execute creation, moving, scheduling, or proposing of jobs directly based on smart geolocation."
        : settings?.agentMode === "ORGANIZE"
            ? "\nAGENT OVERRIDE MODE: ORGANIZE. You are operating as a liaison. Always wait for user approvals or confirmations. You should propose times to the customer, but rely on the UX 'Draft' cards for final user confirmation."
            : "\nAGENT OVERRIDE MODE: FILTER. You are a screening receptionist ONLY. Extract information, but DO NOT schedule, propose times, or provide pricing. Tell the user you will pass their details on.";

    const workingHoursStr = `\nWORKING HOURS: Your company working hours are strictly ${settings?.workingHoursStart || "08:00"} to ${settings?.workingHoursEnd || "17:00"}. DO NOT SCHEDULE jobs outside of this window.`;

    const businessName = (settings as { agentBusinessName?: string })?.agentBusinessName?.trim() || workspaceInfo?.name || "this business";
    const openingMsg = (settings as { agentOpeningMessage?: string })?.agentOpeningMessage?.trim();
    const closingMsg = (settings as { agentClosingMessage?: string })?.agentClosingMessage?.trim();
    const defaultOpening = `Hi I'm Travis, the AI assistant for ${businessName}`;
    const defaultClosing = `Kind regards, Travis (AI assistant for ${businessName})`;
    const parts: string[] = [];
    if (openingMsg) {
        parts.push(`\nAGENT INTRODUCTION (customers only): When YOU contact a CUSTOMER (SMS, email, or call to them — not in this dashboard chat), START with this exact opening (or very close): "${openingMsg}". Do NOT use this when replying in the dashboard chat to the business owner.`);
    } else {
        parts.push(`\nAGENT INTRODUCTION (customers only): When YOU contact a CUSTOMER (SMS, email, or call to them — not in this dashboard chat), START with: "${defaultOpening}". Do NOT use this when replying in the dashboard chat to the business owner.`);
    }
    if (closingMsg) {
        parts.push(`\nAGENT SIGN-OFF (customers only): When YOU contact a CUSTOMER, END messages with this exact sign-off (or very close): "${closingMsg}". Do NOT use this sign-off when replying in the dashboard chat to the business owner.`);
    } else {
        parts.push(`\nAGENT SIGN-OFF (customers only): When YOU contact a CUSTOMER, END with: "${defaultClosing}". Do NOT use this sign-off when replying in the dashboard chat to the business owner.`);
    }
    const agentScriptStr = parts.join("");

    const textStart = (settings as { textAllowedStart?: string })?.textAllowedStart ?? "08:00";
    const textEnd = (settings as { textAllowedEnd?: string })?.textAllowedEnd ?? "20:00";
    const callStart = (settings as { callAllowedStart?: string })?.callAllowedStart ?? "08:00";
    const callEnd = (settings as { callAllowedEnd?: string })?.callAllowedEnd ?? "20:00";
    const allowedTimesStr = `\nALLOWED TIMES: Only send texts between ${textStart} and ${textEnd} (local time). Only place outbound calls between ${callStart} and ${callEnd}. If the user asks to message or call outside these windows, say you're outside contact hours and will do it during the allowed window.`;

    const preferencesStr = settings?.aiPreferences
        ? `\nUSER PREFERENCES (Follow these strictly):\n${settings.aiPreferences}`
        : "";

    const callOutFee = settings?.callOutFee || 0;
    const pricingRulesStr = `\nSTRICT PRICING RULES (HARD BRAKE):
1. NEVER agree on a final price immediately UNLESS it is an EXACT match for a task explicitly listed in the GLOSSARY OF APPROVED PRICES below.
2. If the user asks for a price for a task that is NOT in the Glossary, you MUST NOT invent, hallucinate, or estimate a specific cost. You MUST state that a firm quote requires an on-site assessment.
3. Focus heavily on locking down the booking/assessment first.
4. If asked for general pricing and the task is custom/not in the glossary, quote the standard Call-Out Fee of $${callOutFee}. Say: "Our standard call-out fee is $${callOutFee} which covers the assessment, then we can give you a firm quote."
${glossaryStr}`;

    return {
        settings,
        userRole,
        isManager,
        knowledgeBaseStr,
        agentModeStr,
        workingHoursStr,
        agentScriptStr,
        allowedTimesStr,
        preferencesStr,
        pricingRulesStr
    };
}

// Lazy initialization of Mem0 Memory Client
let memoryClient: MemoryClient | null = null;

export function getMemoryClient(): MemoryClient | null {
    if (!memoryClient && process.env.MEM0_API_KEY) {
        try {
            // Dynamic import to avoid SSR issues
            const { MemoryClient } = require("mem0ai");
            memoryClient = new MemoryClient({
                apiKey: process.env.MEM0_API_KEY,
            });
            console.log("[Mem0] Memory client initialized successfully");
        } catch (error) {
            console.error("[Mem0] Failed to initialize memory client:", error);
            return null;
        }
    }
    return memoryClient;
}

/**
 * Searches MEM0 for injected context for a specific user ID and generic recent query
 */
export async function fetchMemoryContext(userId: string, query: string): Promise<string> {
    const memClient = getMemoryClient();
    let memoryContextStr = "";

    if (memClient && query) {
        try {
            console.log(`[Mem0] Searching for relevant memories...`);
            const searchResults = await memClient.search(query, {
                user_id: userId,
                limit: 5,
            });

            console.log(`[Mem0] Found ${searchResults.length} memories`);

            if (searchResults && searchResults.length > 0) {
                const facts = searchResults.map((memory: any, index: number) => {
                    return `- ${memory.memory}`;
                }).join("\n");

                memoryContextStr = `\n\n[[RELEVANT MEMORY CONTEXT]]\nThe following facts are retrieved from previous conversations with this user:\n${facts}\n[[END MEMORY CONTEXT]]\n\nUse these facts to personalize your response.`;
            } else {
                memoryContextStr = `\n\n[[RELEVANT MEMORY CONTEXT]]\nNo previous context found for this query.\n[[END MEMORY CONTEXT]]`;
            }
        } catch (error) {
            console.error("[Mem0] Error searching memories:", error);
            memoryContextStr = `\n\n[[RELEVANT MEMORY CONTEXT]]\nUnable to retrieve memories at this time.\n[[END MEMORY CONTEXT]]`;
        }
    } else {
        memoryContextStr = "";
    }

    return memoryContextStr;
}
