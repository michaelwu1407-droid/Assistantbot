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
  brandingColor: string | null;
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
  brandingColor: string | null;
}): WorkspaceView {
  return {
    id: w.id,
    name: w.name,
    type: w.type as "TRADIE" | "AGENT",
    industryType: w.industryType as "TRADES" | "REAL_ESTATE" | null,
    ownerId: w.ownerId,
    location: w.location,
    onboardingComplete: w.onboardingComplete,
    brandingColor: w.brandingColor || "",
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
 * business name, industry type, and location.
 */
export async function completeOnboarding(data: {
  businessName: string;
  industryType: "TRADES" | "REAL_ESTATE";
  location: string;
}) {
  // Use the real authenticated user's workspace
  const { getAuthUserId } = await import("@/lib/auth");
  const userId = await getAuthUserId();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const workspace = await getOrCreateWorkspace(userId);

  // Map industry to workspace type
  const type = data.industryType === "REAL_ESTATE" ? "AGENT" : "TRADIE";

  // If they are a Tradie, dynamically provision a dedicated Twilio Subaccount for their AI
  let twilioData = {};
  if (type === "TRADIE") {
    const { createTwilioSubaccount } = await import("@/lib/twilio");
    const subaccount = await createTwilioSubaccount(data.businessName);
    if (subaccount) {
      twilioData = {
        twilioSubaccountId: subaccount.subaccountId,
      };

      // Note: Full architectural implementation requires securely storing 'subaccountAuthToken'
      // somewhere encrypted, or re-fetching it on demand using the master API.
      // We will rely on retrieving the Auth Token dynamically from the master account via the SID
      // in production routing to preserve security.
    }
  }

  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      name: data.businessName,
      type,
      industryType: data.industryType,
      location: data.location,
      onboardingComplete: true,
      ...twilioData,
    },
  });

  return { success: true, workspaceId: workspace.id };
}
