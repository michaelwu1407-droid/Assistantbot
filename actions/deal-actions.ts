"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getDealHealth, type DealHealth } from "@/lib/pipeline";
import { evaluateAutomations } from "./automation-actions";
import { createNotification } from "./notification-actions";
import { getAuthUser } from "@/lib/auth";
import { MonitoringService } from "@/lib/monitoring";
import { maybeCreatePricingSuggestionFromConfirmedJob } from "@/lib/pricing-learning";
import { triageIncomingLead, saveTriageRecommendation } from "@/lib/ai/triage";
import { checkForDeviation } from "./learning-actions";
import { findNearbyBookings } from "./geo-actions";
import { createTask } from "./task-actions";
import { requireCurrentWorkspaceAccess, requireDealInCurrentWorkspace } from "@/lib/workspace-access";
import { removeGoogleCalendarEventForDeal, syncGoogleCalendarEventForDeal } from "@/lib/workspace-calendar";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";
import { recordSyncIssue } from "@/lib/sync-issues";
import { kanbanStageRequiresScheduledDate } from "@/lib/deal-stage-rules";
import { logger } from "@/lib/logging";
import {
  KANBAN_COLUMN_SORT_ORDER,
  kanbanColumnIdForDealStage,
} from "@/lib/kanban-columns";

// ─── Types ──────────────────────────────────────────────────────────

// Maps Prisma DealStage enum to frontend column ids (6-column CRM)
// NEGOTIATION and PIPELINE are legacy enum values — both map to their clean equivalents.
const STAGE_MAP: Record<string, string> = {
  NEW: "new_request",
  CONTACTED: "quote_sent",
  NEGOTIATION: "scheduled",   // legacy alias → scheduled
  SCHEDULED: "scheduled",
  PIPELINE: "quote_sent",     // legacy alias → quote_sent (was silently remapped via kanban-columns anyway)
  INVOICED: "ready_to_invoice",
  PENDING_COMPLETION: "pending_approval",
  WON: "completed",
  LOST: "lost",
  DELETED: "deleted",
};

const STAGE_REVERSE: Record<string, string> = {
  new: "NEW",
  new_request: "NEW",
  quote_sent: "CONTACTED",
  scheduled: "SCHEDULED",
  // "pipeline" removed — no longer a valid frontend column; falls back to CONTACTED via quote_sent
  ready_to_invoice: "INVOICED",
  pending_approval: "PENDING_COMPLETION",
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
  ready_to_invoice: "Ready to invoice",
  pending_approval: "Pending approval",
  completed: "Completed",
  lost: "Lost",
  deleted: "Deleted",
};

async function queueCompletionFollowUp(
  workspaceId: string,
  dealId: string,
  contactId?: string | null,
  dealTitle?: string
) {
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 1);

  const existingTask = await db.task.findFirst({
    where: { dealId, completed: false, title: "Post-job follow-up" },
    select: { id: true },
  });

  if (!existingTask) {
    await createTask({
      title: "Post-job follow-up",
      description: "Confirm the final outcome, amount invoiced, and any notes from the completed job.",
      dueAt,
      dealId,
      contactId: contactId ?? undefined,
    });
  }

  const users = await db.user.findMany({
    where: { workspaceId },
    select: { id: true },
  });

  await Promise.all(users.map((user) =>
    createNotification({
      userId: user.id,
      title: "Post-job follow-up needed",
      message: `Log the final outcome and invoiced amount for ${dealTitle ?? "this completed job"}.`,
      type: "INFO",
      link: `/crm/deals/${dealId}`,
      actionType: "LOG_COMPLETION_OUTCOME",
      actionPayload: { dealId },
    })
  ));
}

async function fireBookingConfirmation(
  dealId: string,
  previousStage: PrismaStage | string | null | undefined,
  nextStage: PrismaStage
) {
  if (previousStage === "SCHEDULED" || nextStage !== "SCHEDULED") {
    return;
  }

  try {
    const { sendConfirmationSMS } = await import("./messaging-actions");
    await sendConfirmationSMS(dealId);
  } catch (confirmationErr) {
    console.warn("Booking confirmation hook failed after stage transition:", confirmationErr);
  }
}

type PrismaStage = "NEW" | "CONTACTED" | "NEGOTIATION" | "SCHEDULED" | "PIPELINE" | "INVOICED" | "PENDING_COMPLETION" | "WON" | "LOST" | "DELETED";

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
  assignedToId?: string | null;
  assignedToName?: string | null;
  // Stale Job Recovery System fields
  isStale?: boolean;
  actualOutcome?: string | null;
  outcomeNotes?: string | null;
  // AI Agent Triage Flags
  agentFlags?: string[];
  // Lead Source
  source?: string | null;
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
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.union([z.coerce.date(), z.string().transform((s) => new Date(s))]).optional(),
  assignedToId: z.string().optional().nullable(),
});

const UpdateStageSchema = z.object({
  dealId: z.string(),
  stage: z.string(),
});

