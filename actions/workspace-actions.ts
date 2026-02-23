"use server";

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface WorkspaceView {
  id: string;
  name: string;
  type: "TRADIE" | "AGENT";
  industryType: "TRADES" | "REAL_ESTATE" | null;
  ownerId: string | null;
  location: string | null;
  onboardingComplete: boolean;
  tutorialComplete: boolean;
  brandingColor: string | null;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
}

// ─── Validation ─────────────────────────────────────────────────────

const _CreateWorkspaceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["TRADIE", "AGENT"]),
  ownerId: z.string().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────

function toWorkspaceView(w: {
  id: string;
  name: string;
  type: string;
  industryType: string | null;
  ownerId: string | null;
  location: string | null;
  onboardingComplete: boolean;
  tutorialComplete: boolean;
  brandingColor: string | null;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
}): WorkspaceView {
  return {
    id: w.id,
    name: w.name,
    type: w.type as "TRADIE" | "AGENT",
    industryType: w.industryType as "TRADES" | "REAL_ESTATE" | null,
    ownerId: w.ownerId,
    location: w.location,
    onboardingComplete: w.onboardingComplete,
    tutorialComplete: w.tutorialComplete,
    brandingColor: w.brandingColor || "",
    stripeCustomerId: w.stripeCustomerId,
    subscriptionStatus: w.subscriptionStatus,
  };
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get or create a workspace for the current user.
 * This is the main entry point — frontend calls this on load
 * to get a workspaceId for all subsequent actions.
 */
export async function getOrCreateWorkspace(
  ownerId?: string,
  defaults?: { name?: string; type?: "TRADIE" | "AGENT"; industryType?: "TRADES" | "REAL_ESTATE"; location?: string }
): Promise<WorkspaceView> {
  try {
    if (ownerId) {
      const existing = await db.workspace.findFirst({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return toWorkspaceView(existing);
      }
    }

    const workspace = await db.workspace.create({
      data: {
        name: defaults?.name ?? "My Workspace",
        type: defaults?.type ?? "TRADIE",
        industryType: defaults?.industryType ?? null,
        location: defaults?.location ?? null,
        ownerId: ownerId ?? null,
      },
    });

    return toWorkspaceView(workspace);
  } catch (error) {
    console.error("Database Error in getOrCreateWorkspace:", error);

    const errorMessage = (error as Error).message || "";
    if (errorMessage.includes("DATABASE_URL") || errorMessage.includes("Environment variable not found")) {
      throw new Error(
        "CRITICAL: Database connection failed. Please check your internet connection and firewall settings."
      );
    }

    throw error;
  }
}

/**
 * Get a workspace by ID.
 */
export async function getWorkspace(workspaceId: string): Promise<WorkspaceView | null> {
  try {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) return null;

    return toWorkspaceView(workspace);
  } catch (error) {
    console.error("Database Error in getWorkspace:", error);
    return null;
  }
}

/** Pipeline health thresholds stored in workspace.settings */
export interface PipelineHealthSettings {
  followUpDays?: number;
  urgentDays?: number;
}

/**
 * Get workspace including pipeline health settings (for settings page).
 */
export async function getWorkspaceWithSettings(
  workspaceId: string
): Promise<(WorkspaceView & { settings: PipelineHealthSettings }) | null> {
  try {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) return null;
    const settings = (workspace.settings as PipelineHealthSettings) ?? {};
    return { ...toWorkspaceView(workspace), settings };
  } catch (error) {
    console.error("Database Error in getWorkspaceWithSettings:", error);
    return null;
  }
}

/**
 * Update pipeline health thresholds (days until Follow up / Urgent).
 */
export async function updateWorkspacePipelineSettings(
  workspaceId: string,
  data: PipelineHealthSettings
) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  });
  const current = (workspace?.settings as PipelineHealthSettings) ?? {};
  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      settings: {
        ...current,
        ...(data.followUpDays !== undefined && { followUpDays: data.followUpDays }),
        ...(data.urgentDays !== undefined && { urgentDays: data.urgentDays }),
      },
    },
  });
  return { success: true };
}

