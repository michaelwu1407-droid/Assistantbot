import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import type { UserRole } from "@/lib/store";

/**
 * Get the current authenticated user's role from the database.
 * Returns "OWNER" as the safe default if lookup fails.
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const userId = await getAuthUserId();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return (user?.role as UserRole) || "OWNER";
  } catch {
    return "OWNER";
  }
}

/**
 * Check if the current user has manager-level access (OWNER or MANAGER).
 */
export async function isManagerOrAbove(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "OWNER" || role === "MANAGER";
}

/**
 * Routes restricted from TEAM_MEMBER access.
 */
export const RESTRICTED_ROUTES = [
  "/dashboard/inbox",
  "/dashboard/contacts",
  "/dashboard/analytics",
] as const;

/**
 * Settings sections hidden from TEAM_MEMBER.
 */
export const RESTRICTED_SETTINGS = [
  "/dashboard/settings/billing",
  "/dashboard/settings/integrations",
] as const;
