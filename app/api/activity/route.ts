import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId")
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 50)

  if (!workspaceId) {
    return NextResponse.json([], { status: 400 })
  }

  const logs = await db.activityLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return NextResponse.json(logs)
}
