import { NextResponse } from "next/server"
import { completeTutorial } from "@/actions/workspace-actions"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : ""

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 })
    }

    await completeTutorial(workspaceId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/workspace/complete-tutorial failed:", error)
    return NextResponse.json({ success: false, error: "Failed to complete tutorial" }, { status: 500 })
  }
}
