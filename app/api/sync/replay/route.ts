import { NextResponse } from "next/server"
import { updateJobStatus, createQuoteVariation } from "@/actions/tradie-actions"
import { logActivity } from "@/actions/activity-actions"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const actionName = typeof body?.actionName === "string" ? body.actionName : ""
    const payload = (body?.payload ?? {}) as Record<string, unknown>

    if (!actionName) {
      return NextResponse.json({ success: false, error: "actionName is required" }, { status: 400 })
    }

    if (actionName === "updateJobStatus") {
      const jobId = typeof payload.jobId === "string" ? payload.jobId : ""
      const status = typeof payload.status === "string" ? payload.status : ""
      if (!jobId || !status) {
        return NextResponse.json({ success: false, error: "jobId and status are required" }, { status: 400 })
      }
      const result = await updateJobStatus(jobId, status as "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED" | "CANCELLED")
      return NextResponse.json(result, { status: result?.success ? 200 : 400 })
    }

    if (actionName === "createQuoteVariation") {
      const jobId = typeof payload.jobId === "string" ? payload.jobId : ""
      const items = Array.isArray(payload.items) ? payload.items : []
      if (!jobId) {
        return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
      }
      const result = await createQuoteVariation(jobId, items as Array<{ desc: string; price: number }>)
      return NextResponse.json(result, { status: result?.success ? 200 : 400 })
    }

    if (actionName === "logActivity") {
      const normalizedPayload = {
        ...payload,
        content: typeof payload.content === "string" ? payload.content : "",
      }
      const result = await logActivity(normalizedPayload as {
        type: "NOTE" | "CALL" | "EMAIL" | "TASK" | "MEETING"
        title: string
        content: string
        description?: string
        dealId?: string
        contactId?: string
      })
      return NextResponse.json(result, { status: result?.success ? 200 : 400 })
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${actionName}` }, { status: 400 })
  } catch (error) {
    console.error("POST /api/sync/replay failed:", error)
    return NextResponse.json({ success: false, error: "Sync replay failed" }, { status: 500 })
  }
}
