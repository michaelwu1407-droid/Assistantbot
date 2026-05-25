import { NextRequest, NextResponse } from "next/server";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { db } from "@/lib/db";
import { deleteUserAccount } from "@/actions/user-actions";

/**
 * Cron endpoint: Hard-delete workspaces whose cooling-off window has expired.
 * Should be called daily by the GitHub Actions cron workflow.
 */
export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const due = await db.workspace.findMany({
    where: { scheduledForDeletionAt: { lte: new Date() } },
    select: { id: true, users: { select: { id: true }, take: 1 } },
  });

  let deleted = 0;
  const errors: string[] = [];

  for (const workspace of due) {
    const userId = workspace.users[0]?.id;
    if (!userId) {
      // No users left — workspace is already orphaned, delete directly
      try {
        await db.workspace.delete({ where: { id: workspace.id } });
        deleted++;
      } catch (err: unknown) {
        errors.push(`workspace ${workspace.id}: ${(err as Error).message}`);
      }
      continue;
    }

    const result = await deleteUserAccount(userId, "Scheduled deletion cooling-off period expired");
    if (result.success) {
      deleted++;
    } else {
      errors.push(`workspace ${workspace.id}: ${result.error}`);
    }
  }

  console.log(`[Cron] process-deletions: ${deleted} deleted, ${errors.length} errors`);

  return NextResponse.json({
    ok: true,
    deleted,
    errors,
    timestamp: new Date().toISOString(),
  });
}
