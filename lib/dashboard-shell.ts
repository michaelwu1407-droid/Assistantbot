import { cache } from "react";
import { getAuthUserId, getAuthUser } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/store";

export const getDashboardShellState = cache(async () => {
  const userId = await getAuthUserId();
  if (!userId) {
    return null;
  }

  // If the user has a DB row with no workspaceId, they were removed from their
  // workspace. Don't auto-create a new one — return a signal so the layout can
  // show a friendly "you've been removed" page instead of bouncing to /billing.
  const authUser = await getAuthUser();
  if (authUser?.email) {
    const dbUser = await db.user.findUnique({
      where: { email: authUser.email },
      select: { workspaceId: true },
    });
    if (dbUser && dbUser.workspaceId === null) {
      return { userId, noWorkspace: true as const };
    }
  }

  const workspace = await getOrCreateWorkspace(userId);
  const actor = await requireCurrentWorkspaceAccess().catch(() => null);

  return {
    userId: actor?.id ?? userId,
    workspace,
    userRole: (actor?.role as UserRole | undefined) || ("TEAM_MEMBER" as UserRole),
  };
});
