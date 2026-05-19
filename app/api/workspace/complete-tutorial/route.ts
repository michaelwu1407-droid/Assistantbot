import { NextResponse } from "next/server"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { completeTutorial } from "@/actions/workspace-actions"

export async function POST() {
  let actor
  try {
    actor = await requireCurrentWorkspaceAccess()
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    await completeTutorial(actor.workspaceId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/workspace/complete-tutorial failed:", error)
    return NextResponse.json({ success: false, error: "Failed to complete tutorial" }, { status: 500 })
  }
}
