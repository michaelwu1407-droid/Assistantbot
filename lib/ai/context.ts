import { db } from "@/lib/db";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { getAuthUser } from "@/lib/auth";
import type { MemoryClient } from "mem0ai";
import {
    getCustomerContactModeLabel,
    getCustomerContactModePolicySummary,
    normalizeAgentMode,
    type CanonicalCustomerContactMode,
} from "@/lib/agent-mode";
import { summarizeWeeklyHours } from "@/lib/working-hours";

type BuildAgentContextOptions = {
    includeHistoricalPricing?: boolean;
  /**
   * Controls how we phrase pricing rules when the prompt is given to the LLM.
   * - "customer": speak like messaging to an end customer
   * - "business": speak to the business/operator in dashboard chat
   */
  pricingAudience?: "customer" | "business";
};

type AgentContextPayload = {
    settings: Awaited<ReturnType<typeof getWorkspaceSettingsById>>;
    userRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" | string;
    isManager: boolean;
    businessName: string;
    knowledgeBaseStr: string;
    agentModeStr: string;
    workingHoursStr: string;
    agentScriptStr: string;
    allowedTimesStr: string;
    preferencesStr: string;
    pricingRulesStr: string;
    bouncerStr: string;
    attachmentsStr: string;
};

export type WorkspaceVoiceGrounding = {
    workspaceId: string;
    businessName: string;
    tradeType: string | null;
    website: string | null;
    businessPhone: string | null;
    publicPhone: string | null;
    publicEmail: string | null;
    physicalAddress: string | null;
    serviceArea: string | null;
    serviceRadiusKm: number | null;
    standardWorkHours: string | null;
    emergencyService: boolean;
    emergencySurcharge: number | null;
    aiPreferences: string[];
    customerContactMode: CanonicalCustomerContactMode;
    customerContactModeLabel: string;
    serviceRules: Array<{
        title: string;
        notes: string;
        priceRange: string | null;
        duration: string | null;
    }>;
    pricingItems: Array<{
        title: string;
        description: string;
    }>;
    noGoRules: string[];
};

const AGENT_CONTEXT_CACHE_TTL_MS = 120_000;
const agentContextCache = new Map<string, { expiresAt: number; value: AgentContextPayload }>();

/** Bust the agent context cache for a workspace (call when settings change). */
export function invalidateAgentContextCache(workspaceId: string) {
    for (const key of agentContextCache.keys()) {
        if (key.startsWith(`${workspaceId}:`)) agentContextCache.delete(key);
    }
}

const VOICE_GROUNDING_CACHE_TTL_MS = 5 * 60_000;
const voiceGroundingCache = new Map<string, { expiresAt: number; value: WorkspaceVoiceGrounding | null }>();

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
    const pricingAudience = options?.pricingAudience ?? "customer";
    const cacheKey = `${workspaceId}:${providedUserId ?? "anonymous"}:${includeHistoricalPricing ? "pricing" : "no-pricing"}`;
    const cached = agentContextCache.get(cacheKey);
    if (cached) {
        if (cached.expiresAt > Date.now()) {
            return cached.value; // Fresh cache hit
        }
        // Stale — return immediately, refresh in background
        buildAgentContextFresh(workspaceId, providedUserId, options, cacheKey).catch(() => {});
        return cached.value;
    }

    // No cache at all — block and fetch
    return buildAgentContextFresh(workspaceId, providedUserId, options, cacheKey);
}

