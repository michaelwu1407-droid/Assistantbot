import { NextRequest, NextResponse } from "next/server";
import { manualSendJobReminder, manualSendTripSms, getReminderStats } from "@/actions/reminder-actions";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, dealId } = body;

    if (!action || !dealId) {
      return NextResponse.json({ error: "Missing action or dealId" }, { status: 400 });
    }

    let result;
    switch (action) {
      case "sendReminder":
        result = await manualSendJobReminder(dealId, user.id);
        break;
      case "sendTripSms":
        result = await manualSendTripSms(dealId, user.id);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in manual reminder API:", error);
    return NextResponse.json(
      { error: "Failed to process manual action" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const result = await getReminderStats(workspaceId || undefined);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting reminder stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