/**
 * Update workspace settings (including industry and location from onboarding).
 */
export async function updateWorkspace(
  workspaceId: string,
  data: {
    name?: string;
    type?: "TRADIE" | "AGENT";
    industryType?: "TRADES" | "REAL_ESTATE";
    location?: string;
    brandingColor?: string;
  }
) {
  await db.workspace.update({
    where: { id: workspaceId },
    data,
  });

  return { success: true };
}

/**
 * List all workspaces for an owner.
 */
export async function listWorkspaces(ownerId: string): Promise<WorkspaceView[]> {
  const workspaces = await db.workspace.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });

  return workspaces.map(toWorkspaceView);
}

/**
 * Complete onboarding for a workspace.
 * Called at the end of the setup chat flow to persist
 * business name, industry type, location, and additional business details.
 */
export async function completeOnboarding(data: {
  businessName: string;
  industryType: "TRADES";
  location: string;
  ownerPhone?: string;
  tradeType?: string;
  serviceRadius?: number;
  workHours?: string;
  emergencyService?: boolean;
  callOutFee?: number;
  pricingMode?: "BOOK_ONLY" | "CALL_OUT" | "STANDARD";
}) {
  // Use the real authenticated user's workspace
  const { getAuthUserId } = await import("@/lib/auth");
  const userId = await getAuthUserId();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const workspace = await getOrCreateWorkspace(userId);

  // Map industry to workspace type (always TRADIE now)
  const type = "TRADIE";

  // Persist onboarding data immediately (don't block on comms provisioning)
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      name: data.businessName,
      type,
      industryType: data.industryType,
      location: data.location,
      onboardingComplete: true,
    },
  });

  // Create Business Profile for Tradies
  await db.businessProfile.upsert({
    where: { userId },
    update: {
      tradeType: data.tradeType || "General",
      baseSuburb: data.location,
      serviceRadius: data.serviceRadius || 20,
      standardWorkHours: data.workHours || "Mon-Fri, 07:00-15:30",
      emergencyService: data.emergencyService || false,
      emergencySurcharge: data.emergencyService ? data.callOutFee : null,
    },
    create: {
      userId,
      tradeType: data.tradeType || "General",
      baseSuburb: data.location,
      serviceRadius: data.serviceRadius || 20,
      standardWorkHours: data.workHours || "Mon-Fri, 07:00-15:30",
      emergencyService: data.emergencyService || false,
      emergencySurcharge: data.emergencyService ? data.callOutFee : null,
    },
  });

  // Create Pricing Settings
  await db.pricingSettings.upsert({
    where: { userId },
    update: {
      mode: data.pricingMode || "STANDARD",
      callOutFee: data.callOutFee || 89.0,
      waiveFee: data.pricingMode === "BOOK_ONLY",
    },
    create: {
      userId,
      mode: data.pricingMode || "STANDARD",
      callOutFee: data.callOutFee || 89.0,
      waiveFee: data.pricingMode === "BOOK_ONLY",
    },
  });

  // For Tradies: provision dedicated phone number, SIP trunk, and Retell voice agent.
  // This runs async and logs errors to activity feed for visibility
  const { initializeTradieComms } = await import("@/lib/comms");
  initializeTradieComms(
    workspace.id,
    data.businessName,
    data.ownerPhone || ""
  ).catch(async (err) => {
    console.error("[completeOnboarding] Comms provisioning failed:", err);
    
    // Log the failure to activity feed so user can see it
    try {
      const { db } = await import("@/lib/db");
      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Phone Number Setup Failed",
          content: `AI agent phone number setup failed: ${err instanceof Error ? err.message : "Unknown error"}. Please contact support or try setting up manually in settings.`,
        },
      });
    } catch (logErr) {
      console.error("[completeOnboarding] Failed to log error to activity feed:", logErr);
    }
  });

  return { success: true, workspaceId: workspace.id };
}

/**
 * Mark the interactive guided tutorial as permanently completed for the workspace.
 */
export async function completeTutorial(workspaceId: string) {
  await db.workspace.update({
    where: { id: workspaceId },
    data: { tutorialComplete: true },
  });

  return { success: true };
}