const PersistKanbanOrderSchema = z.object({
  columnId: z.string(),
  orderedDealIds: z.array(z.string()).min(1),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Fetch all deals for a workspace, transformed for the frontend.
 * Includes computed lastActivityDate and health status.
 * Optionally filter by contactId.
 */
const DELETED_DAYS_THRESHOLD = 30;

export async function getDeals(
  workspaceId: string,
  contactId?: string,
  filters?: { excludeStages?: string[]; requireScheduled?: boolean; limit?: number; unbounded?: boolean }
): Promise<DealView[]> {
  try {
    const DEFAULT_DEALS_LIMIT = 300;
    const MAX_DEALS_LIMIT = 1000;
    const effectiveLimit = filters?.unbounded
      ? undefined
      : Math.max(1, Math.min(filters?.limit ?? DEFAULT_DEALS_LIMIT, MAX_DEALS_LIMIT));

    const where: Record<string, unknown> = { workspaceId };
    if (contactId) where.contactId = contactId;
    if (filters?.excludeStages?.length) {
      where.stage = { notIn: filters.excludeStages };
    }
    if (filters?.requireScheduled) {
      where.scheduledAt = { not: null };
    }

    const deals = await db.deal.findMany({
      where,
      ...(effectiveLimit ? { take: effectiveLimit } : {}),
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
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
      await db.deal.delete({ where: { id: d.id } }).catch((err) => {
        recordSyncIssue({
          workspaceId,
          dealId: d.id,
          contactId: d.contactId,
          surface: "deal_delete",
          message: `Failed to auto-delete expired deal "${d.title}": ${err instanceof Error ? err.message : String(err)}`,
        });
      });
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

    const views = filtered.map((deal) => {
      const lastActivityDate = deal.activities[0]?.createdAt ?? deal.createdAt;
      const health = getDealHealth(lastActivityDate, healthOptions);

      const daysInStage = Math.floor(
        (Date.now() - new Date(deal.stageChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: deal.id,
        title: deal.title,
        company: deal.contact.company ?? "",
        value: typeof deal.value === 'number' ? deal.value : Number(deal.value) || 0,
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
        invoicedAmount: deal.invoicedAmount !== null && deal.invoicedAmount !== undefined ? Number(deal.invoicedAmount) : undefined,
        latitude: deal.latitude ?? undefined,
        longitude: deal.longitude ?? undefined,
        scheduledAt: deal.scheduledAt ?? undefined,
        workspaceId: deal.workspaceId,
        assignedToId: deal.assignedToId ?? undefined,
        assignedToName: deal.assignedTo?.name ?? undefined,
        // Stale Job Recovery System fields
        isStale: deal.isStale,
        actualOutcome: deal.actualOutcome,
        outcomeNotes: deal.outcomeNotes,
        // AI Agent Triage Flags
        agentFlags: Array.isArray(deal.agentFlags) ? (deal.agentFlags as string[]) : undefined,
        // Lead Source
        source: deal.source ?? null,
      };
    });

    views.sort((a, b) => {
      const colA = kanbanColumnIdForDealStage(a.stage);
      const colB = kanbanColumnIdForDealStage(b.stage);
      const ia = KANBAN_COLUMN_SORT_ORDER.indexOf(colA as (typeof KANBAN_COLUMN_SORT_ORDER)[number]);
      const ib = KANBAN_COLUMN_SORT_ORDER.indexOf(colB as (typeof KANBAN_COLUMN_SORT_ORDER)[number]);
      const sa = ia === -1 ? 999 : ia;
      const sb = ib === -1 ? 999 : ib;
      if (sa !== sb) return sa - sb;
      const oa = typeof a.metadata?.kanbanOrder === "number" ? (a.metadata.kanbanOrder as number) : null;
      const ob = typeof b.metadata?.kanbanOrder === "number" ? (b.metadata.kanbanOrder as number) : null;
      if (oa !== null && ob !== null && oa !== ob) return oa - ob;
      if (oa !== null && ob === null) return -1;
      if (oa === null && ob !== null) return 1;
      return new Date(b.stageChangedAt).getTime() - new Date(a.stageChangedAt).getTime();
    });

    return views;
  } catch (error) {
    logger.error("Database error in getDeals", { component: "deal-actions", action: "getDeals", workspaceId }, error as Error);
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

  const actor = await requireCurrentWorkspaceAccess();
  if (parsed.data.workspaceId !== actor.workspaceId) {
    return { success: false, error: "Unauthorized workspace" };
  }

  const { title, value, stage, contactId, workspaceId, address, latitude, longitude, metadata, scheduledAt, assignedToId } = parsed.data;
  const prismaStage = STAGE_REVERSE[stage] ?? "NEW";

  if (prismaStage === "SCHEDULED" && !assignedToId) {
    return { success: false, error: "Assign a team member when creating a job in Scheduled stage." };
  }

  const deal = await db.deal.create({
    data: {
      title,
      value,
      stage: prismaStage as PrismaStage,
      contactId,
      assignedToId: assignedToId || null,
      workspaceId,
      address,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
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
  await recordWorkspaceAuditEvent({
    workspaceId,
    userId: actor.id,
    action: "deal.created",
    entityType: "deal",
    entityId: deal.id,
    metadata: {
      title,
      stage: prismaStage,
      value,
      contactId,
      source: "deal-actions.createDeal",
    },
  });

  // Run triage classifier on new leads
  try {
    const triageResult = await triageIncomingLead(workspaceId, {
      title,
      address: address || undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    });
    await saveTriageRecommendation(deal.id, triageResult);
  } catch {
    // Triage is non-critical — don't block deal creation
  }

  // Smart Routing: Proximity check for scheduled jobs
  if (scheduledAt && latitude !== undefined && longitude !== undefined) {
    try {
      const nearby = await findNearbyBookings(workspaceId, latitude, longitude, new Date(scheduledAt), deal.id);
      if (nearby) {
        await db.activity.create({
          data: {
            type: "NOTE",
            title: "Smart Routing Alert",
            content: `Consider grouping this booking with "${nearby.title}", which is scheduled for ${nearby.scheduledAt?.toLocaleDateString()} and is only ${nearby.distance.toFixed(1)}km away.`,
            dealId: deal.id,
            contactId,
          }
        });
      }
    } catch (routeErr) {
      console.warn("Smart routing check failed during deal creation:", routeErr);
    }
  }

  MonitoringService.trackEvent("deal_created", {
    dealId: deal.id,
    workspaceId,
    value,
    stage: prismaStage,
  });

  if (scheduledAt) {
    await syncGoogleCalendarEventForDeal(deal.id).catch((err) => {
      recordSyncIssue({
        workspaceId,
        dealId: deal.id,
        contactId,
        surface: "calendar_sync",
        message: `Calendar sync failed for new deal "${title}": ${err instanceof Error ? err.message : String(err)}`,
      });
    });
  }

  return { success: true, dealId: deal.id };
}

/**
 * Persist a Kanban drag-and-drop stage change.
 * When a team member moves to Completed, the deal goes to PENDING_COMPLETION until a manager approves.
 */
export async function updateDealStage(dealId: string, stage: string) {
  try {
    const parsed = UpdateStageSchema.safeParse({ dealId, stage });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    let prismaStage = STAGE_REVERSE[parsed.data.stage];
    if (!prismaStage) {
      return { success: false, error: `Invalid stage: ${stage}` };
    }

    const { deal: currentDeal } = await requireDealInCurrentWorkspace(parsed.data.dealId);
    if (!currentDeal) return { success: false, error: "Deal not found" };
    const currentMeta = (currentDeal.metadata as Record<string, unknown>) ?? {};

    // Cannot move to Scheduled without an assigned team member
    if (prismaStage === "SCHEDULED" && !currentDeal.assignedToId) {
      return { success: false, error: "Assign a team member before moving to Scheduled." };
    }

    // Scheduled column and later require a job date (product rule)
    if (kanbanStageRequiresScheduledDate(parsed.data.stage) && !currentDeal.scheduledAt) {
      return {
        success: false,
        error: "Set a scheduled date before moving the job to this stage.",
      };
    }

    // Use optimistic concurrency on stage writes so concurrent drags don't silently overwrite each other.
    const applyStageWithOptimisticLock = async (nextStage: PrismaStage, metadata: Record<string, unknown>) => {
      const now = new Date();
      const updated = await db.deal.updateMany({
        where: {
          id: parsed.data.dealId,
          updatedAt: currentDeal.updatedAt,
        },
        data: {
          stage: nextStage,
          stageChangedAt: now,
          metadata: JSON.parse(JSON.stringify(metadata)),
        },
      });

      if (updated.count === 0) {
        return { conflict: true as const, deal: null };
      }

      const latestDeal = await db.deal.findUnique({
        where: { id: parsed.data.dealId },
        select: { id: true, workspaceId: true, contactId: true, stage: true },
      });

      if (!latestDeal) {
        return { conflict: true as const, deal: null };
      }

      return { conflict: false as const, deal: latestDeal };
    };

    // Team members moving to Completion go to Pending approval; only managers/owners can set WON directly
    if (prismaStage === "WON") {
      let userRole: string = "TEAM_MEMBER";
      try {
        const auth = await getAuthUser();
        if (auth?.email) {
          const dbUser = await db.user.findFirst({
            where: { workspaceId: currentDeal.workspaceId, email: auth.email },
            select: { id: true, role: true },
          });
          if (dbUser) userRole = dbUser.role;
        }
      } catch {
        userRole = "TEAM_MEMBER";
      }
      if (userRole === "TEAM_MEMBER") {
        prismaStage = "PENDING_COMPLETION";
        const meta = {
          ...currentMeta,
          previousStage: currentDeal.stage ?? "NEW",
          completionRequestedAt: new Date().toISOString(),
        } as Record<string, unknown>;
        try {
          const auth = await getAuthUser();
          if (auth?.email) {
            const dbUser = await db.user.findFirst({
              where: { workspaceId: currentDeal.workspaceId, email: auth.email },
              select: { id: true },
            });
            if (dbUser) meta.completionRequestedBy = dbUser.id;
          }
        } catch {
          // leave completionRequestedBy unset
        }
        const pendingResult = await applyStageWithOptimisticLock("PENDING_COMPLETION", meta);
        if (pendingResult.conflict || !pendingResult.deal) {
          return {
            success: false,
            error: "This deal was updated by someone else. Please refresh and try again.",
            code: "CONFLICT",
          };
        }
        const deal = pendingResult.deal;
        const stageLabel = STAGE_ACTIVITY_LABELS.pending_approval ?? "Pending approval";
        let userName = "Someone";
        let userId: string | undefined;
        try {
          const auth = await getAuthUser();
          if (auth) {
            userName = auth.name;
            const dbUser = await db.user.findFirst({
              where: { workspaceId: deal.workspaceId, email: auth.email ?? undefined },
              select: { id: true },
            });
            if (dbUser) userId = dbUser.id;
          }
        } catch {
          //
        }
        await db.activity.create({
          data: {
            type: "NOTE",
            title: `Moved to ${stageLabel}`,
            content: "Awaiting manager approval to mark as completed.",
            description: `— ${userName}`,
            dealId: parsed.data.dealId,
            contactId: currentDeal.contactId ?? undefined,
            ...(userId && { userId }),
          },
        });
        await recordWorkspaceAuditEvent({
          workspaceId: deal.workspaceId,
          userId: userId ?? undefined,
          action: "deal.stage_changed",
          entityType: "deal",
          entityId: parsed.data.dealId,
          metadata: {
            previousStage: currentDeal.stage,
            nextStage: "PENDING_COMPLETION",
            source: "deal-actions.updateDealStage",
            requestedBy: userName,
          },
        });
        revalidatePath("/crm/dashboard");
        revalidatePath("/crm/deals");
        return { success: true };
      }
    }

    const stageResult = await applyStageWithOptimisticLock(
      prismaStage as PrismaStage,
      { ...currentMeta, previousStage: currentDeal?.stage ?? "NEW" }
    );
    if (stageResult.conflict || !stageResult.deal) {
      return {
        success: false,
        error: "This deal was updated by someone else. Please refresh and try again.",
        code: "CONFLICT",
      };
    }
    const deal = stageResult.deal;

    // Activity: who did it + specific change (e.g. "Moved to Deleted jobs")
    const stageLabel = STAGE_ACTIVITY_LABELS[parsed.data.stage] ?? parsed.data.stage;
    let userName = "Someone";
    let userId: string | undefined;
    try {
      const auth = await getAuthUser();
      if (auth) {
        userName = auth.name;
        const dbUser = await db.user.findFirst({
          where: { workspaceId: deal.workspaceId, email: auth.email ?? undefined },
          select: { id: true },
        });
        if (dbUser) userId = dbUser.id;
      }
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
    await recordWorkspaceAuditEvent({
      workspaceId: deal.workspaceId,
      userId: userId ?? undefined,
      action: "deal.stage_changed",
      entityType: "deal",
      entityId: parsed.data.dealId,
      metadata: {
        previousStage: currentDeal.stage,
        nextStage: prismaStage,
        source: "deal-actions.updateDealStage",
        requestedBy: userName,
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

    await fireBookingConfirmation(parsed.data.dealId, currentDeal.stage, prismaStage);

    if (prismaStage === "WON") {
      try {
        await maybeCreatePricingSuggestionFromConfirmedJob(parsed.data.dealId, {
          trigger: "completed",
          source: "updateDealStage",
        });
      } catch (learningErr) {
        console.warn("Pricing learning hook failed after stage update:", learningErr);
      }
      try {
        await queueCompletionFollowUp(deal.workspaceId, parsed.data.dealId, deal.contactId);
      } catch (followUpErr) {
        console.warn("Post-job follow-up hook failed after stage update:", followUpErr);
      }
    }

    // Check for AI triage deviation (AI said decline, user overrode)
    try {
      await checkForDeviation(parsed.data.dealId, prismaStage, userId || "");
    } catch {
      // Non-critical — don't block stage change
    }

    return { success: true };
  } catch (err) {
    logger.error("updateDealStage failed", { component: "deal-actions", action: "updateDealStage", dealId }, err as Error);
    MonitoringService.logError(err as Error, { action: "updateDealStage", dealId });
    const message = err instanceof Error ? err.message : "Failed to update stage";
    return { success: false, error: message };
  }
}

/**
 * Persist vertical order inside one Kanban column (`metadata.kanbanOrder`).
 */
export async function persistKanbanColumnOrder(
  columnId: string,
  orderedDealIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = PersistKanbanOrderSchema.safeParse({ columnId, orderedDealIds });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" };
    }

    const actor = await requireCurrentWorkspaceAccess();
    const rows = await db.deal.findMany({
      where: { id: { in: parsed.data.orderedDealIds }, workspaceId: actor.workspaceId },
      select: { id: true, metadata: true, stage: true },
    });
    if (rows.length !== parsed.data.orderedDealIds.length) {
      return { success: false, error: "One or more deals were not found." };
    }

    for (const row of rows) {
      const viewStage = STAGE_MAP[row.stage] ?? "new_request";
      const col = kanbanColumnIdForDealStage(viewStage);
      if (col !== parsed.data.columnId) {
        return { success: false, error: "Deal stage does not match this column." };
      }
    }

    const byId = new Map(rows.map((r) => [r.id, r] as const));
    await db.$transaction(
      parsed.data.orderedDealIds.map((id, index) => {
        const row = byId.get(id)!;
        const meta = { ...((row.metadata as Record<string, unknown>) ?? {}), kanbanOrder: index };
        return db.deal.update({
          where: { id },
          data: { metadata: JSON.parse(JSON.stringify(meta)) },
        });
      })
    );

    revalidatePath("/crm/dashboard");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (err) {
    logger.error("persistKanbanColumnOrder failed", { component: "deal-actions", action: "persistKanbanColumnOrder", columnId }, err as Error);
    MonitoringService.logError(err as Error, { action: "persistKanbanColumnOrder", columnId });
    return { success: false, error: err instanceof Error ? err.message : "Failed to save order" };
  }
}

/**
 * Manager/owner approves a completion request (deal in PENDING_COMPLETION). Moves to WON and clears pending metadata.
 */
export async function approveCompletion(dealId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthUser();
    let actor;
    try {
      const currentActor = await requireCurrentWorkspaceAccess();
      actor = await db.user.findUnique({
        where: { id: currentActor.id },
        select: { id: true, name: true, role: true, workspaceId: true },
      });
    } catch {
      return { success: false, error: "Not signed in." };
    }
    if (!actor) {
      return { success: false, error: "Not signed in." };
    }
    if (actor.role !== "OWNER" && actor.role !== "MANAGER")
      return { success: false, error: "Only a team manager or owner can approve completions." };

    const scopedDeal = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, stage: true, workspaceId: true, metadata: true, contactId: true },
    });
    if (!scopedDeal) return { success: false, error: "Deal not found." };
    if (scopedDeal.workspaceId !== actor.workspaceId) return { success: false, error: "Deal is in another workspace." };
    if (scopedDeal.stage !== "PENDING_COMPLETION") return { success: false, error: "This job is not pending approval." };

    const meta = (scopedDeal.metadata as Record<string, unknown>) ?? {};
    const requestedBy = meta.completionRequestedBy as string | undefined;

    await db.deal.update({
      where: { id: dealId },
      data: {
        stage: "WON",
        stageChangedAt: new Date(),
        metadata: JSON.parse(
          JSON.stringify(
            Object.fromEntries(
              Object.entries(meta).filter(
                (k) => !["completionRequestedBy", "completionRequestedAt", "previousStage"].includes(k[0])
              )
            )
          )
        ),
      },
    });

    const userName = auth?.name || actor.name || "Manager";
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Completion approved",
        content: "Manager approved and job marked as completed.",
        description: `— ${userName}`,
        dealId,
        contactId: scopedDeal.contactId ?? undefined,
        userId: actor.id,
      },
    });

    if (requestedBy && requestedBy !== actor.id) {
      await createNotification({
        userId: requestedBy,
        title: "Completion approved",
        message: `Your request to mark a job as completed was approved.`,
        type: "SUCCESS",
        link: `/crm/deals`,
      });
    }

    try {
      await maybeCreatePricingSuggestionFromConfirmedJob(dealId, {
        trigger: "completed",
        source: "approveCompletion",
      });
    } catch (learningErr) {
      console.warn("Pricing learning hook failed on approveCompletion:", learningErr);
    }
    try {
      await queueCompletionFollowUp(scopedDeal.workspaceId, dealId, scopedDeal.contactId);
    } catch (followUpErr) {
      console.warn("Post-job follow-up hook failed on approveCompletion:", followUpErr);
    }

    // Automate customer feedback request
    try {
      const { sendReviewRequestSMS } = await import("./messaging-actions");
      await sendReviewRequestSMS(dealId);
    } catch (reviewErr) {
      console.warn("Review request hook failed on approveCompletion:", reviewErr);
    }

    revalidatePath("/crm/dashboard");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (err) {
    logger.error("approveCompletion failed", { component: "deal-actions", action: "approveCompletion", dealId }, err as Error);
    return { success: false, error: err instanceof Error ? err.message : "Failed to approve." };
  }
}

/**
 * Manager/owner rejects a completion request. Reverts deal to previous stage and notifies the requester.
 */
export async function rejectCompletion(dealId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let actor;
    try {
      const currentActor = await requireCurrentWorkspaceAccess();
      actor = await db.user.findUnique({
        where: { id: currentActor.id },
        select: { id: true, name: true, role: true, workspaceId: true },
      });
    } catch {
      return { success: false, error: "Not signed in." };
    }
    if (!actor) {
      return { success: false, error: "Not signed in." };
    }
    if (actor.role !== "OWNER" && actor.role !== "MANAGER")
      return { success: false, error: "Only a team manager or owner can reject completions." };

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, stage: true, workspaceId: true, metadata: true, contactId: true },
    });
    if (!deal) return { success: false, error: "Deal not found." };
    if (deal.workspaceId !== actor.workspaceId) return { success: false, error: "Deal is in another workspace." };
    if (deal.stage !== "PENDING_COMPLETION") return { success: false, error: "This job is not pending approval." };

    const meta = (deal.metadata as Record<string, unknown>) ?? {};
    const previousStage = (meta.previousStage as string) || "INVOICED";
    const requestedBy = meta.completionRequestedBy as string | undefined;

    await db.deal.update({
      where: { id: dealId },
      data: {
        stage: previousStage as PrismaStage,
        stageChangedAt: new Date(),
        metadata: JSON.parse(
          JSON.stringify({
            ...meta,
            completionRejectedBy: actor.id,
            completionRejectedAt: new Date().toISOString(),
            completionRejectionReason: reason?.trim() || null,
          })
        ),
      },
    });

    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Completion rejected",
        content: reason?.trim() ? `Manager rejected: ${reason}` : "Manager rejected the completion request.",
        description: `— ${actor.name || "Manager"}`,
        dealId,
        contactId: deal.contactId ?? undefined,
        userId: actor.id,
      },
    });

    if (requestedBy && requestedBy !== actor.id) {
      await createNotification({
        userId: requestedBy,
        title: "Completion request rejected",
        message: reason?.trim() ? `Your completion was rejected: ${reason}` : "Your request to mark the job as completed was rejected. You can edit the job and try again.",
        type: "WARNING",
        link: `/crm/deals`,
      });
    }

    revalidatePath("/crm/dashboard");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (err) {
    logger.error("rejectCompletion failed", { component: "deal-actions", action: "rejectCompletion", dealId }, err as Error);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reject." };
  }
}

export async function approveDraft(dealId: string): Promise<{ success: boolean; error?: string }> {
  try {
    let actor;
    try {
      const currentActor = await requireCurrentWorkspaceAccess();
      actor = await db.user.findUnique({
        where: { id: currentActor.id },
        select: { id: true, name: true, workspaceId: true },
      });
    } catch {
      return { success: false, error: "Not signed in." };
    }
    if (!actor) {
      return { success: false, error: "Not signed in." };
    }

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, title: true, isDraft: true, workspaceId: true, contactId: true },
    });
    if (!deal) return { success: false, error: "Deal not found." };
    if (deal.workspaceId !== actor.workspaceId) return { success: false, error: "Deal is in another workspace." };
    if (!deal.isDraft) return { success: false, error: "This card is no longer a draft." };

    await db.deal.update({
      where: { id: dealId },
      data: {
        isDraft: false,
      },
    });

    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Draft approved",
        content: "Draft approved and moved into the live pipeline.",
        description: `— ${actor.name || "Team member"}`,
        dealId,
        contactId: deal.contactId ?? undefined,
        userId: actor.id,
      },
    });

    revalidatePath("/crm/dashboard");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (err) {
    logger.error("approveDraft failed", { component: "deal-actions", action: "approveDraft", dealId }, err as Error);
    return { success: false, error: err instanceof Error ? err.message : "Failed to approve draft." };
  }
}

