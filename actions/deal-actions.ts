"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getDealHealth, type DealHealth } from "@/lib/pipeline";

// ─── Types ──────────────────────────────────────────────────────────

// Maps Prisma DealStage enum to frontend lowercase strings
const STAGE_MAP: Record<string, string> = {
  NEW: "new",
  CONTACTED: "contacted",
  NEGOTIATION: "negotiation",
  INVOICED: "invoiced",
  WON: "won",
  LOST: "lost",
};

const STAGE_REVERSE: Record<string, string> = {
  new: "NEW",
  contacted: "CONTACTED",
  negotiation: "NEGOTIATION",
  invoiced: "INVOICED",
  won: "WON",
  lost: "LOST",
};

export interface DealView {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: string;
  lastActivityDate: Date;
  contactName: string;
  contactAvatar?: string;
  health: DealHealth;
  metadata?: Record<string, unknown>;
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateDealSchema = z.object({
  title: z.string().min(1),
  company: z.string().optional(),
  value: z.number().min(0).default(0),
  stage: z.string().default("new"),
  contactId: z.string(),
  workspaceId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const UpdateStageSchema = z.object({
  dealId: z.string(),
  stage: z.string(),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Fetch all deals for a workspace, transformed for the frontend.
 * Includes computed lastActivityDate and health status.
 */
export async function getDeals(workspaceId: string): Promise<DealView[]> {
  const deals = await db.deal.findMany({
    where: { workspaceId },
    include: {
      contact: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return deals.map((deal) => {
    const lastActivityDate = deal.activities[0]?.createdAt ?? deal.createdAt;
    const health = getDealHealth(lastActivityDate);

    return {
      id: deal.id,
      title: deal.title,
      company: deal.company ?? deal.contact.company ?? "",
      value: deal.value,
      stage: STAGE_MAP[deal.stage] ?? "new",
      lastActivityDate,
      contactName: deal.contact.name,
      contactAvatar: deal.contact.avatarUrl ?? undefined,
      health,
      metadata: (deal.metadata as Record<string, unknown>) ?? undefined,
    };
  });
}

/**
 * Create a new deal.
 */
export async function createDeal(input: z.infer<typeof CreateDealSchema>) {
  const parsed = CreateDealSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { title, company, value, stage, contactId, workspaceId, metadata } = parsed.data;
  const prismaStage = STAGE_REVERSE[stage] ?? "NEW";

  const deal = await db.deal.create({
    data: {
      title,
      company,
      value,
      stage: prismaStage as "NEW" | "CONTACTED" | "NEGOTIATION" | "INVOICED" | "WON" | "LOST",
      contactId,
      workspaceId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });

  // Auto-log the creation as an activity
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Deal created",
      content: `Created deal "${title}" worth $${value.toLocaleString()}`,
      dealId: deal.id,
      contactId,
    },
  });

  return { success: true, dealId: deal.id };
}

/**
 * Persist a Kanban drag-and-drop stage change.
 */
export async function updateDealStage(dealId: string, stage: string) {
  const parsed = UpdateStageSchema.safeParse({ dealId, stage });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const prismaStage = STAGE_REVERSE[parsed.data.stage];
  if (!prismaStage) {
    return { success: false, error: `Invalid stage: ${stage}` };
  }

  await db.deal.update({
    where: { id: parsed.data.dealId },
    data: {
      stage: prismaStage as "NEW" | "CONTACTED" | "NEGOTIATION" | "INVOICED" | "WON" | "LOST",
    },
  });

  // Auto-log the stage change
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Stage changed",
      content: `Deal moved to ${parsed.data.stage}`,
      dealId: parsed.data.dealId,
    },
  });

  return { success: true };
}

/**
 * Update deal metadata (polymorphic vertical-specific data).
 */
export async function updateDealMetadata(
  dealId: string,
  metadata: Record<string, unknown>
) {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) return { success: false, error: "Deal not found" };

  const existing = (deal.metadata as Record<string, unknown>) ?? {};

  await db.deal.update({
    where: { id: dealId },
    data: { metadata: JSON.parse(JSON.stringify({ ...existing, ...metadata })) },
  });

  return { success: true };
}

/**
 * Delete a deal and its related data (cascade).
 */
export async function deleteDeal(dealId: string) {
  await db.deal.delete({ where: { id: dealId } });
  return { success: true };
}