async function buildAgentContextFresh(
    workspaceId: string,
    providedUserId?: string,
    options?: BuildAgentContextOptions,
    cacheKey?: string,
): Promise<AgentContextPayload> {
    const includeHistoricalPricing = options?.includeHistoricalPricing ?? true;
    const pricingAudience = options?.pricingAudience ?? "customer";
    if (!cacheKey) {
        cacheKey = `${workspaceId}:${providedUserId ?? "anonymous"}:${includeHistoricalPricing ? "pricing" : "no-pricing"}`;
    }

    // ── Parallel batch 1: all independent DB/auth queries ────────────────
    const [
        settings,
        workspaceInfo,
        businessProfile,
        repairItems,
        completedDeals,
        negativeRules,
        serviceRules,
        businessDocuments,
        userRoleResult,
    ] = await Promise.all([
        getWorkspaceSettingsById(workspaceId),
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
        db.businessDocument.findMany({
            where: { workspaceId },
            select: { name: true, description: true, fileUrl: true },
        }).catch(() => [] as { name: string; description: string; fileUrl: string }[]),
        (async () => {
            let role = "TEAM_MEMBER";
            const [authUser, providedUser] = await Promise.all([
                getAuthUser().catch(() => null),
                providedUserId ? db.user.findUnique({ where: { id: providedUserId }, select: { role: true } }).catch(() => null) : null
            ]);
            if (providedUser?.role) return providedUser.role;
            if (authUser?.email) {
                const dbUser = await db.user.findFirst({ where: { workspaceId, email: authUser.email }, select: { role: true } }).catch(() => null);
                if (dbUser?.role) return dbUser.role;
            }
            return role;
        })(),
    ]);

    const userRole = userRoleResult;
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
    knowledgeBaseStr += "\nUse this info when contacting customers. Represent the business professionally. On voice calls, Tracey can transfer to the tradie's mobile.";

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
        glossaryStr += repairItems.map((item: any) => `- ${item.title}: ${item.description || 'No pricing specified'}`).join("\n");
    } else {
        glossaryStr += "(Empty - No approved standard prices exist. Do not quote specific prices for any task.)";
    }
    glossaryStr += historicalPricingStr;

    // Build context strings
    const agentModeStr = getCustomerContactModePolicySummary(settings?.agentMode);

    const workingHoursSummary = settings?.weeklyHours
        ? summarizeWeeklyHours(settings.weeklyHours)
        : `${settings?.workingHoursStart || "08:00"}-${settings?.workingHoursEnd || "17:00"}`;
    const workingHoursStr = `\nWORKING HOURS: Your company working hours are strictly ${workingHoursSummary}. DO NOT SCHEDULE jobs outside of this window, and treat closed days as unavailable.`;

    const businessName = (settings as { agentBusinessName?: string })?.agentBusinessName?.trim() || workspaceInfo?.name || "this business";
    const openingMsg = (settings as { agentOpeningMessage?: string })?.agentOpeningMessage?.trim();
    const closingMsg = (settings as { agentClosingMessage?: string })?.agentClosingMessage?.trim();
    const defaultOpening = `Hi I'm Tracey, the AI assistant for ${businessName}`;
    const defaultClosing = `Kind regards, Tracey (AI assistant for ${businessName})`;
    const parts: string[] = [];
    if (openingMsg) {
        parts.push(`\nAGENT INTRO (first outbound customer reply in a new thread only, NOT dashboard chat): If this is the first reply in a customer conversation, you may open with: "${openingMsg}"`);
    } else {
        parts.push(`\nAGENT INTRO (first outbound customer reply in a new thread only, NOT dashboard chat): If this is the first reply in a customer conversation, you may open with: "${defaultOpening}"`);
    }
    if (closingMsg) {
        parts.push(`\nAGENT SIGN-OFF (longer emails or final follow-up only, NOT every SMS and NOT dashboard chat): Use when it sounds natural to close the thread with: "${closingMsg}"`);
    } else {
        parts.push(`\nAGENT SIGN-OFF (longer emails or final follow-up only, NOT every SMS and NOT dashboard chat): Use when it sounds natural to close the thread with: "${defaultClosing}"`);
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
    const unlistedTasksRule =
        pricingAudience === "business"
            ? "Unlisted tasks: No approved pricing found in your glossary for this. For a firm quote, an on-site assessment is required. Focus on locking the booking."
            : 'Unlisted tasks: "A firm quote requires an on-site assessment." Focus on locking the booking.';
    const customWorkRule =
        pricingAudience === "business"
            ? `For custom work that is not in the glossary, plan for an on-site assessment before providing a firm quote. The call-out fee is $${callOutFee} for the assessment, and does not apply if the issue is fixed on the first visit.`
            : `For custom work that is not in the glossary, say: "Our call-out fee is $${callOutFee} for the assessment, and if we successfully fix it on the spot that fee does not apply. Otherwise we use the assessment to give you a firm quote."`;
    const pricingRulesStr = `\nPRICING RULES:
1. Only quote a final price for tasks with an EXACT match in the GLOSSARY below. Never invent prices.
2. ${unlistedTasksRule.replace(/^Unlisted tasks:\s*/i, "")}
3. Only mention the call-out fee when it is useful customer-facing pricing context. Do NOT remind the business owner about their own fee rules.
4. Universal call-out fee rule: if the technician attends and successfully fixes the issue, the call-out fee does NOT apply.
5. ${customWorkRule.replace(/^For custom work that is not in the glossary,\s*/i, "For custom work that is not in the glossary, ")}
${glossaryStr}`;

    // ── Business Knowledge (already fetched in parallel batch above) ──
    const knowledgeNegativeRules = negativeRules.map((r: any) => r.ruleContent);
    let knowledgeServicesStr = "";
    if (serviceRules.length > 0) {
        knowledgeServicesStr = "\n\nSERVICES OFFERED (from Knowledge Base):\n" +
            serviceRules.map((s: any) => {
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
        businessName,
        knowledgeBaseStr: knowledgeBaseStr + knowledgeServicesStr,
        agentModeStr,
        workingHoursStr,
        agentScriptStr,
        allowedTimesStr,
        preferencesStr,
        pricingRulesStr,
        bouncerStr,
        attachmentsStr: businessDocuments.length > 0
            ? `\n\nBUSINESS ATTACHMENTS (Available to send to customers via URL):\n` + businessDocuments.map((d: any) => `- ${d.name}: ${d.description} -> URL: ${d.fileUrl}`).join("\n") + `\nIf a customer requests this info, provide them the URL.`
            : "",
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

export async function getWorkspaceVoiceGrounding(workspaceId: string): Promise<WorkspaceVoiceGrounding | null> {
    const cached = voiceGroundingCache.get(workspaceId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const [workspace, businessProfile, settings, repairItems, negativeRules, serviceRules] = await Promise.all([
        db.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                name: true,
                location: true,
                twilioPhoneNumber: true,
                exclusionCriteria: true,
            },
        }),
        db.businessProfile.findFirst({
            where: { user: { workspaceId } },
            select: {
                tradeType: true,
                website: true,
                businessName: true,
                publicPhone: true,
                publicEmail: true,
                physicalAddress: true,
                baseSuburb: true,
                serviceRadius: true,
                standardWorkHours: true,
                emergencyService: true,
                emergencySurcharge: true,
            },
        }).catch(() => null),
        getWorkspaceSettingsById(workspaceId),
        db.repairItem.findMany({
            where: { workspaceId },
            select: { title: true, description: true },
            orderBy: { createdAt: "desc" },
            take: 20,
        }).catch(() => [] as Array<{ title: string; description: string | null }>),
        db.businessKnowledge.findMany({
            where: { workspaceId, category: "NEGATIVE_SCOPE" },
            select: { ruleContent: true },
            orderBy: { updatedAt: "desc" },
            take: 20,
        }).catch(() => [] as Array<{ ruleContent: string }>),
        db.businessKnowledge.findMany({
            where: { workspaceId, category: "SERVICE" },
            select: { ruleContent: true, metadata: true },
            orderBy: { updatedAt: "desc" },
            take: 30,
        }).catch(() => [] as Array<{ ruleContent: string; metadata: unknown }>),
    ]);

    if (!workspace) {
        voiceGroundingCache.set(workspaceId, {
            expiresAt: Date.now() + VOICE_GROUNDING_CACHE_TTL_MS,
            value: null,
        });
        return null;
    }

    const aiPreferences = (settings?.aiPreferences || "")
        .split("\n")
        .map((line) => line.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 12);

    const exclusionCriteria = workspace.exclusionCriteria
        ? workspace.exclusionCriteria.split("\n").map((line) => line.trim()).filter(Boolean)
        : [];
    const noGoRules = [...exclusionCriteria, ...negativeRules.map((item) => item.ruleContent.trim()).filter(Boolean)]
        .filter((value, index, all) => all.indexOf(value) === index)
        .slice(0, 20);

    const normalizedMode = normalizeAgentMode(settings?.agentMode);

    const grounding = {
        workspaceId: workspace.id,
        businessName: businessProfile?.businessName || workspace.name || "the business",
        tradeType: businessProfile?.tradeType || null,
        website: businessProfile?.website || null,
        businessPhone: workspace.twilioPhoneNumber || null,
        publicPhone: businessProfile?.publicPhone || null,
        publicEmail: businessProfile?.publicEmail || null,
        physicalAddress: businessProfile?.physicalAddress || null,
        serviceArea: workspace.location || businessProfile?.baseSuburb || null,
        serviceRadiusKm: businessProfile?.serviceRadius ?? null,
        standardWorkHours: businessProfile?.standardWorkHours ||
            (settings?.workingHoursStart && settings?.workingHoursEnd
                ? `${settings.workingHoursStart}-${settings.workingHoursEnd}`
                : null),
        emergencyService: Boolean(businessProfile?.emergencyService),
        emergencySurcharge: businessProfile?.emergencySurcharge ?? null,
        aiPreferences,
        customerContactMode: normalizedMode,
        customerContactModeLabel: getCustomerContactModeLabel(normalizedMode),
        serviceRules: serviceRules.map((item) => {
            const metadata = (item.metadata as Record<string, unknown> | null) || {};
            return {
                title: item.ruleContent.trim(),
                notes: item.ruleContent.trim(),
                priceRange: typeof metadata.priceRange === "string" ? metadata.priceRange : null,
                duration: typeof metadata.duration === "string" ? metadata.duration : null,
            };
        }),
        pricingItems: repairItems.map((item) => ({
            title: item.title,
            description: item.description || "No approved price notes recorded.",
        })),
        noGoRules,
    };

    if (voiceGroundingCache.size >= 500) {
        const now = Date.now();
        for (const [key, value] of voiceGroundingCache.entries()) {
            if (value.expiresAt <= now) voiceGroundingCache.delete(key);
        }
    }

    voiceGroundingCache.set(workspaceId, {
        expiresAt: Date.now() + VOICE_GROUNDING_CACHE_TTL_MS,
        value: grounding,
    });

    return grounding;
}

// Lazy initialization of Mem0 Memory Client
let memoryClient: MemoryClient | null = null;
const MEMORY_CACHE_TTL_MS = 60_000;
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
