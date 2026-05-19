import { NextResponse } from "next/server"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { searchContacts } from "@/actions/contact-actions"

export async function POST(request: Request) {
  let actor
  try {
    actor = await requireCurrentWorkspaceAccess()
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const query = (body && typeof body === "object" && typeof (body as Record<string, unknown>).query === "string")
    ? ((body as Record<string, unknown>).query as string)
    : ""

  if (!query.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchContacts(actor.workspaceId, query)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("POST /api/contacts/search failed:", error)
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 })
  }
}
