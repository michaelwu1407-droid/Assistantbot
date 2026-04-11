import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import type { UserRole } from "@/lib/store";

/**
 * Get the current authenticated user's role through the same workspace-aware
 * resolver used by server actions and pages.
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const actor = await requireCurrentWorkspaceAccess();
    return actor.role as UserRole;
  } catch {
    return "TEAM_MEMBER" as UserRole;
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
  "/crm/inbox",
  "/crm/contacts",
  "/crm/analytics",
] as const;

/**
 * Settings sections hidden from TEAM_MEMBER.
 */
export const RESTRICTED_SETTINGS = [
  "/crm/settings/billing",
  "/crm/settings/integrations",
] as const;
