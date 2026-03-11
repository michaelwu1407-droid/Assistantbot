import { cache } from "react";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import type { UserRole } from "@/lib/store";

export const getDashboardShellState = cache(async () => {
  const userId = await getAuthUserId();
  if (!userId) {
    return null;
  }

  const [workspace, dbUser] = await Promise.all([
    getOrCreateWorkspace(userId),
    db.user
      .findUnique({
        where: { id: userId },
        select: { role: true },
      })
      .catch(() => null),
  ]);

  return {
    userId,
    workspace,
    userRole: (dbUser?.role as UserRole | undefined) || ("OWNER" as UserRole),
  };
});
