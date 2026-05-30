import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { logger } from "@/lib/logging"

export async function GET() {
  try {
    const actor = await requireCurrentWorkspaceAccess()

    const calls = await db.voiceCall.findMany({
      where: { workspaceId: actor.workspaceId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        callType: true,
        callerName: true,
        callerPhone: true,
        summary: true,
        startedAt: true,
        endedAt: true,
        dealId: true,
        contactId: true,
      },
    })

    return NextResponse.json(calls)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    logger.error("Failed to fetch recent calls", { component: "api/voice-calls/recent" }, error as Error)
    return NextResponse.json({ error: "Failed to fetch recent calls" }, { status: 500 })
  }
}
