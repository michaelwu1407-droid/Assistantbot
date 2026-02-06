"use server";

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface WorkspaceView {
  id: string;
  name: string;
  type: "TRADIE" | "AGENT";
  ownerId: string | null;
  brandingColor: string;
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["TRADIE", "AGENT"]),
  ownerId: z.string().optional(),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get or create a workspace for the current user.
 * This is the main entry point — frontend calls this on load
 * to get a workspaceId for all subsequent actions.
 */
export async function getOrCreateWorkspace(
  ownerId?: string,
  defaults?: { name?: string; type?: "TRADIE" | "AGENT" }
): Promise<WorkspaceView> {
  try {
    // Try to find existing workspace for this owner
    if (ownerId) {
      const existing = await db.workspace.findFirst({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return {
          id: existing.id,
          name: existing.name,
          type: existing.type as "TRADIE" | "AGENT",
          ownerId: existing.ownerId,
          brandingColor: existing.brandingColor,
        };
      }
    }

    // Create new workspace
    const workspace = await db.workspace.create({
      data: {
        name: defaults?.name ?? "My Workspace",
        type: defaults?.type ?? "TRADIE",
        ownerId: ownerId ?? null,
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type as "TRADIE" | "AGENT",
      ownerId: workspace.ownerId,
      brandingColor: workspace.brandingColor,
    };
  } catch (error) {
    console.error("Database Error in getOrCreateWorkspace:", error);
    
    // Check for specific Prisma initialization error related to env vars
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

    return {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type as "TRADIE" | "AGENT",
      ownerId: workspace.ownerId,
      brandingColor: workspace.brandingColor,
    };
  } catch (error) {
    console.error("Database Error in getWorkspace:", error);
    return null;
  }
}

/**
 * Update workspace settings.
 */
export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; type?: "TRADIE" | "AGENT"; brandingColor?: string }
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

  return workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type as "TRADIE" | "AGENT",
    ownerId: w.ownerId,
    brandingColor: w.brandingColor,
  }));
}
