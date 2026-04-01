import { NextRequest, NextResponse } from "next/server";
import { processFollowUpReminders, processPostJobFollowUps } from "@/actions/followup-actions";

/**
 * GET /api/cron/followup-reminders
 *
 * Two jobs in one cron hit:
 * 1. Notify workspace users about scheduled follow-ups that are due today or overdue.
 * 2. Send the "Follow Up After Job" automated SMS ~24h after a job is completed.
 *
 * Should be scheduled to run every hour.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [reminderResult, postJobResult] = await Promise.all([
      processFollowUpReminders(),
      processPostJobFollowUps(),
    ]);

    const duration = Date.now() - startTime;
    console.log(`[cron/followup-reminders] done in ${duration}ms`, {
      reminderResult,
      postJobResult,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      followUpReminders: reminderResult,
      postJobFollowUps: postJobResult,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[cron/followup-reminders] error:", error);
    return NextResponse.json(
      {
        error: "Follow-up cron failed",
        details: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
