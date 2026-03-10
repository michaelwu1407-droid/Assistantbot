import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildGoogleCalendarAuthUrl } from "@/lib/workspace-calendar";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user?.workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({
    authUrl: buildGoogleCalendarAuthUrl(user.workspaceId),
  });
}
