import { NextRequest, NextResponse } from "next/server";
import { checkAndSendReminders } from "@/actions/reminder-actions";

export async function GET(request: NextRequest) {
  const startTime = new Date();
  console.log(`🌐 [API] Cron job request received at ${startTime.toISOString()}`);
  
  try {
    // Verify cron job secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    console.log(`🔐 [API] Checking authorization...`);
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error(`❌ [API] Unauthorized cron job attempt. Header present: ${Boolean(authHeader)}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`✅ [API] Authorization verified, starting reminder check...`);

    const result = await checkAndSendReminders();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    console.log(`🏁 [API] Cron job completed in ${duration}ms`);
    console.log(`📊 [API] Final result:`, result);
    
    return NextResponse.json({
      success: true,
      message: "Reminders checked",
      result,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: result.summary || {}
    });
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    console.error(`💥 [API] Cron job failed after ${duration}ms:`, error);
    
    return NextResponse.json(
      { 
        error: "Failed to check reminders",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      },
      { status: 500 }
    );
  }
}
