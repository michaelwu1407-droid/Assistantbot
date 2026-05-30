import { NextResponse } from "next/server"
import { getTestOutbox, clearTestOutbox } from "@/lib/email-test-outbox"

const isTestMode =
  process.env.NODE_ENV === "test" || process.env.E2E_MODE === "true"

export async function GET() {
  if (!isTestMode) {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }
  return NextResponse.json({ sent: getTestOutbox() })
}

export async function DELETE() {
  if (!isTestMode) {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }
  clearTestOutbox()
  return NextResponse.json({ ok: true })
}
