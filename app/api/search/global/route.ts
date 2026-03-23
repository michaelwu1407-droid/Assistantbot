import { NextResponse } from "next/server"
import { globalSearch } from "@/actions/search-actions"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : ""
    const query = typeof body?.query === "string" ? body.query : ""

    if (!workspaceId || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results = await globalSearch(workspaceId, query)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("POST /api/search/global failed:", error)
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}
