"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging";
import { getAuthUser } from "@/lib/auth";

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
    logger.authFlow("Attempting to get or create workspace", { 
      action: "getOrCreateWorkspace",
      ownerId: ownerId || "missing",
      hasDefaults: !!defaults
    });

    if (ownerId) {
      logger.debug("Looking for existing workspace", { ownerId });
      
      const existing = await db.workspace.findFirst({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        logger.authFlow("Found existing workspace", { 
          workspaceId: existing.id,
          subscriptionStatus: existing.subscriptionStatus,
          onboardingComplete: existing.onboardingComplete
        });
        return toWorkspaceView(existing);
      }

      logger.info("No existing workspace found, creating new one", { ownerId });
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

    // Ensure the workspace owner has a User row so they appear in team and kanban filter
    try {
      const authUser = await getAuthUser();
      if (authUser?.email && ownerId) {
        const existingUser = await db.user.findUnique({
          where: { email: authUser.email },
          select: { id: true },
        });
        if (!existingUser) {
          await db.user.create({
            data: {
              email: authUser.email,
              name: authUser.name || null,
              workspaceId: workspace.id,
              role: "OWNER",
            },
          });
          logger.authFlow("Created owner User row for new workspace", {
            workspaceId: workspace.id,
            email: authUser.email,
          });
        }
      }
    } catch (ownerUserError) {
      logger.workspaceError("Failed to ensure owner User row (non-fatal)", {
        workspaceId: workspace.id,
        error: ownerUserError instanceof Error ? ownerUserError.message : String(ownerUserError),
      });
    }

    logger.authFlow("Successfully created new workspace", { 
      workspaceId: workspace.id,
      ownerId: workspace.ownerId,
      subscriptionStatus: workspace.subscriptionStatus
    });

    return toWorkspaceView(workspace);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    logger.workspaceError("Database Error in getOrCreateWorkspace", { 
      ownerId, 
      defaults,
      error: errorObj.message 
    }, errorObj);

    const errorMessage = errorObj.message || "";
    if (errorMessage.includes("DATABASE_URL") || errorMessage.includes("Environment variable not found")) {
      logger.critical("Database connection failed - check internet/firewall", { 
        errorMessage,
        category: "database_connection"
      });
      throw new Error(
        "CRITICAL: Database connection failed. Please check your internet connection and firewall settings."
      );
    }

    logger.databaseError("Unexpected error in getOrCreateWorkspace", { 
      errorMessage,
      category: "workspace_creation"
    }, errorObj);
    
    throw errorObj;
  }
}

/**
 * Ensure the workspace owner has a User row (for existing workspaces created before owner sync).
 * Call this after getOrCreateWorkspace so the dashboard team list and kanban filter include the owner.
 */
