import { db } from "@/lib/db";
import { MonitoringService } from "@/lib/monitoring";

/**
 * Record a background sync failure so it surfaces on the customer/deal page.
 * Non-critical — swallows its own errors to avoid cascading failures.
 */
export async function recordSyncIssue(params: {
  workspaceId: string;
  dealId?: string | null;
  contactId?: string | null;
  surface: string;
  message: string;
}): Promise<void> {
  try {
    await db.syncIssue.create({
      data: {
        workspaceId: params.workspaceId,
        dealId: params.dealId ?? undefined,
        contactId: params.contactId ?? undefined,
        surface: params.surface,
        message: params.message,
      },
    });
  } catch (err) {
    // Last-resort fallback: at least log to Sentry
    MonitoringService.logError(
      err instanceof Error ? err : new Error(String(err)),
      { component: "recordSyncIssue", ...params }
    );
  }
}

/**
 * Mark all unresolved sync issues for a deal as resolved.
 */
export async function resolveSyncIssuesForDeal(dealId: string): Promise<void> {
  try {
    await db.syncIssue.updateMany({
      where: { dealId, resolved: false },
      data: { resolved: true },
    });
  } catch {
    // non-critical
  }
}
