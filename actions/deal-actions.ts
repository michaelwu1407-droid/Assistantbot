"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getDealHealth, type DealHealth } from "@/lib/pipeline";
import { evaluateAutomations } from "./automation-actions";

// ─── Types ──────────────────────────────────────────────────────────

// Maps Prisma DealStage enum to frontend column ids (6-column CRM)
const STAGE_MAP: Record<string, string> = {
  NEW: "new_request",
  CONTACTED: "quote_sent",
  NEGOTIATION: "scheduled",
  SCHEDULED: "scheduled",
  PIPELINE: "pipeline",
  INVOICED: "ready_to_invoice",
  WON: "completed",
  LOST: "lost",
  DELETED: "deleted",
};

const STAGE_REVERSE: Record<string, string> = {
  new: "NEW",
  new_request: "NEW",
  quote_sent: "CONTACTED",
  scheduled: "SCHEDULED",
  pipeline: "PIPELINE",
  ready_to_invoice: "INVOICED",
  completed: "WON",
  lost: "LOST",
  deleted: "DELETED",
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
  daysInStage: number;
  stageChangedAt: Date;
  metadata?: Record<string, unknown>;
  address?: string;
  latitude?: number;
  longitude?: number;
  contactPhone?: string;
  description?: string;
  jobStatus?: string;
  status?: string;
  scheduledAt?: Date | null;
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateDealSchema = z.object({
  title: z.string().min(1),
  company: z.string().optional(),
  value: z.number().min(0).default(0),
  stage: z.string().default("new"),
  contactId: z.string(),
  workspaceId: z.string(),
  address: z.string().optional(),
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
 * Optionally filter by contactId.
 */
const DELETED_DAYS_THRESHOLD = 30;

export async function getDeals(workspaceId: string, contactId?: string): Promise<DealView[]> {
  try {
    const where: Record<string, unknown> = { workspaceId };
    if (contactId) where.contactId = contactId;

    const deals = await db.deal.findMany({
      where,
      include: {
        contact: true,
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Autoclear: permanently delete deals that have been in DELETED for 30+ days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DELETED_DAYS_THRESHOLD);
    const toDelete = deals.filter(
      (d) => d.stage === "DELETED" && new Date(d.stageChangedAt) < cutoff
    );
    for (const d of toDelete) {
      await db.deal.delete({ where: { id: d.id } }).catch(() => {});
    }
    const filtered = deals.filter((d) => !toDelete.find((t) => t.id === d.id));

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true },
    });
    const pipelineSettings = (workspace?.settings as { followUpDays?: number; urgentDays?: number }) ?? {};
    const healthOptions = {
      daysUntilStale: pipelineSettings.followUpDays,
      daysUntilRotting: pipelineSettings.urgentDays,
    };

    return filtered.map((deal) => {
      const lastActivityDate = deal.activities[0]?.createdAt ?? deal.createdAt;
      const health = getDealHealth(lastActivityDate, healthOptions);

      const daysInStage = Math.floor(
        (Date.now() - new Date(deal.stageChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: deal.id,
        title: deal.title,
        company: deal.contact.company ?? "",
        value: deal.value ? deal.value.toNumber() : 0,
        stage: STAGE_MAP[deal.stage] ?? "new_request",
        lastActivityDate,
        contactName: deal.contact.name,
        contactAvatar: deal.contact.avatarUrl ?? undefined,
        health,
        daysInStage,
        stageChangedAt: deal.stageChangedAt,
        metadata: (deal.metadata as Record<string, unknown>) ?? undefined,
        address: deal.address ?? undefined,
        latitude: deal.latitude ?? undefined,
        longitude: deal.longitude ?? undefined,
        scheduledAt: deal.scheduledAt ?? undefined,
      };
    });
  } catch (error) {
    console.error("Database Error in getDeals:", error);
    throw error;
  }
}

/**
 * Create a new deal.
 */
export async function createDeal(input: z.infer<typeof CreateDealSchema>) {
  const parsed = CreateDealSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { title, value, stage, contactId, workspaceId, address, metadata } = parsed.data;
  const prismaStage = STAGE_REVERSE[stage] ?? "NEW";

  const deal = await db.deal.create({
    data: {
      title,
      value,
      stage: prismaStage as "NEW" | "CONTACTED" | "NEGOTIATION" | "SCHEDULED" | "PIPELINE" | "INVOICED" | "WON" | "LOST",
      contactId,
      workspaceId,
      address,
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

  const deal = await db.deal.update({
    where: { id: parsed.data.dealId },
    data: {
      stage: prismaStage as "NEW" | "CONTACTED" | "NEGOTIATION" | "SCHEDULED" | "PIPELINE" | "INVOICED" | "WON" | "LOST" | "DELETED",
      stageChangedAt: new Date(),
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

  // Trigger Automation
  // We pass the UPPERCASE stage because that's what is stored in the DB and Automation config
  await evaluateAutomations(deal.workspaceId, {
    type: "stage_change",
    dealId: deal.id,
    stage: prismaStage
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
/**
 * Fuzzy search deals.
 */
import { fuzzySearch, type SearchableItem } from "@/lib/search";

interface SearchableDeal extends SearchableItem {
  deal: DealView;
}

export async function searchDeals(workspaceId: string, query: string): Promise<DealView[]> {
  const deals = await getDeals(workspaceId);

  const searchable: SearchableDeal[] = deals.map((deal) => ({
    id: deal.id,
    searchableFields: [deal.title, deal.company, deal.contactName].filter(Boolean),
    deal,
  }));

  const results = fuzzySearch(searchable, query);
  return results.map((r) => r.item.deal);
}
