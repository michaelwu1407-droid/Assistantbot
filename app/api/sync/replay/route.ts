import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { requireContactInCurrentWorkspace, requireDealInCurrentWorkspace } from "@/lib/workspace-access"
import { updateJobStatus, createQuoteVariation } from "@/actions/tradie-actions"
import { logActivity } from "@/actions/activity-actions"

type ActivityType = "NOTE" | "CALL" | "EMAIL" | "TASK" | "MEETING"

const ACTIVITY_TYPES: ReadonlySet<ActivityType> = new Set([
  "NOTE",
  "CALL",
  "EMAIL",
  "TASK",
  "MEETING",
])

const JOB_STATUSES = ["SCHEDULED", "TRAVELING", "ON_SITE", "COMPLETED", "CANCELLED"] as const
type JobStatus = typeof JOB_STATUSES[number]

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = (body && typeof body === "object") ? body as Record<string, unknown> : {}
  const actionName = typeof parsed.actionName === "string" ? parsed.actionName : ""
  const payload = (parsed.payload && typeof parsed.payload === "object")
    ? parsed.payload as Record<string, unknown>
    : {}

  if (!actionName) {
    return NextResponse.json({ success: false, error: "actionName is required" }, { status: 400 })
  }

  try {
    if (actionName === "updateJobStatus") {
      const jobId = typeof payload.jobId === "string" ? payload.jobId : ""
      const status = typeof payload.status === "string" ? payload.status : ""
      if (!jobId || !(JOB_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json({ success: false, error: "jobId and valid status are required" }, { status: 400 })
      }
      const result = await updateJobStatus(jobId, status as JobStatus)
      return NextResponse.json(result, { status: result?.success ? 200 : 400 })
    }

    if (actionName === "createQuoteVariation") {
      const jobId = typeof payload.jobId === "string" ? payload.jobId : ""
      const rawItems = Array.isArray(payload.items) ? payload.items : []
      if (!jobId) {
        return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
      }
      const items: Array<{ desc: string; price: number }> = []
      for (const raw of rawItems) {
        if (!raw || typeof raw !== "object") continue
        const item = raw as Record<string, unknown>
        if (typeof item.desc !== "string" || typeof item.price !== "number") continue
        if (!Number.isFinite(item.price)) continue
        items.push({ desc: item.desc, price: item.price })
      }
      const result = await createQuoteVariation(jobId, items)
      return NextResponse.json(result, { status: result?.success ? 200 : 400 })
    }

    if (actionName === "logActivity") {
      const type = typeof payload.type === "string" ? payload.type : ""
      const title = typeof payload.title === "string" ? payload.title.trim() : ""
      if (!ACTIVITY_TYPES.has(type as ActivityType) || !title) {
        return NextResponse.json({ success: false, error: "type and title are required" }, { status: 400 })
      }
      const dealId = typeof payload.dealId === "string" && payload.dealId ? payload.dealId : undefined
      const contactId = typeof payload.contactId === "string" && payload.contactId ? payload.contactId : undefined
      if (!dealId && !contactId) {
        return NextResponse.json({ success: false, error: "dealId or contactId is required" }, { status: 400 })
      }
      if (dealId) await requireDealInCurrentWorkspace(dealId)
      if (contactId) await requireContactInCurrentWorkspace(contactId)

      const result = await logActivity({
        type: type as ActivityType,
        title,
        content: typeof payload.content === "string" ? payload.content : "",
        description: typeof payload.description === "string" ? payload.description : undefined,
        dealId,
        contactId,
      })
      return NextResponse.json(result, { status: result?.success ? 200 : 400 })
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${actionName}` }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync replay failed"
    if (/unauthor|not found|forbidden/i.test(message)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    console.error("POST /api/sync/replay failed:", error)
    return NextResponse.json({ success: false, error: "Sync replay failed" }, { status: 500 })
  }
}