export async function rejectDraft(dealId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let actor;
    try {
      const currentActor = await requireCurrentWorkspaceAccess();
      actor = await db.user.findUnique({
        where: { id: currentActor.id },
        select: { id: true, name: true, workspaceId: true },
      });
    } catch {
      return { success: false, error: "Not signed in." };
    }
    if (!actor) {
      return { success: false, error: "Not signed in." };
    }

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, title: true, isDraft: true, workspaceId: true, contactId: true, metadata: true },
    });
    if (!deal) return { success: false, error: "Deal not found." };
    if (deal.workspaceId !== actor.workspaceId) return { success: false, error: "Deal is in another workspace." };
    if (!deal.isDraft) return { success: false, error: "This card is no longer a draft." };

    const metadata = (deal.metadata as Record<string, unknown>) ?? {};

    await db.deal.update({
      where: { id: dealId },
      data: {
        isDraft: false,
        stage: "DELETED",
        stageChangedAt: new Date(),
        metadata: JSON.parse(
          JSON.stringify({
            ...metadata,
            draftRejectedAt: new Date().toISOString(),
            draftRejectedBy: actor.id,
            draftRejectionReason: reason?.trim() || null,
          })
        ),
      },
    });

    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Draft rejected",
        content: reason?.trim() ? `Draft rejected: ${reason}` : "Draft rejected and moved to Deleted.",
        description: `— ${actor.name || "Team member"}`,
        dealId,
        contactId: deal.contactId ?? undefined,
        userId: actor.id,
      },
    });

    revalidatePath("/crm/dashboard");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (err) {
    logger.error("rejectDraft failed", { component: "deal-actions", action: "rejectDraft", dealId }, err as Error);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reject draft." };
  }
}

