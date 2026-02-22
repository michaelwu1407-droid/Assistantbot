import { NextRequest, NextResponse } from "next/server";
import { processBookingReminders } from "@/actions/automated-message-actions";

/**
 * Cron endpoint: Send automated 24h booking reminders.
 * Should be called every hour via Vercel Cron or similar scheduler.
 *
 * Example cron config in vercel.json:
 * { "crons": [{ "path": "/api/cron/booking-reminders", "schedule": "0 * * * *" }] }
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processBookingReminders();
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      errors: result.errors,
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
