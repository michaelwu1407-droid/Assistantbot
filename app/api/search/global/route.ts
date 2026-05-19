import { NextResponse } from "next/server"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { globalSearch } from "@/actions/search-actions"

export async function POST(request: Request) {
  let actor
  try {
    actor = await requireCurrentWorkspaceAccess()
  } catch {
    return NextResponse.json({ results: [], error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ results: [], error: "Invalid JSON" }, { status: 400 })
  }

  const query = (body && typeof body === "object" && typeof (body as Record<string, unknown>).query === "string")
    ? ((body as Record<string, unknown>).query as string)
    : ""

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await globalSearch(actor.workspaceId, query)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("POST /api/search/global failed:", error)
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}
