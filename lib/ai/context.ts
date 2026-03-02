import { db } from "@/lib/db";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { getAuthUser } from "@/lib/auth";
import type { MemoryClient } from "mem0ai";

type BuildAgentContextOptions = {
    includeHistoricalPricing?: boolean;
};

type AgentContextPayload = {
    settings: Awaited<ReturnType<typeof getWorkspaceSettingsById>>;
    userRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" | string;
    isManager: boolean;
    knowledgeBaseStr: string;
    agentModeStr: string;
    workingHoursStr: string;
    agentScriptStr: string;
    allowedTimesStr: string;
    preferencesStr: string;
    pricingRulesStr: string;
    bouncerStr: string;
};

const AGENT_CONTEXT_CACHE_TTL_MS = 30_000;
const agentContextCache = new Map<string, { expiresAt: number; value: AgentContextPayload }>();

/**
 * Builds the comprehensive prompt context for the AI agent given a workspace and user.
 * This is shared by both the Web dashboard chat UI and the headless WhatsApp agent.
 */
export async function buildAgentContext(
    workspaceId: string,
    providedUserId?: string,
    options?: BuildAgentContextOptions
): Promise<AgentContextPayload> {
    const includeHistoricalPricing = options?.includeHistoricalPricing ?? true;
    const cacheKey = `${workspaceId}:${providedUserId ?? "anonymous"}:${includeHistoricalPricing ? "pricing" : "no-pricing"}`;
    const cached = agentContextCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    // ── Parallel batch 1: all independent DB/auth queries ────────────────
    const [
        settings,
        authUser,
        workspaceInfo,
        businessProfile,
        repairItems,
        completedDeals,
        negativeRules,
        serviceRules,
    ] = await Promise.all([
        getWorkspaceSettingsById(workspaceId),
        getAuthUser().catch(() => null),
        db.workspace.findUnique({
            where: { id: workspaceId },
            select: { name: true, location: true, twilioPhoneNumber: true, exclusionCriteria: true },
        }),
        db.businessProfile.findFirst({
            where: { user: { workspaceId } },
            select: { tradeType: true, website: true, baseSuburb: true, serviceRadius: true, standardWorkHours: true, emergencyService: true, emergencySurcharge: true },
        }).catch(() => null),
        db.repairItem.findMany({
            where: { workspaceId },
            select: { title: true, description: true },
        }),
        includeHistoricalPricing
            ? db.deal.findMany({
                where: { workspaceId, stage: "WON" },
                select: { title: true, invoices: { select: { total: true }, take: 1 } },
                orderBy: { updatedAt: "desc" },
                take: 50,
            }).catch(() => [] as { title: string; invoices: { total: any }[] }[])
            : Promise.resolve([] as { title: string; invoices: { total: any }[] }[]),
        db.businessKnowledge.findMany({
            where: { workspaceId, category: "NEGATIVE_SCOPE" },
            select: { ruleContent: true },
        }).catch(() => [] as { ruleContent: string }[]),
        db.businessKnowledge.findMany({
            where: { workspaceId, category: "SERVICE" },
            select: { ruleContent: true, metadata: true },
        }).catch(() => [] as { ruleContent: string; metadata: unknown }[]),
    ]);

    // ── Resolve user role (depends on authUser result) ───────────────────
    let userRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" | string = "TEAM_MEMBER";

    // Build role lookup promises based on what's available
    const roleLookups: Promise<void>[] = [];

    if (authUser?.email) {
        roleLookups.push(
            db.user.findFirst({
                where: { workspaceId, email: authUser.email },
                select: { role: true },
            }).then((dbUser) => {
                if (dbUser?.role) userRole = dbUser.role as "OWNER" | "MANAGER" | "TEAM_MEMBER";
            }).catch(() => { })
        );
    }

    if (providedUserId) {
        roleLookups.push(
            db.user.findUnique({
                where: { id: providedUserId },
                select: { role: true },
            }).then((dbUser) => {
                if (dbUser?.role) userRole = dbUser.role as "OWNER" | "MANAGER" | "TEAM_MEMBER";
            }).catch(() => { })
        );
    }

    if (roleLookups.length > 0) await Promise.all(roleLookups);

    const isManager = userRole === "OWNER" || userRole === "MANAGER";

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
    knowledgeBaseStr += "\nUse this info when contacting customers. Represent the business professionally. On voice calls, Travis can transfer to the tradie's mobile.";

    // Fetch historical price averages from completed invoices
    let historicalPricingStr = "";
    if (includeHistoricalPricing) {
        try {

        // Group by normalized title and compute min/max/avg
        const priceMap = new Map<string, number[]>();
        for (const deal of completedDeals) {
            const key = deal.title.toLowerCase().trim();
            const total = deal.invoices[0]?.total ? Number(deal.invoices[0].total) : null;
            if (total && total > 0) {
                const arr = priceMap.get(key) || [];
                arr.push(total);
                priceMap.set(key, arr);
            }
        }

        // Helper: extract a numeric price range from a glossary description string
        // Handles "$150", "$100-200", "$100 to $200", "150", "between 100 and 200", etc.
        const parseGlossaryRange = (desc: string): { min: number; max: number } | null => {
            const cleaned = desc.replace(/\$/g, "");
            const rangeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)/i);
            if (rangeMatch) return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
            const singleMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
            if (singleMatch) { const v = parseFloat(singleMatch[1]); return { min: v * 0.8, max: v * 1.2 }; } // ±20% tolerance for single price
            return null;
        };

        // Build a map of glossary prices for quick lookup (lower-case title → range)
        const glossaryRangeMap = new Map<string, { min: number; max: number }>();
        for (const item of repairItems) {
            if (item.description) {
                const range = parseGlossaryRange(item.description);
                if (range) glossaryRangeMap.set(item.title.toLowerCase().trim(), range);
            }
        }

        const historicalLines: string[] = [];
        const pricingConflicts: string[] = [];

        for (const [title, prices] of priceMap) {
            if (prices.length >= 2) {
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
                historicalLines.push(`- ${title}: Typically $${min}–$${max} (avg $${avg}, ${prices.length} past jobs)`);

                // Cross-check against glossary — if glossary has a range for this item,
                // the historical average MUST fall within it. Otherwise flag the discrepancy.
                const glossaryRange = glossaryRangeMap.get(title);
                if (glossaryRange) {
                    const histOverlapsGlossary = min <= glossaryRange.max && max >= glossaryRange.min;
                    if (!histOverlapsGlossary) {
                        pricingConflicts.push(
                            `"${title}": glossary says $${glossaryRange.min}–$${glossaryRange.max} but historical invoices show $${min}–$${max}. ` +
                            `POSSIBLE MISINFORMATION — ask the tradie to confirm the correct price before quoting.`
                        );
                    }
                }
            }
        }
        if (historicalLines.length > 0) {
            historicalPricingStr = "\n\nHISTORICAL PRICE RANGES (from past invoices — use as reference, not as quotes):\n" + historicalLines.join("\n");
            historicalPricingStr += "\nNOTE: Glossary approved prices are the PRIMARY source of truth. Historical ranges are secondary reference only.";
            historicalPricingStr += "\nNever quote historical ranges as fixed prices. Say 'Similar jobs have typically been between $X and $Y' if asked.";
        }
        if (pricingConflicts.length > 0) {
            historicalPricingStr += "\n\n⚠️ PRICING CONFLICTS DETECTED (glossary vs actual invoices — verify before quoting):\n" +
                pricingConflicts.map(c => `- ${c}`).join("\n");
        }
        } catch {
            // Historical pricing lookup failed - non-critical
        }
    }

    let glossaryStr = "\n\nGLOSSARY OF APPROVED PRICES:\n";
    if (repairItems.length > 0) {
        glossaryStr += repairItems.map(item => `- ${item.title}: ${item.description || 'No pricing specified'}`).join("\n");
    } else {
        glossaryStr += "(Empty - No approved standard prices exist. Do not quote specific prices for any task.)";
    }
    glossaryStr += historicalPricingStr;

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
        parts.push(`\nAGENT INTRO (outbound customer msgs only, NOT dashboard): Start with: "${openingMsg}"`);
    } else {
        parts.push(`\nAGENT INTRO (outbound customer msgs only, NOT dashboard): Start with: "${defaultOpening}"`);
    }
    if (closingMsg) {
        parts.push(`\nAGENT SIGN-OFF (outbound customer msgs only, NOT dashboard): End with: "${closingMsg}"`);
    } else {
        parts.push(`\nAGENT SIGN-OFF (outbound customer msgs only, NOT dashboard): End with: "${defaultClosing}"`);
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
    const pricingRulesStr = `\nPRICING RULES:
1. Only quote a final price for tasks with an EXACT match in the GLOSSARY below. Never invent prices.
2. Unlisted tasks: "A firm quote requires an on-site assessment." Focus on locking the booking.
3. For custom work, quote the call-out fee: "Our call-out fee is $${callOutFee} covering the assessment, then we give a firm quote."
${glossaryStr}`;

    // ── Business Knowledge (already fetched in parallel batch above) ──
    const knowledgeNegativeRules = negativeRules.map(r => r.ruleContent);
    let knowledgeServicesStr = "";
    if (serviceRules.length > 0) {
        knowledgeServicesStr = "\n\nSERVICES OFFERED (from Knowledge Base):\n" +
            serviceRules.map(s => {
                const meta = (s.metadata as Record<string, string>) || {};
                let line = `- ${s.ruleContent}`;
                if (meta.priceRange) line += ` (${meta.priceRange})`;
                if (meta.duration) line += ` — est. ${meta.duration}`;
                return line;
            }).join("\n");
    }

    // ── Bouncer & Advisor Logic ──────────────────────────────────────
    // Merge exclusionCriteria (legacy) with BusinessKnowledge negative scope rules
    const exclusionCriteria = workspaceInfo?.exclusionCriteria?.trim() || "";
    const allNegativeRules = [
        ...exclusionCriteria.split("\n").filter(Boolean),
        ...knowledgeNegativeRules,
    ].filter(Boolean);
    const mergedExclusionStr = allNegativeRules.length > 0
        ? allNegativeRules.map(r => `- ${r}`).join("\n")
        : "";

    let bouncerStr = "";
    if (mergedExclusionStr) {
        bouncerStr = `\nLEAD QUALIFICATION:
NO-GO rules (decline ONLY on exact match):
${mergedExclusionStr}
On match: politely decline ("We don't currently handle [type]") and end triage.

All other leads: MUST proceed with full triage regardless of value/distance/difficulty. Capture all details. Use addAgentFlag for concerns — you have ZERO authority to decline leads not on the No-Go list.

If owner says "stop taking X": clarify "Strictly decline or just flag?" → use updateAiPreferences with [HARD_CONSTRAINT] or [FLAG_ONLY].`;
    } else {
        bouncerStr = `\nLEAD QUALIFICATION: No exclusion rules. NEVER decline any lead. Proceed with full triage. Use addAgentFlag for concerns.`;
    }

    const contextValue: AgentContextPayload = {
        settings,
        userRole,
        isManager,
        knowledgeBaseStr: knowledgeBaseStr + knowledgeServicesStr,
        agentModeStr,
        workingHoursStr,
        agentScriptStr,
        allowedTimesStr,
        preferencesStr,
        pricingRulesStr,
        bouncerStr,
    };

    if (agentContextCache.size >= 200) {
        const now = Date.now();
        for (const [key, value] of agentContextCache.entries()) {
            if (value.expiresAt <= now) agentContextCache.delete(key);
        }
    }
    agentContextCache.set(cacheKey, {
        expiresAt: Date.now() + AGENT_CONTEXT_CACHE_TTL_MS,
        value: contextValue,
    });

    return contextValue;
}

