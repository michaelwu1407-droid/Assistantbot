import { db } from "@/lib/db";

export type TriageRecommendation = "ACCEPT" | "HOLD_REVIEW" | "QUOTE";

export interface TriageResult {
  recommendation: TriageRecommendation;
  flags: string[];
  matchedRule?: string;
}

/**
 * Triage an incoming lead against the workspace's knowledge base rules.
 * Called when a new deal/lead is created or when processing an incoming message.
 *
 * Checks:
 * 1. Service radius (if address is provided and geocoded)
 * 2. Negative scope rules (from BusinessKnowledge)
 * 3. Returns recommendation + flags for the agent to act on
 *
 * Policy:
 * - Do not auto-decline leads.
 * - Risky or unclear leads should be held for review with warning flags.
 */
export async function triageIncomingLead(
  workspaceId: string,
  leadData: {
    title?: string;
    description?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<TriageResult> {
  const flags: string[] = [];
  let matchedRule: string | undefined;

  try {
    // 1. Fetch business profile for service radius check
    const profile = await db.businessProfile.findFirst({
      where: { user: { workspaceId } },
      select: {
        baseSuburb: true,
        serviceRadius: true,
        serviceSuburbs: true,
      },
    });

    // 2. Fetch negative scope rules
    const negativeRules = await db.businessKnowledge.findMany({
      where: { workspaceId, category: "NEGATIVE_SCOPE" },
      select: { ruleContent: true },
    });

    // 3. Check negative scope
    const leadText = [
      leadData.title || "",
      leadData.description || "",
    ]
      .join(" ")
      .toLowerCase();

    for (const rule of negativeRules) {
      const ruleWords = rule.ruleContent
        .toLowerCase()
        .replace(/^no\s+/i, "")
        .trim();

      if (leadText.includes(ruleWords)) {
        flags.push(`Needs review: ${rule.ruleContent}`);
        matchedRule = rule.ruleContent;
      }
    }

    if (matchedRule) {
      return { recommendation: "HOLD_REVIEW", flags, matchedRule };
    }

    // 4. Check service radius (simple distance estimation)
    if (profile && leadData.latitude && leadData.longitude) {
      // Try to get the workspace's base coordinates from any previous deal
      const baseDeal = await db.deal.findFirst({
        where: {
          workspaceId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { latitude: true, longitude: true },
        orderBy: { createdAt: "asc" },
      });

      if (baseDeal?.latitude && baseDeal?.longitude) {
        const distance = haversineKm(
          baseDeal.latitude,
          baseDeal.longitude,
          leadData.latitude,
          leadData.longitude
        );

        if (distance > (profile.serviceRadius || 20)) {
          flags.push(
            `Needs review: ${Math.round(distance)}km away (normal limit: ${profile.serviceRadius}km)`
          );
          return { recommendation: "HOLD_REVIEW", flags };
        }

        if (distance > (profile.serviceRadius || 20) * 0.8) {
          flags.push(`Needs review: ${Math.round(distance)}km away (near service limit)`);
        }
      }
    }

    if (!leadData.address?.trim()) {
      flags.push("Needs review: Missing address");
    }

    // 5. If we have services defined, check if the lead matches any known service
    const serviceRules = await db.businessKnowledge.findMany({
      where: { workspaceId, category: "SERVICE" },
      select: { ruleContent: true, metadata: true },
    });

    if (serviceRules.length > 0) {
      const hasMatch = serviceRules.some((s) =>
        leadText.includes(s.ruleContent.toLowerCase())
      );
      if (hasMatch) {
        // Known service — can potentially quote
        return { recommendation: flags.length > 0 ? "HOLD_REVIEW" : "QUOTE", flags };
      }
    }

    return { recommendation: flags.length > 0 ? "HOLD_REVIEW" : "ACCEPT", flags };
  } catch (err) {
    console.error("[Triage] Error:", err);
    return { recommendation: "ACCEPT", flags: ["Triage error — defaulting to accept"] };
  }
}

/**
 * Save the triage recommendation on a deal.
 */
export async function saveTriageRecommendation(
  dealId: string,
  result: TriageResult
): Promise<void> {
  try {
    const updatedDeal = await db.deal.update({
      where: { id: dealId },
      data: {
        aiTriageRecommendation: result.recommendation,
        agentFlags: result.flags.length > 0 ? result.flags : undefined,
      },
      select: {
        contactId: true,
      },
    });

    if (result.recommendation === "HOLD_REVIEW") {
      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Lead held for review",
          content:
            result.flags.length > 0
              ? result.flags.join("\n")
              : "Lead needs manual review before Tracey continues.",
          dealId,
          contactId: updatedDeal.contactId ?? undefined,
        },
      });
    }
  } catch (err) {
    console.error("[Triage] Failed to save recommendation:", err);
  }
}

/**
 * Haversine formula — distance between two lat/lng pairs in km.
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