/**
 * Update deal metadata (polymorphic vertical-specific data).
 */
export async function updateDealMetadata(
  dealId: string,
  metadata: Record<string, unknown>
) {
  const { deal } = await requireDealInCurrentWorkspace(dealId);
  if (!deal) return { success: false, error: "Deal not found" };

  const existing = (deal.metadata as Record<string, unknown>) ?? {};
  const metadataChanges = Object.entries(metadata)
    .filter(([key, value]) => JSON.stringify(existing[key]) !== JSON.stringify(value))
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
      return `${label}: ${String(existing[key] ?? "Empty")} -> ${String(value ?? "Empty")}`;
    });

  await db.deal.update({
    where: { id: dealId },
    data: { metadata: JSON.parse(JSON.stringify({ ...existing, ...metadata })) },
  });

  // Log activity when card is edited (e.g. notes updated)
  let userName = "Someone";
  let userId: string | undefined;
  try {
    const auth = await getAuthUser();
    if (auth) {
      userName = auth.name;
      const dbUser = await db.user.findFirst({
        where: { workspaceId: deal.workspaceId, email: auth.email ?? undefined },
        select: { id: true },
      });
      if (dbUser) userId = dbUser.id;
    }
  } catch {
    // not authenticated
  }
  const changeTitle = metadataChanges.length === 1 ? `${metadataChanges[0].split(":")[0]} updated` : "Details updated";
  await db.activity.create({
    data: {
      type: "NOTE",
      title: changeTitle,
      content: metadataChanges.length > 0 ? metadataChanges.join("\n") : "Deal details were updated.",
      description: `— ${userName}`,
      dealId,
      contactId: deal.contactId ?? undefined,
      ...(userId && { userId }),
    },
  });

  return { success: true };
}

