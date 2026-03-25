import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { logger } from "@/lib/logging"

export async function GET(req: NextRequest) {
  try {
    const actor = await requireCurrentWorkspaceAccess()
    const workspaceIdParam = req.nextUrl.searchParams.get("workspaceId")
    if (workspaceIdParam && workspaceIdParam !== actor.workspaceId) {
      return NextResponse.json({ error: "Forbidden workspace access" }, { status: 403 })
    }

    const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? "20")
    const safeLimit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 50))
      : 20

    const logs = await db.activityLog.findMany({
      where: { workspaceId: actor.workspaceId },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    logger.error("Failed to fetch activity logs", { component: "api/activity", action: "GET" }, error as Error)
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 })
  }
}
