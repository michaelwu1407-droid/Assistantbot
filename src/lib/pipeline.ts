export type DealHealthStatus = "HEALTHY" | "STALE" | "ROTTING";

export interface DealHealth {
  status: DealHealthStatus;
  color: string;
  daysSinceActivity: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Determines the health of a deal based on time since last activity.
 *
 * - HEALTHY (Green):  <= 7 days since last activity
 * - STALE   (Amber):  8–14 days since last activity
 * - ROTTING (Red):    > 14 days since last activity
 */
export function getDealHealth(lastActivity: Date): DealHealth {
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  const daysSinceActivity = Math.floor(diffMs / MS_PER_DAY);

  if (daysSinceActivity > 14) {
    return { status: "ROTTING", color: "#ef4444", daysSinceActivity };
  }

  if (daysSinceActivity > 7) {
    return { status: "STALE", color: "#f59e0b", daysSinceActivity };
  }

  return { status: "HEALTHY", color: "#22c55e", daysSinceActivity };
}
