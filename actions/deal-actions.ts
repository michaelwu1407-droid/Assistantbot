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

// ─── Types ──────────────────────────────────────────────────────────

// Maps Prisma DealStage enum to frontend column ids (6-column CRM)
const STAGE_MAP: Record<string, string> = {
  NEW: "new_request",
  CONTACTED: "quote_sent",
  NEGOTIATION: "scheduled",
  SCHEDULED: "scheduled",
  PIPELINE: "pipeline",
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
  pipeline: "PIPELINE",
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
  pipeline: "Pipeline",
  ready_to_invoice: "Ready to invoice",
  pending_approval: "Pending approval",
  completed: "Completed",
  lost: "Lost",
  deleted: "Deleted jobs",
};

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
        invoicedAmount: deal.invoicedAmount ?? undefined,
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

    const currentDeal = await db.deal.findUnique({
      where: { id: parsed.data.dealId },
      select: { stage: true, metadata: true, workspaceId: true, contactId: true, assignedToId: true },
    });
    if (!currentDeal) return { success: false, error: "Deal not found" };
    const currentMeta = (currentDeal.metadata as Record<string, unknown>) ?? {};

    // Cannot move to Scheduled without an assigned team member
    if (prismaStage === "SCHEDULED" && !currentDeal.assignedToId) {
      return { success: false, error: "Assign a team member before moving to Scheduled." };
    }

    // Team members moving to Completed go to Pending approval; only managers/owners can set WON directly
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
        const deal = await db.deal.update({
          where: { id: parsed.data.dealId },
          data: {
            stage: "PENDING_COMPLETION",
            stageChangedAt: new Date(),
            metadata: JSON.parse(JSON.stringify(meta)),
          },
        });
        const stageLabel = STAGE_ACTIVITY_LABELS.pending_approval ?? "Pending approval";
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
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/deals");
        return { success: true };
      }
    }

    const deal = await db.deal.update({
      where: { id: parsed.data.dealId },
      data: {
        stage: prismaStage as PrismaStage,
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

    if (prismaStage === "WON") {
      try {
        await maybeCreatePricingSuggestionFromConfirmedJob(parsed.data.dealId, {
          trigger: "completed",
          source: "updateDealStage",
        });
      } catch (learningErr) {
        console.warn("Pricing learning hook failed after stage update:", learningErr);
      }
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
 * Manager/owner approves a completion request (deal in PENDING_COMPLETION). Moves to WON and clears pending metadata.
 */
export async function approveCompletion(dealId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthUser();
    if (!auth?.email) return { success: false, error: "Not signed in." };
    const actor = await db.user.findFirst({
      where: { email: auth.email },
      select: { id: true, role: true, workspaceId: true },
    });
    if (!actor || (actor.role !== "OWNER" && actor.role !== "MANAGER"))
      return { success: false, error: "Only a team manager or owner can approve completions." };

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, stage: true, workspaceId: true, metadata: true, contactId: true },
    });
    if (!deal) return { success: false, error: "Deal not found." };
    if (deal.workspaceId !== actor.workspaceId) return { success: false, error: "Deal is in another workspace." };
    if (deal.stage !== "PENDING_COMPLETION") return { success: false, error: "This job is not pending approval." };

    const meta = (deal.metadata as Record<string, unknown>) ?? {};
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

    let userName = auth.name;
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Completion approved",
        content: "Manager approved and job marked as completed.",
        description: `— ${userName}`,
        dealId,
        contactId: deal.contactId ?? undefined,
        userId: actor.id,
      },
    });

    if (requestedBy && requestedBy !== actor.id) {
      await createNotification({
        userId: requestedBy,
        title: "Completion approved",
        message: `Your request to mark a job as completed was approved.`,
        type: "SUCCESS",
        link: `/dashboard/deals`,
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

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deals");
    return { success: true };
  } catch (err) {
    console.error("approveCompletion error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to approve." };
  }
}

/**
 * Manager/owner rejects a completion request. Reverts deal to previous stage and notifies the requester.
 */
export async function rejectCompletion(dealId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthUser();
    if (!auth?.email) return { success: false, error: "Not signed in." };
    const actor = await db.user.findFirst({
      where: { email: auth.email },
      select: { id: true, name: true, role: true, workspaceId: true },
    });
    if (!actor || (actor.role !== "OWNER" && actor.role !== "MANAGER"))
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
        link: `/dashboard/deals`,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deals");
    return { success: true };
  } catch (err) {
    console.error("rejectCompletion error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reject." };
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
  const deal = await db.deal.findUnique({
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return { success: false, error: "Photo storage is not configured" };

    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileName = `${dealId}/${nanoid()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("job-photos").upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("job-photos").getPublicUrl(fileName);

    await db.jobPhoto.create({
      data: { dealId, url: publicUrl, caption: null },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/deals/${dealId}`);
    return { success: true };
  } catch (e) {
    console.error("uploadDealPhoto error:", e);
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
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: { workspaceId: true },
  });
  if (!deal) return { success: false, error: "Deal not found" };

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