export async function ensureOwnerHasUserRow(workspace: WorkspaceView): Promise<void> {
  if (!workspace.ownerId) return;
  try {
    const authUser = await getAuthUser();
    if (!authUser?.email || authUser.id !== workspace.ownerId) return;

    const existing = await db.user.findUnique({
      where: { email: authUser.email },
      select: { id: true },
    });
    if (existing) return;

    await db.user.create({
      data: {
        email: authUser.email,
        name: authUser.name || null,
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });
    logger.authFlow("Created owner User row for existing workspace", {
      workspaceId: workspace.id,
      email: authUser.email,
    });
  } catch (e) {
    logger.workspaceError("ensureOwnerHasUserRow failed (non-fatal)", {
      workspaceId: workspace.id,
      error: e instanceof Error ? e.message : String(e),
    });
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
  // Agent & workspace behaviour (from extended onboarding)
  agentMode?: "EXECUTE" | "ORGANIZE" | "FILTER";
  workingHoursStart?: string;
  workingHoursEnd?: string;
  agendaNotifyTime?: string;
  wrapupNotifyTime?: string;
  autoUpdateGlossary?: boolean;
  autoCallLeads?: boolean;
  businessContact?: { phone?: string; email?: string; address?: string };
  leadSources?: string[];
  emergencyBypass?: boolean;
  digestPreference?: "immediate" | "daily" | "weekly";
}) {
  // Use the real authenticated user's workspace
  const { getAuthUserId } = await import("@/lib/auth");
  const userId = await getAuthUserId();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const workspace = await getOrCreateWorkspace(userId);

  logger.info("Onboarding completing", {
    action: "completeOnboarding",
    workspaceId: workspace.id,
    userId,
    hasAgentMode: !!data.agentMode,
    hasWorkingHours: !!(data.workingHoursStart && data.workingHoursEnd),
    hasPricing: data.callOutFee !== undefined || !!data.pricingMode,
    leadSourcesCount: data.leadSources?.length ?? 0,
    autoCallLeads: data.autoCallLeads,
    emergencyBypass: data.emergencyBypass,
    autoUpdateGlossary: data.autoUpdateGlossary,
    digestPreference: data.digestPreference,
    hasBusinessContact: !!(data.businessContact && (data.businessContact.phone || data.businessContact.email)),
  });

  // Map industry to workspace type (always TRADIE now)
  const type = "TRADIE";

  const existing = await db.workspace.findUnique({
    where: { id: workspace.id },
    select: { settings: true },
  });
  const currentSettings = (existing?.settings as Record<string, unknown>) ?? {};
  const settingsUpdate: Record<string, unknown> = { ...currentSettings };
  if (data.businessContact) settingsUpdate.businessContact = data.businessContact;
  if (data.leadSources !== undefined) settingsUpdate.leadSources = data.leadSources;
  if (data.emergencyBypass !== undefined) settingsUpdate.emergencyBypass = data.emergencyBypass;
  if (data.digestPreference) settingsUpdate.digestPreference = data.digestPreference;

  // Persist onboarding data immediately (don't block on comms provisioning)
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      name: data.businessName,
      type,
      industryType: data.industryType,
      location: data.location,
      onboardingComplete: true,
      ...(data.agentMode && { agentMode: data.agentMode }),
      ...(data.workingHoursStart && { workingHoursStart: data.workingHoursStart }),
      ...(data.workingHoursEnd && { workingHoursEnd: data.workingHoursEnd }),
      ...(data.agendaNotifyTime && { agendaNotifyTime: data.agendaNotifyTime }),
      ...(data.wrapupNotifyTime && { wrapupNotifyTime: data.wrapupNotifyTime }),
      ...(data.autoUpdateGlossary !== undefined && { autoUpdateGlossary: data.autoUpdateGlossary }),
      ...(data.autoCallLeads !== undefined && { autoCallLeads: data.autoCallLeads }),
      ...(data.callOutFee !== undefined && { callOutFee: data.callOutFee }),
      ...(Object.keys(settingsUpdate).length > 0 && { settings: settingsUpdate }),
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
  // We await so we can tell the user their number (or that setup failed) before redirecting.
  let phoneNumber: string | undefined;
  let provisioningError: string | undefined;
  try {
    const { initializeTradieComms } = await import("@/lib/comms");
    const result = await initializeTradieComms(
      workspace.id,
      data.businessName,
      data.ownerPhone || ""
    );
    if (result.success && result.phoneNumber) {
      phoneNumber = result.phoneNumber;
    } else if (!result.success && result.error) {
      provisioningError = result.error;
      logger.error("Comms provisioning failed during onboarding", { workspaceId: workspace.id, error: result.error });
      try {
        await db.activity.create({
          data: {
            type: "NOTE",
            title: "Phone Number Setup Failed",
            content: `AI agent phone number setup failed: ${result.error}. You can add a number later in Settings → Phone.`,
          },
        });
      } catch (logErr) {
        logger.error("Failed to log error to activity feed", { workspaceId: workspace.id }, logErr instanceof Error ? logErr : undefined);
      }
    }
  } catch (err) {
    provisioningError = err instanceof Error ? err.message : "Unknown error";
    logger.error("Comms provisioning failed during onboarding", { workspaceId: workspace.id, error: provisioningError }, err instanceof Error ? err : undefined);
    try {
      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Phone Number Setup Failed",
          content: `AI agent phone number setup failed: ${provisioningError}. You can add a number later in Settings → Phone.`,
        },
      });
    } catch (logErr) {
      logger.error("Failed to log error to activity feed", { workspaceId: workspace.id }, logErr instanceof Error ? logErr : undefined);
    }
  }

  return { success: true, workspaceId: workspace.id, phoneNumber, provisioningError };
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
