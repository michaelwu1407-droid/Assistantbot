import { NextRequest, NextResponse } from "next/server";
import { manualSendJobReminder, manualSendTripSms, getReminderStats } from "@/actions/reminder-actions";
import { requireCurrentWorkspaceAccess, requireDealInCurrentWorkspace } from "@/lib/workspace-access";

export async function POST(request: NextRequest) {
  let actor;
  try {
    actor = await requireCurrentWorkspaceAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: unknown; dealId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const dealId = typeof body.dealId === "string" ? body.dealId : "";

  if (!action || !dealId) {
    return NextResponse.json({ error: "Missing action or dealId" }, { status: 400 });
  }

  try {
    await requireDealInCurrentWorkspace(dealId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let result;
    switch (action) {
      case "sendReminder":
        result = await manualSendJobReminder(dealId, actor.id);
        break;
      case "sendTripSms":
        result = await manualSendTripSms(dealId, actor.id);
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
  let actor;
  try {
    actor = await requireCurrentWorkspaceAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedWorkspaceId = searchParams.get("workspaceId");
  if (requestedWorkspaceId && requestedWorkspaceId !== actor.workspaceId) {
    return NextResponse.json({ error: "Forbidden workspace access" }, { status: 403 });
  }

  try {
    const result = await getReminderStats(actor.workspaceId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting reminder stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
