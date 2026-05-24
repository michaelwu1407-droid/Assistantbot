import { NextRequest, NextResponse } from "next/server";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { updateSupportTicketStatus } from "@/lib/support-tickets";

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
type TicketStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireCurrentWorkspaceAccess();
    const { id } = await params;
    const body = await request.json();
    const status = body.status as TicketStatus;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const ticket = await updateSupportTicketStatus(id, actor.workspaceId, status);
    return NextResponse.json({ ticket });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Workspace access not found")
    ) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
