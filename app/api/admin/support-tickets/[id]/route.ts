import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isInternalAdminEmail } from "@/lib/internal-admin";
import { db } from "@/lib/db";

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
type TicketStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthUser();
  if (!authUser || !isInternalAdminEmail(authUser.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = body.status as TicketStatus;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const ticket = await db.supportTicket.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
      },
    });
    return NextResponse.json({ ticket });
  } catch {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
}
