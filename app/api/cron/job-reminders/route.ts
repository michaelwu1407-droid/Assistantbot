import { NextRequest, NextResponse } from "next/server";
import { checkAndSendReminders } from "@/actions/reminder-actions";

export async function GET(request: NextRequest) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await checkAndSendReminders();
    
    return NextResponse.json({
      success: true,
      message: "Reminders checked",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in reminder cron job:", error);
    return NextResponse.json(
      { 
        error: "Failed to check reminders",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
