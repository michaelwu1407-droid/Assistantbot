import { cache } from "react";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import type { UserRole } from "@/lib/store";

export const getDashboardShellState = cache(async () => {
  const userId = await getAuthUserId();
  if (!userId) {
    return null;
  }

  const workspace = await getOrCreateWorkspace(userId);
  const actor = await requireCurrentWorkspaceAccess().catch(() => null);

  return {
    userId: actor?.id ?? userId,
    workspace,
    userRole: (actor?.role as UserRole | undefined) || ("TEAM_MEMBER" as UserRole),
  };
});
