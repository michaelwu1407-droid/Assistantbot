"use server";

import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────

export interface KnowledgeRule {
  id: string;
  category: "SERVICE" | "PRICING" | "NEGATIVE_SCOPE";
  ruleContent: string;
  metadata: Record<string, unknown> | null;
  source: string;
  createdAt: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────

async function getWorkspaceId(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Not authenticated");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });
  if (!user) throw new Error("User not found");
  return user.workspaceId;
}

// ─── Queries ────────────────────────────────────────────────────────

export async function getKnowledgeRules(
  category?: "SERVICE" | "PRICING" | "NEGATIVE_SCOPE"
): Promise<KnowledgeRule[]> {
  const workspaceId = await getWorkspaceId();
  const where: Record<string, unknown> = { workspaceId };
  if (category) where.category = category;

  const rules = await db.businessKnowledge.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return rules.map((r) => ({
    id: r.id,
    category: r.category as KnowledgeRule["category"],
    ruleContent: r.ruleContent,
    metadata: r.metadata as Record<string, unknown> | null,
    source: r.source,
    createdAt: r.createdAt,
  }));
}

export async function getNegativeScope(): Promise<KnowledgeRule[]> {
  return getKnowledgeRules("NEGATIVE_SCOPE");
}

export async function getServices(): Promise<KnowledgeRule[]> {
  return getKnowledgeRules("SERVICE");
}

// ─── Mutations ──────────────────────────────────────────────────────

export async function addKnowledgeRule(
  category: "SERVICE" | "PRICING" | "NEGATIVE_SCOPE",
  ruleContent: string,
  metadata?: Record<string, unknown>,
  source: string = "manual"
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!ruleContent.trim()) {
    return { success: false, error: "Rule content is required" };
  }

  try {
    const workspaceId = await getWorkspaceId();
    const rule = await db.businessKnowledge.create({
      data: {
        category,
        ruleContent: ruleContent.trim(),
        metadata: metadata ? (metadata as any) : undefined,
        source,
        workspaceId,
      },
    });
    revalidatePath("/dashboard/settings/knowledge");
    return { success: true, id: rule.id };
  } catch (err) {
    console.error("[Knowledge] Add failed:", err);
    return { success: false, error: "Failed to add rule" };
  }
}

export async function updateKnowledgeRule(
  id: string,
  ruleContent: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.businessKnowledge.update({
      where: { id },
      data: {
        ruleContent: ruleContent.trim(),
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
    revalidatePath("/dashboard/settings/knowledge");
    return { success: true };
  } catch (err) {
    console.error("[Knowledge] Update failed:", err);
    return { success: false, error: "Failed to update rule" };
  }
}

export async function deleteKnowledgeRule(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.businessKnowledge.delete({ where: { id } });
    revalidatePath("/dashboard/settings/knowledge");
    return { success: true };
  } catch (err) {
    console.error("[Knowledge] Delete failed:", err);
    return { success: false, error: "Failed to delete rule" };
  }
}

// ─── Bulk Import (from scraper) ─────────────────────────────────────

export async function bulkImportKnowledge(
  rules: {
    category: "SERVICE" | "PRICING" | "NEGATIVE_SCOPE";
    ruleContent: string;
    metadata?: Record<string, unknown>;
  }[]
): Promise<{ success: boolean; count: number }> {
  try {
    const workspaceId = await getWorkspaceId();
    const result = await db.businessKnowledge.createMany({
      data: rules.map((r) => ({
        category: r.category,
        ruleContent: r.ruleContent.trim(),
        metadata: r.metadata ? (r.metadata as any) : undefined,
        source: "scrape",
        workspaceId,
      })),
    });
    revalidatePath("/dashboard/settings/knowledge");
    return { success: true, count: result.count };
  } catch (err) {
    console.error("[Knowledge] Bulk import failed:", err);
    return { success: false, count: 0 };
  }
}

// ─── Service Area (BusinessProfile) ─────────────────────────────────

export async function updateServiceArea(
  serviceRadius: number,
  serviceSuburbs: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("Not authenticated");
    await db.businessProfile.update({
      where: { userId },
      data: {
        serviceRadius,
        serviceSuburbs: serviceSuburbs.filter((s) => s.trim()),
      },
    });
    revalidatePath("/dashboard/settings/knowledge");
    return { success: true };
  } catch (err) {
    console.error("[Knowledge] Update service area failed:", err);
    return { success: false, error: "Failed to update service area" };
  }
}

export async function getServiceArea(): Promise<{
  serviceRadius: number;
  serviceSuburbs: string[];
  baseSuburb: string;
} | null> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return null;
    const profile = await db.businessProfile.findUnique({
      where: { userId },
      select: { serviceRadius: true, serviceSuburbs: true, baseSuburb: true },
    });
    if (!profile) return null;
    return {
      serviceRadius: profile.serviceRadius,
      serviceSuburbs: (profile.serviceSuburbs as string[]) || [],
      baseSuburb: profile.baseSuburb,
    };
  } catch {
    return null;
  }
}
