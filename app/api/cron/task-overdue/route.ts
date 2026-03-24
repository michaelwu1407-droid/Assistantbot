import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluateAutomations } from "@/actions/automation-actions";

export const dynamic = "force-dynamic";

/**
 * Cron: Scan all workspaces for overdue tasks and fire matching automations.
 * Mirrors the pattern in /api/cron/job-reminders.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Find all workspaces that have at least one overdue, incomplete task
    const overdueTasks = await db.task.findMany({
      where: {
        completed: false,
        dueAt: { lt: new Date() },
      },
      select: {
        id: true,
        dealId: true,
        contactId: true,
        deal: { select: { workspaceId: true } },
        contact: { select: { workspaceId: true } },
      },
    });

    // Group by workspace
    const byWorkspace = new Map<string, Array<{ dealId?: string; contactId?: string }>>();
    for (const task of overdueTasks) {
      const workspaceId = task.deal?.workspaceId || task.contact?.workspaceId;
      if (!workspaceId) continue;
      if (!byWorkspace.has(workspaceId)) byWorkspace.set(workspaceId, []);
      byWorkspace.get(workspaceId)!.push({
        dealId: task.dealId || undefined,
        contactId: task.contactId || undefined,
      });
    }

    let totalTriggered = 0;

    for (const [workspaceId, tasks] of byWorkspace.entries()) {
      // Fire once per workspace with the first overdue task's context
      const first = tasks[0];
      const result = await evaluateAutomations(workspaceId, {
        type: "check_tasks",
        dealId: first.dealId,
        contactId: first.contactId,
      });
      totalTriggered += result.triggered.length;
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      workspacesChecked: byWorkspace.size,
      overdueTasksFound: overdueTasks.length,
      automationsTriggered: totalTriggered,
      duration: `${duration}ms`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check overdue tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