/**
 * Update deal core fields (title, value, stage, address, scheduledAt). Used by the deal edit page.
 */
export async function updateDeal(
  dealId: string,
  data: {
    title?: string;
    value?: number;
    stage?: string;
    isDraft?: boolean;
    invoicedAmount?: number | null;
    address?: string | null;
    scheduledAt?: Date | string | null;
  }
) {
  await requireDealInCurrentWorkspace(dealId);
  const deal = await db.deal.findFirst({
    where: { id: dealId },
    include: { workspace: { select: { autoUpdateGlossary: true } } }
  });
  if (!deal) return { success: false, error: "Deal not found" };
  const stageMovedToWon = data.stage !== undefined && (STAGE_REVERSE[data.stage] ?? "") === "WON";
  const draftConfirmed = deal.isDraft && data.isDraft === false;

  type DealUpdate = Parameters<typeof db.deal.update>[0]["data"];
  const update: DealUpdate = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.value !== undefined) update.value = data.value;
  if (data.stage !== undefined) {
    const prismaStage = STAGE_REVERSE[data.stage];
    if (!prismaStage) return { success: false, error: `Invalid stage: ${data.stage}` };
    const nextScheduledAt =
      data.scheduledAt !== undefined
        ? data.scheduledAt == null || data.scheduledAt === ""
          ? null
          : new Date(data.scheduledAt as string | Date)
        : deal.scheduledAt;
    if (kanbanStageRequiresScheduledDate(data.stage) && !nextScheduledAt) {
      return { success: false, error: "Set a scheduled date before moving the job to this stage." };
    }
    update.stage = prismaStage as DealUpdate["stage"];
    update.stageChangedAt = new Date();
  }
  if (data.isDraft !== undefined) update.isDraft = data.isDraft;
  if (data.invoicedAmount !== undefined) {
    update.invoicedAmount = data.invoicedAmount;
  }
  if (data.address !== undefined) update.address = data.address || null;
  if (data.scheduledAt !== undefined) {
    update.scheduledAt = data.scheduledAt == null || data.scheduledAt === "" ? null : new Date(data.scheduledAt as string | Date);
  }

  await db.deal.update({
    where: { id: dealId },
    data: update,
  });

  if (data.scheduledAt !== undefined) {
    if (update.scheduledAt) {
      await syncGoogleCalendarEventForDeal(dealId).catch((err) => {
        recordSyncIssue({
          workspaceId: deal.workspaceId,
          dealId,
          contactId: deal.contactId,
          surface: "calendar_sync",
          message: `Calendar sync failed after updating "${deal.title}": ${err instanceof Error ? err.message : String(err)}`,
        });
      });
    } else {
      await removeGoogleCalendarEventForDeal(dealId).catch((err) => {
        recordSyncIssue({
          workspaceId: deal.workspaceId,
          dealId,
          contactId: deal.contactId,
          surface: "calendar_remove",
          message: `Calendar event removal failed for "${deal.title}": ${err instanceof Error ? err.message : String(err)}`,
        });
      });
    }
  }

  let userName = "Someone";
  let userId: string | undefined;
  try {
    const auth = await getAuthUser();
    if (auth) {
      userName = auth.name;
      const dbUser = await db.user.findFirst({
        where: { workspaceId: deal.workspaceId, email: auth.email ?? undefined },
        select: { id: true },
      });
      if (dbUser) userId = dbUser.id;
    }
  } catch {
    // not authenticated
  }
  const changes: string[] = [];
  if (data.title !== undefined && data.title !== deal.title) changes.push(`Title: ${deal.title} -> ${data.title}`);
  if (data.value !== undefined && data.value !== Number(deal.value)) changes.push(`Value: $${Number(deal.value) || 0} -> $${data.value || 0}`);
  if (data.stage !== undefined) {
    const prismaStage = STAGE_REVERSE[data.stage];
    if (prismaStage !== deal.stage) {
      changes.push(`Stage: ${STAGE_ACTIVITY_LABELS[deal.stage.toLowerCase()] || deal.stage} -> ${STAGE_ACTIVITY_LABELS[data.stage] || data.stage}`);
    }
  }
  const currentInvoiced = deal.invoicedAmount ? Number(deal.invoicedAmount) : null;
  if (data.invoicedAmount !== undefined && data.invoicedAmount !== currentInvoiced) {
    changes.push(`Invoice: $${currentInvoiced || 0} -> $${data.invoicedAmount || 0}`);
  }
  if (data.scheduledAt !== undefined) {
    const origDate = deal.scheduledAt ? new Date(deal.scheduledAt).toLocaleString() : "None";
    const newDate = data.scheduledAt ? new Date(data.scheduledAt as Date | string).toLocaleString() : "None";
    if (origDate !== newDate) changes.push(`Scheduled: ${origDate} -> ${newDate}`);
  }

  const nextStage = typeof update.stage === "string" ? update.stage : deal.stage;

  const content = changes.length > 0 ? changes.join("\n") : "Title, value or stage was changed.";
  const activityTitle = changes.length === 1 ? `${changes[0].split(":")[0]} updated` : "Deal updated";

  await db.activity.create({
    data: {
      type: "NOTE",
      title: activityTitle,
      content,
      description: `— ${userName}`,
      dealId,
      contactId: deal.contactId ?? undefined,
      ...(userId && { userId }),
    },
  });
  if (data.invoicedAmount !== undefined && data.invoicedAmount !== currentInvoiced) {
    await recordWorkspaceAuditEvent({
      workspaceId: deal.workspaceId,
      userId: userId ?? undefined,
      action: "invoice.amount_adjusted",
      entityType: "deal",
      entityId: dealId,
      metadata: {
        dealId,
        previousInvoicedAmount: currentInvoiced,
        nextInvoicedAmount: data.invoicedAmount,
        source: "deal-actions.updateDeal",
      },
    });
  }

  await fireBookingConfirmation(dealId, deal.stage, nextStage as PrismaStage);

  if (stageMovedToWon || draftConfirmed) {
    try {
      await maybeCreatePricingSuggestionFromConfirmedJob(dealId, {
        trigger: stageMovedToWon ? "completed" : "draft_confirmed",
        source: "updateDeal",
      });
    } catch (learningErr) {
      console.warn("Pricing learning hook failed on updateDeal:", learningErr);
    }
  }

  if (stageMovedToWon) {
    try {
      await queueCompletionFollowUp(deal.workspaceId, dealId, deal.contactId, data.title ?? deal.title);
    } catch (followUpErr) {
      console.warn("Post-job follow-up hook failed on updateDeal:", followUpErr);
    }
  }

  // Smart Routing check if schedule date or address was updated
  if (data.scheduledAt !== undefined || data.address !== undefined) {
    const updatedDeal = await db.deal.findUnique({
      where: { id: dealId },
      select: { scheduledAt: true, latitude: true, longitude: true, workspaceId: true, contactId: true }
    });

    if (updatedDeal?.scheduledAt && updatedDeal.latitude && updatedDeal.longitude) {
      try {
        const nearby = await findNearbyBookings(updatedDeal.workspaceId, updatedDeal.latitude, updatedDeal.longitude, updatedDeal.scheduledAt, dealId);
        if (nearby) {
          await db.activity.create({
            data: {
              type: "NOTE",
              title: "Smart Routing Alert",
              content: `Since you rescheduled or moved this job, consider grouping it with "${nearby.title}", which is scheduled for ${nearby.scheduledAt?.toLocaleDateString()} and is only ${nearby.distance.toFixed(1)}km away.`,
              dealId: dealId,
              contactId: updatedDeal.contactId ?? undefined,
            }
          });
        }
      } catch (routeErr) {
        console.warn("Smart routing check failed during deal update:", routeErr);
      }
    }
  }

  return { success: true };
}

