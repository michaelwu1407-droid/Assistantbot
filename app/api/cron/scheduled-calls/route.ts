import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { initiateOutboundCall } from "@/lib/outbound-call";

export const dynamic = "force-dynamic";

/**
 * Cron: Check for scheduled call tasks that are due and place outbound calls.
 * Tasks created by the kanban "Schedule Call" action have title prefix "Scheduled call:".
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Find scheduled call tasks that are due and not yet completed
    const dueCalls = await db.task.findMany({
      where: {
        completed: false,
        title: { startsWith: "Scheduled call:" },
        dueAt: { lte: new Date() },
      },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
            contact: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      take: 10, // Process at most 10 calls per cron run to avoid overload
    });

    const results: Array<{ taskId: string; success: boolean; error?: string }> = [];

    for (const task of dueCalls) {
      if (!task.deal?.workspaceId || !task.deal.contact?.phone) {
        // Mark task as completed with a note that it couldn't be placed
        await db.task.update({
          where: { id: task.id },
          data: {
            completed: true,
            completedAt: new Date(),
            description: `${task.description || ""}\n[Auto-skipped: missing workspace or contact phone]`.trim(),
          },
        });
        results.push({ taskId: task.id, success: false, error: "Missing workspace or contact phone" });
        continue;
      }

      try {
        await initiateOutboundCall({
          workspaceId: task.deal.workspaceId,
          contactPhone: task.deal.contact.phone,
          contactName: task.deal.contact.name || undefined,
          dealId: task.deal.id,
          reason: task.description || `Scheduled follow-up for ${task.deal.title}`,
        });

        // Mark task as completed after successful call placement
        await db.task.update({
          where: { id: task.id },
          data: { completed: true, completedAt: new Date() },
        });

        results.push({ taskId: task.id, success: true });
      } catch (error) {
        console.error(`[scheduled-calls] Failed to place call for task ${task.id}:`, error);
        results.push({
          taskId: task.id,
          success: false,
          error: error instanceof Error ? error.message : "Call placement failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      callsChecked: dueCalls.length,
      results,
      duration: `${Date.now() - startTime}ms`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process scheduled calls",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
