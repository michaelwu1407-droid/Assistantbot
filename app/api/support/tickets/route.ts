import { NextResponse } from "next/server";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { getSupportTickets } from "@/lib/support-tickets";

export async function GET() {
  try {
    const actor = await requireCurrentWorkspaceAccess();
    const tickets = await getSupportTickets(actor.workspaceId, actor.id);
    return NextResponse.json({ tickets });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Workspace access not found")
    ) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}
