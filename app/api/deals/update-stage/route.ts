import { NextResponse } from "next/server"
import { updateDealStage } from "@/actions/deal-actions"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const dealId = typeof body?.dealId === "string" ? body.dealId : ""
    const stage = typeof body?.stage === "string" ? body.stage : ""

    if (!dealId || !stage) {
      return NextResponse.json(
        { success: false, error: "dealId and stage are required" },
        { status: 400 }
      )
    }

    const result = await updateDealStage(dealId, stage)
    const status = result?.success ? 200 : 400
    return NextResponse.json(result, { status })
  } catch (error) {
    console.error("POST /api/deals/update-stage failed:", error)
    return NextResponse.json(
      { success: false, error: "Unable to update deal stage" },
      { status: 500 }
    )
  }
}
