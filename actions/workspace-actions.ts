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
  brandingColor: string;
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
  brandingColor: string;
}): WorkspaceView {
  return {
    id: w.id,
    name: w.name,
    type: w.type as "TRADIE" | "AGENT",
    industryType: w.industryType as "TRADES" | "REAL_ESTATE" | null,
    ownerId: w.ownerId,
    location: w.location,
    brandingColor: w.brandingColor,
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
