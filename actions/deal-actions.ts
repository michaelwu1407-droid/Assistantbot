"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getDealHealth, type DealHealth } from "@/lib/pipeline";
import { evaluateAutomations } from "./automation-actions";
import { getAuthUser } from "@/lib/auth";
import { MonitoringService } from "@/lib/monitoring";

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

// Human-readable labels for activity log (e.g. "Moved to Deleted jobs")
const STAGE_ACTIVITY_LABELS: Record<string, string> = {
  new: "New request",
  new_request: "New request",
  quote_sent: "Quote sent",
  scheduled: "Scheduled",
  pipeline: "Pipeline",
  ready_to_invoice: "Ready to invoice",
  completed: "Completed",
  lost: "Lost",
  deleted: "Deleted jobs",
};

export interface DealView {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: string;
  lastActivityDate: Date;
  createdAt: Date;
  contactName: string;
  contactId?: string;
  contactAvatar?: string;
  health: DealHealth;
  daysInStage: number;
  stageChangedAt: Date;
  metadata?: Record<string, unknown>;
  address?: string;
  isDraft: boolean;
  invoicedAmount?: number;
  latitude?: number;
  longitude?: number;
  contactPhone?: string;
  description?: string;
  jobStatus?: string;
  status?: string;
  scheduledAt?: Date | null;
  workspaceId: string;
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
  scheduledAt: z.union([z.coerce.date(), z.string().transform((s) => new Date(s))]).optional(),
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
      await db.deal.delete({ where: { id: d.id } }).catch(() => { });
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
        createdAt: deal.createdAt,
        contactName: deal.contact.name,
        contactId: deal.contactId ?? undefined,
        contactAvatar: deal.contact.avatarUrl ?? undefined,
        health,
        daysInStage,
        stageChangedAt: deal.stageChangedAt,
        metadata: (deal.metadata as Record<string, unknown>) ?? undefined,
        address: deal.address ?? undefined,
        isDraft: deal.isDraft,
        invoicedAmount: deal.invoicedAmount ?? undefined,
        latitude: deal.latitude ?? undefined,
        longitude: deal.longitude ?? undefined,
        scheduledAt: deal.scheduledAt ?? undefined,
        workspaceId: deal.workspaceId,
      };
    });
  } catch (error) {
    console.error("Database Error in getDeals:", error);
    MonitoringService.logError(error as Error, { action: "getDeals", workspaceId });
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

  const { title, value, stage, contactId, workspaceId, address, metadata, scheduledAt } = parsed.data;
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
      scheduledAt: scheduledAt ?? undefined,
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

  MonitoringService.trackEvent("deal_created", {
    dealId: deal.id,
    workspaceId,
    value,
    stage: prismaStage,
  });

  return { success: true, dealId: deal.id };
}

/**
 * Persist a Kanban drag-and-drop stage change.
 */
