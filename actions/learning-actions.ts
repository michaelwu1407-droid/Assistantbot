"use server";

import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { createNotification } from "./notification-actions";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────

export interface DeviationEventData {
  id: string;
  dealId: string;
  dealTitle: string;
  aiRecommendation: string;
  userAction: string;
  ruleContent: string | null;
  resolved: boolean;
  resolvedAction: string | null;
  createdAt: Date;
}

// ─── Deviation Detection ────────────────────────────────────────────

/**
 * Called when a deal's stage changes. Checks if the AI recommended DECLINE
 * but the user overrode it (moved to a positive stage like SCHEDULED/WON).
 */
export async function checkForDeviation(
  dealId: string,
  newStage: string,
  userId: string
): Promise<void> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        title: true,
        aiTriageRecommendation: true,
        workspaceId: true,
        contact: { select: { name: true } },
      },
    });

    if (!deal || !deal.aiTriageRecommendation) return;

    const aiSaidDecline = ["DECLINE", "OUT_OF_AREA"].includes(
      deal.aiTriageRecommendation
    );
    const userOverrode = [
      "SCHEDULED",
      "CONTACTED",
      "NEGOTIATION",
      "PIPELINE",
      "WON",
    ].includes(newStage.toUpperCase());

    if (!aiSaidDecline || !userOverrode) return;

    // Find the specific negative-scope rule that triggered the decline
    const agentFlags = (deal as Record<string, unknown>).agentFlags as
      | string[]
      | null;
    const triggeredRule = agentFlags?.find(
      (f: string) =>
        f.includes("Negative scope") || f.includes("Out of area")
    );

    // Log the deviation
    await db.deviationEvent.create({
      data: {
        dealId: deal.id,
        aiRecommendation: deal.aiTriageRecommendation,
        userAction: newStage.toUpperCase(),
        ruleContent: triggeredRule || null,
        workspaceId: deal.workspaceId,
      },
    });

    // Find the workspace owner to notify
    const owner = await db.user.findFirst({
      where: { workspaceId: deal.workspaceId, role: "OWNER" },
      select: { id: true },
    });

    if (owner) {
      const contactName = deal.contact?.name || "a customer";
      const ruleText = triggeredRule
        ? triggeredRule.replace("Negative scope: ", "")
        : deal.aiTriageRecommendation;

      await createNotification({
        userId: owner.id,
        title: "AI Learning Insight",
        message: `I recommended declining the "${deal.title}" job for ${contactName} (reason: ${ruleText}), but you accepted it. Should I remove this rule from my negative scope?`,
        type: "INFO",
        actionType: "RESOLVE_DEVIATION",
        actionPayload: { dealId: deal.id, deviationRule: triggeredRule },
      });
    }
  } catch (err) {
    console.error("[Learning] Deviation check failed:", err);
  }
}

// ─── Fetch Unresolved Deviations ────────────────────────────────────

export async function getUnresolvedDeviations(): Promise<DeviationEventData[]> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return [];
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });
    if (!user) return [];

    const events = await db.deviationEvent.findMany({
      where: { workspaceId: user.workspaceId, resolved: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Enrich with deal titles
    const dealIds = events.map((e) => e.dealId);
    const deals = await db.deal.findMany({
      where: { id: { in: dealIds } },
      select: { id: true, title: true },
    });
    const dealMap = new Map(deals.map((d) => [d.id, d.title]));

    return events.map((e) => ({
      id: e.id,
      dealId: e.dealId,
      dealTitle: dealMap.get(e.dealId) || "Unknown",
      aiRecommendation: e.aiRecommendation,
      userAction: e.userAction,
      ruleContent: e.ruleContent,
      resolved: e.resolved,
      resolvedAction: e.resolvedAction,
      createdAt: e.createdAt,
    }));
  } catch (err) {
    console.error("[Learning] Fetch deviations failed:", err);
    return [];
  }
}

// ─── Resolve Deviation ──────────────────────────────────────────────

/**
 * User resolves a deviation event:
 * - "REMOVE_RULE": Delete the negative-scope rule from business_knowledge
 * - "KEEP_RULE": Keep the rule; this was a one-off exception
 */
export async function resolveDeviation(
  deviationId: string,
  action: "REMOVE_RULE" | "KEEP_RULE"
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const deviation = await db.deviationEvent.findUnique({
      where: { id: deviationId },
    });
    if (!deviation) return { success: false, error: "Deviation not found" };

    // Mark resolved
    await db.deviationEvent.update({
      where: { id: deviationId },
      data: { resolved: true, resolvedAction: action },
    });

    // If removing the rule, find and delete it from BusinessKnowledge
    if (action === "REMOVE_RULE" && deviation.ruleContent) {
      const ruleText = deviation.ruleContent
        .replace("Negative scope: ", "")
        .trim();

      // Find matching negative scope rules
      const matchingRules = await db.businessKnowledge.findMany({
        where: {
          workspaceId: deviation.workspaceId,
          category: "NEGATIVE_SCOPE",
          ruleContent: { contains: ruleText },
        },
      });

      if (matchingRules.length > 0) {
        await db.businessKnowledge.deleteMany({
          where: { id: { in: matchingRules.map((r) => r.id) } },
        });
      }
    }

    revalidatePath("/dashboard/settings/knowledge");
    return { success: true };
  } catch (err) {
    console.error("[Learning] Resolve deviation failed:", err);
    return { success: false, error: "Failed to resolve deviation" };
  }
}