/**
 * Upload a photo for a deal: store in Supabase storage and create JobPhoto in Prisma
 * so it appears on the deal detail page.
 */
export async function uploadDealPhoto(
  dealId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const deal = await db.deal.findUnique({ where: { id: dealId }, select: { id: true } });
    if (!deal) return { success: false, error: "Deal not found" };

    const file = formData.get("file") as File | null;
    if (!file || !file.size) return { success: false, error: "No file provided" };
    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) return { success: false, error: `File must be under ${maxMb}MB` };
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return { success: false, error: "File must be an image (JPEG, PNG, WebP, or GIF)" };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isGif = bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    const sniffedMime = isJpeg ? "image/jpeg" : isPng ? "image/png" : isGif ? "image/gif" : isWebp ? "image/webp" : null;
    if (!sniffedMime || sniffedMime !== file.type) {
      return { success: false, error: "Uploaded file content does not match the image type." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return { success: false, error: "Photo storage is not configured" };

    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileName = `${dealId}/${nanoid()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("job-photos").upload(fileName, file, {
      contentType: sniffedMime,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const publicUrl = supabase.storage.from("job-photos").getPublicUrl(fileName).data.publicUrl;
    const caption = formData.get("caption") as string | null;

    await db.jobPhoto.create({
      data: { dealId, url: publicUrl, caption: caption || null },
    });

    revalidatePath("/crm/dashboard");
    revalidatePath(`/crm/deals/${dealId}`);
    return { success: true };
  } catch (e) {
    logger.error("uploadDealPhoto failed", { component: "deal-actions", action: "uploadDealPhoto", dealId }, e as Error);
    return { success: false, error: e instanceof Error ? e.message : "Failed to upload photo" };
  }
}

/**
 * Update who a deal is assigned to (e.g. when in Scheduled stage).
 */
export async function updateDealAssignedTo(
  dealId: string,
  assignedToId: string | null
): Promise<{ success: boolean; error?: string }> {
  const { deal } = await requireDealInCurrentWorkspace(dealId);
  if (!deal) return { success: false, error: "Deal not found" };

  // Prevent unassignment for deals in Scheduled or later stages
  if (!assignedToId) {
    const STAGES_REQUIRING_ASSIGNMENT = ["SCHEDULED", "READY_TO_INVOICE", "WON", "PENDING_COMPLETION"]
    if (STAGES_REQUIRING_ASSIGNMENT.includes(deal.stage)) {
      return { success: false, error: "Cannot unassign a deal in the Scheduled stage or later. Move it to an earlier stage first." }
    }
  }

  if (assignedToId) {
    const member = await db.user.findFirst({
      where: { id: assignedToId, workspaceId: deal.workspaceId },
      select: { id: true },
    });
    if (!member) return { success: false, error: "User not in this workspace" };
  }

  await db.deal.update({
    where: { id: dealId },
    data: { assignedToId },
  });
  return { success: true };
}

/**
 * Delete a deal and its related data (cascade).
 */
export async function deleteDeal(dealId: string) {
  await requireDealInCurrentWorkspace(dealId);
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

// ─── Recurring Jobs ──────────────────────────────────────────────────────────

export interface RecurrenceRule {
  unit: "day" | "week" | "fortnight" | "month"
  interval: number
  endDate?: string // ISO date string, optional
}

/**
 * Set or clear a recurrence rule on a deal.
 * Stored in deal.metadata.recurrence.
 */
export async function setDealRecurrence(
  dealId: string,
  rule: RecurrenceRule | null
): Promise<{ success: boolean; error?: string }> {
  const { deal } = await requireDealInCurrentWorkspace(dealId)
  if (!deal) return { success: false, error: "Deal not found" }

  const existing = (deal.metadata as Record<string, unknown>) ?? {}
  const updated = { ...existing }

  if (rule === null) {
    delete updated.recurrence
  } else {
    updated.recurrence = rule
  }

  await db.deal.update({
    where: { id: dealId },
    data: { metadata: JSON.parse(JSON.stringify(updated)) },
  })

  return { success: true }
}

/**
 * Get the recurrence rule for a deal, if any.
 */
export async function getDealRecurrence(dealId: string): Promise<RecurrenceRule | null> {
  const deal = await db.deal.findUnique({ where: { id: dealId }, select: { metadata: true } })
  if (!deal) return null
  const meta = (deal.metadata as Record<string, unknown>) ?? {}
  const rule = meta.recurrence as RecurrenceRule | undefined
  return rule ?? null
}