export async function updateDealStage(dealId: string, stage: string) {
  try {
    const parsed = UpdateStageSchema.safeParse({ dealId, stage });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const prismaStage = STAGE_REVERSE[parsed.data.stage];
    if (!prismaStage) {
      return { success: false, error: `Invalid stage: ${stage}` };
    }

    // Save previous stage for undo support
    const currentDeal = await db.deal.findUnique({
      where: { id: parsed.data.dealId },
      select: { stage: true, metadata: true },
    });
    const currentMeta = (currentDeal?.metadata as Record<string, unknown>) ?? {};

    const deal = await db.deal.update({
      where: { id: parsed.data.dealId },
      data: {
        stage: prismaStage as "NEW" | "CONTACTED" | "NEGOTIATION" | "SCHEDULED" | "PIPELINE" | "INVOICED" | "WON" | "LOST" | "DELETED",
        stageChangedAt: new Date(),
        metadata: JSON.parse(JSON.stringify({ ...currentMeta, previousStage: currentDeal?.stage ?? "NEW" })),
      },
    });

    // Activity: who did it + specific change (e.g. "Moved to Deleted jobs")
    const stageLabel = STAGE_ACTIVITY_LABELS[parsed.data.stage] ?? parsed.data.stage;
    let userName = "Someone";
    let userId: string | undefined;
    try {
      const auth = await getAuthUser();
      userName = auth.name;
      const dbUser = await db.user.findFirst({
        where: { workspaceId: deal.workspaceId, email: auth.email ?? undefined },
        select: { id: true },
      });
      if (dbUser) userId = dbUser.id;
    } catch {
      // not authenticated (e.g. automation)
    }
    await db.activity.create({
      data: {
        type: "NOTE",
        title: `Moved to ${stageLabel}`,
        content: `Stage changed to ${stageLabel}.`,
        description: `— ${userName}`,
        dealId: parsed.data.dealId,
        contactId: deal.contactId ?? undefined,
        ...(userId && { userId }),
      },
    });

    // Trigger Automation (non-blocking; don't fail the move if automations error)
    try {
      await evaluateAutomations(deal.workspaceId, {
        type: "stage_change",
        dealId: deal.id,
        stage: prismaStage,
      });
    } catch (automationErr) {
      console.warn("Automation evaluation failed after stage update:", automationErr);
    }

    return { success: true };
  } catch (err) {
    console.error("updateDealStage error:", err);
    MonitoringService.logError(err as Error, { action: "updateDealStage", dealId });
    const message = err instanceof Error ? err.message : "Failed to update stage";
    return { success: false, error: message };
  }
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
  const hasNotes = "notes" in metadata && metadata.notes !== existing.notes;

  await db.deal.update({
    where: { id: dealId },
    data: { metadata: JSON.parse(JSON.stringify({ ...existing, ...metadata })) },
  });

  // Log activity when card is edited (e.g. notes updated)
  let userName = "Someone";
  let userId: string | undefined;
  try {
    const auth = await getAuthUser();
    userName = auth.name;
    const dbUser = await db.user.findFirst({
      where: { workspaceId: deal.workspaceId, email: auth.email ?? undefined },
      select: { id: true },
    });
    if (dbUser) userId = dbUser.id;
  } catch {
    // not authenticated
  }
  const changeTitle = hasNotes ? "Notes updated" : "Details updated";
  await db.activity.create({
    data: {
      type: "NOTE",
      title: changeTitle,
      content: hasNotes ? "Deal notes were updated." : "Deal details were updated.",
      description: `— ${userName}`,
      dealId,
      contactId: deal.contactId ?? undefined,
      ...(userId && { userId }),
    },
  });

  return { success: true };
}

/**
 * Update deal core fields (title, value, stage). Used by the deal edit page.
 */
export async function updateDeal(
  dealId: string,
  data: { title?: string; value?: number; stage?: string; isDraft?: boolean; invoicedAmount?: number | null }
) {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: { workspace: { select: { autoUpdateGlossary: true } } }
  });
  if (!deal) return { success: false, error: "Deal not found" };

  type DealUpdate = Parameters<typeof db.deal.update>[0]["data"];
  const update: DealUpdate = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.value !== undefined) update.value = data.value;
  if (data.stage !== undefined) {
    const prismaStage = STAGE_REVERSE[data.stage];
    if (!prismaStage) return { success: false, error: `Invalid stage: ${data.stage}` };
    update.stage = prismaStage as DealUpdate["stage"];
    update.stageChangedAt = new Date();
  }
  if (data.isDraft !== undefined) update.isDraft = data.isDraft;
  if (data.invoicedAmount !== undefined) {
    update.invoicedAmount = data.invoicedAmount;
  }

  await db.deal.update({
    where: { id: dealId },
    data: update,
  });

  let userName = "Someone";
  let userId: string | undefined;
  try {
    const auth = await getAuthUser();
    userName = auth.name;
    const dbUser = await db.user.findFirst({
      where: { workspaceId: deal.workspaceId, email: auth.email ?? undefined },
      select: { id: true },
    });
    if (dbUser) userId = dbUser.id;
  } catch {
    // not authenticated
  }
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Deal updated",
      content: "Title, value or stage was changed.",
      description: `— ${userName}`,
      dealId,
      contactId: deal.contactId ?? undefined,
      ...(userId && { userId }),
    },
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
