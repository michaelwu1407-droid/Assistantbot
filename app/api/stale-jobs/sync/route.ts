import { NextRequest, NextResponse } from "next/server"
import { scanAndUpdateStaleJobs } from "@/actions/stale-job-actions"
import { logger } from "@/lib/logging"

function isAuthorizedCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = req.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({} as any))
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : undefined

    const result = await scanAndUpdateStaleJobs(workspaceId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Scanned and updated ${result.data?.updatedCount || 0} stale jobs`
    })

  } catch (error) {
    logger.error("Error in stale jobs sync API", { component: "api/stale-jobs/sync", action: "POST" }, error as Error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId") || undefined

    const result = await scanAndUpdateStaleJobs(workspaceId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Scanned and updated ${result.data?.updatedCount || 0} stale jobs`
    })

  } catch (error) {
    logger.error("Error in stale jobs sync API", { component: "api/stale-jobs/sync", action: "GET" }, error as Error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
