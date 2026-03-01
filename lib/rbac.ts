import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import type { UserRole } from "@/lib/store";

/**
 * Get the current authenticated user's role from the database.
 * Returns "OWNER" as the safe default if lookup fails.
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    // ── Resolve user role (depends on authUser result) ───────────────────
    let userRole: string = "TEAM_MEMBER";
    const userId = await getAuthUserId();
    if (!userId) {
      return userRole as UserRole; // Return default if no user ID
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    // If user exists and has a role, use it; otherwise, default to "OWNER"
    userRole = user?.role || "OWNER";
    return userRole as UserRole;
  } catch {
    return "OWNER" as UserRole;
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
