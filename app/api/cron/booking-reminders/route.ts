import { NextRequest, NextResponse } from "next/server";
import { processBookingReminders } from "@/actions/automated-message-actions";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";

/**
 * Cron endpoint: Send automated 24h booking reminders.
 * Should be called every hour by the Reminder Crons GitHub Actions workflow.
 */
export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  try {
    const result = await processBookingReminders();
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      errors: result.errors,
      skippedAlreadySent: result.skippedAlreadySent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Booking reminders failed:", error);
    return NextResponse.json(
      { error: "Failed to process booking reminders" },
      { status: 500 }
    );
  }
}