// Lazy initialization of Mem0 Memory Client
let memoryClient: MemoryClient | null = null;
const MEMORY_CACHE_TTL_MS = 20_000;
const memorySearchCache = new Map<string, { expiresAt: number; value: string }>();

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
    const normalizedQuery = query.trim();
    if (!memClient || !normalizedQuery) return "";

    const cacheKey = `${userId}:${normalizedQuery.toLowerCase()}`;
    const cached = memorySearchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    let memoryContextStr = "";
    try {
        const searchResults = await memClient.search(normalizedQuery, {
            user_id: userId,
            limit: 5,
        });

        if (searchResults && searchResults.length > 0) {
            const facts = searchResults
                .map((memory: any) => `- ${memory.memory}`)
                .join("\n");
            memoryContextStr = `\n\n[[RELEVANT MEMORY CONTEXT]]\nThe following facts are retrieved from previous conversations with this user:\n${facts}\n[[END MEMORY CONTEXT]]\n\nUse these facts to personalize your response.`;
        }
    } catch (error) {
        console.error("[Mem0] Error searching memories:", error);
        memoryContextStr = "";
    }

    if (memorySearchCache.size >= 400) {
        const now = Date.now();
        for (const [key, value] of memorySearchCache.entries()) {
            if (value.expiresAt <= now) memorySearchCache.delete(key);
        }
    }
    memorySearchCache.set(cacheKey, {
        expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
        value: memoryContextStr,
    });

    return memoryContextStr;
}
