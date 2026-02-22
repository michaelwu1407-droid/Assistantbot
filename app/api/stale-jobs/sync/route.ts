import { NextRequest, NextResponse } from "next/server"
import { scanAndUpdateStaleJobs } from "@/actions/stale-job-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workspaceId } = body

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
    console.error("Error in stale jobs sync API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Also support GET for easier testing
  try {
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
    console.error("Error in stale jobs sync API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
