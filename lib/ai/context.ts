import { db } from "@/lib/db";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { getAuthUser } from "@/lib/auth";
import type { MemoryClient } from "mem0ai";

/**
 * Builds the comprehensive prompt context for the AI agent given a workspace and user.
 * This is shared by both the Web dashboard chat UI and the headless WhatsApp agent.
 */
export async function buildAgentContext(workspaceId: string, providedUserId?: string) {
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
        db.deal.findMany({
            where: { workspaceId, stage: "WON" },
            select: { title: true, invoices: { select: { total: true }, take: 1 } },
            orderBy: { updatedAt: "desc" },
            take: 50,
        }).catch(() => [] as { title: string; invoices: { total: any }[] }[]),
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
    knowledgeBaseStr += "\nUse this information when texting, calling, or emailing customers on behalf of the business. Always represent the business professionally.";
    knowledgeBaseStr += "\nOn incoming voice calls, Travis (the voice agent) can transfer callers to the tradie's mobile if they ask to speak to the human; the tradie's number is stored in the app profile.";

    // Fetch historical price averages from completed invoices
    let historicalPricingStr = "";
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
        // Historical pricing lookup failed — non-critical
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
        bouncerStr = `\nLEAD QUALIFICATION — BOUNCER vs. ADVISOR (CRITICAL):

PHASE A — THE HARD FILTER (Bouncer):
The following are STRICT NO-GO rules. You are ONLY permitted to decline a lead if it matches one of these EXACTLY:
${mergedExclusionStr}
When a lead matches a No-Go rule: politely inform the caller — "I'm sorry, we don't currently handle [specific job type/location/condition]." — then end the triage.

PHASE B — THE TRIAGE & FLAG (Advisor):
If the job does NOT violate any of the above No-Go rules, you MUST proceed with triage. Even if the job looks low-value, far away, or technically difficult, you are NOT allowed to decline it.
Continue triage normally: ask for address, issue, urgency. Fill the Job Draft Card. If you have concerns (e.g. "This lead is 45km away", "Potential tire-kicker", "High-risk location"), add them to the internal_notes field as a private flag. The owner/manager will see these flags on their dashboard.

CRITICAL GUARDRAIL: You are a professional assistant, not the business owner. You have ZERO authority to turn away business unless it matches a pre-defined Hard Constraint above. If a job seems "bad" but isn't on the No-Go list, your job is to capture every detail perfectly and add a private note to the user explaining your concern. NEVER assume a No-Go.

REAL-TIME INSTRUCTION CAPTURE: If the business owner says "Next time, don't take jobs for X" or "Stop accepting Y", you MUST clarify: "Should I strictly decline these from now on, or just flag them for you?" If they say "Decline": use the updateAiPreferences tool to save a new hard_constraint. If they say "Flag": use updateAiPreferences to save it as a behavioral_preference (flag only, don't decline).`;
    } else {
        bouncerStr = `\nLEAD QUALIFICATION GUARDRAIL: You have no exclusion rules configured. You MUST NOT decline any lead for any reason. Always proceed with full triage. If you suspect a job is low-value or problematic, add a private note to the internal_notes field for the owner to review. NEVER turn away business.`;
    }

    return {
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
