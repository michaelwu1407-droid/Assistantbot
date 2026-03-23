import { NextResponse } from "next/server"
import { searchContacts } from "@/actions/contact-actions"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : ""
    const query = typeof body?.query === "string" ? body.query : ""

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 })
    }

    if (!query.trim()) {
      return NextResponse.json({ results: [] })
    }

    const results = await searchContacts(workspaceId, query)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("POST /api/contacts/search failed:", error)
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 })
  }
}
