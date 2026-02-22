"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

/**
 * Create an invite link for a workspace.
 * Only OWNER and MANAGER roles can create invites.
 * Managers can invite TEAM_MEMBER or MANAGER roles.
 * Owners can invite any role.
 */
export async function createInvite(params: {
  role: "MANAGER" | "TEAM_MEMBER";
  email?: string;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return { success: false, error: "Unauthorized" };

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { id: true, workspaceId: true, role: true },
  });
  if (!user) return { success: false, error: "User not found" };

  // Permission check: only OWNER and MANAGER can invite
  if (user.role !== "OWNER" && user.role !== "MANAGER") {
    return { success: false, error: "Only managers and owners can create invites" };
  }

  // MANAGER cannot invite OWNER-level users
  if (user.role === "MANAGER" && params.role !== "TEAM_MEMBER" && params.role !== "MANAGER") {
    return { success: false, error: "Managers can only invite team members or other managers" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  const invite = await db.workspaceInvite.create({
    data: {
      workspaceId: user.workspaceId,
      invitedById: user.id,
      role: params.role as UserRole,
      email: params.email || null,
      expiresAt,
    },
  });

  revalidatePath("/dashboard/team");
  return { success: true, token: invite.token };
}

/**
 * Get all pending invites for the current workspace.
 */
export async function getWorkspaceInvites() {
  const authUser = await getAuthUser();
  if (!authUser?.email) return [];

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true, role: true },
  });
  if (!user) return [];

  if (user.role !== "OWNER" && user.role !== "MANAGER") return [];

  return db.workspaceInvite.findMany({
    where: {
      workspaceId: user.workspaceId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Validate an invite token and return the workspace info.
 */
export async function validateInviteToken(token: string) {
  const invite = await db.workspaceInvite.findUnique({
    where: { token },
  });

  if (!invite) return { valid: false, error: "Invalid invite link" };
  if (invite.acceptedAt) return { valid: false, error: "This invite has already been used" };
  if (invite.expiresAt < new Date()) return { valid: false, error: "This invite has expired" };

  const workspace = await db.workspace.findUnique({
    where: { id: invite.workspaceId },
    select: { id: true, name: true },
  });

  return {
    valid: true,
    workspaceId: invite.workspaceId,
    workspaceName: workspace?.name || "Workspace",
    role: invite.role,
  };
}

/**
 * Accept an invite: link the newly signed-up user to the workspace.
 */
export async function acceptInvite(token: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const invite = await db.workspaceInvite.findUnique({
    where: { token },
  });

  if (!invite) return { success: false, error: "Invalid invite" };
  if (invite.acceptedAt) return { success: false, error: "Already accepted" };
  if (invite.expiresAt < new Date()) return { success: false, error: "Invite expired" };

  // Update the user's workspace and role
  await db.user.update({
    where: { id: userId },
    data: {
      workspaceId: invite.workspaceId,
      role: invite.role,
      hasOnboarded: true,
    },
  });

  // Mark invite as accepted
  await db.workspaceInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  revalidatePath("/dashboard/team");
  return { success: true };
}

/**
 * Revoke (delete) a pending invite.
 */
export async function revokeInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return { success: false, error: "Unauthorized" };

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true, role: true },
  });
  if (!user || (user.role !== "OWNER" && user.role !== "MANAGER")) {
    return { success: false, error: "Unauthorized" };
  }

  await db.workspaceInvite.delete({ where: { id: inviteId } });
  revalidatePath("/dashboard/team");
  return { success: true };
}

/**
 * Get all team members for the current workspace (real data from DB).
 */
export async function getTeamMembers() {
  const authUser = await getAuthUser();
  if (!authUser?.email) return [];

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true },
  });
  if (!user) return [];

  return db.user.findMany({
    where: { workspaceId: user.workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { id: "asc" },
  });
}
