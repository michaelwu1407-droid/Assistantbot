/**
 * Workspace permission helpers — used to gate UI and actions that should
 * only be available to the workspace OWNER (e.g. phone-number management,
 * billing, integrations that affect the whole workspace).
 *
 * Teammates (MANAGER / TEAM_MEMBER) share the workspace's resources but
 * don't own or manage workspace-level infrastructure like the Twilio
 * number — those are owner-only by design.
 */
import { db } from "@/lib/db";

export async function isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
  if (!userId || !workspaceId) return false;
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  return workspace?.ownerId === userId;
}
