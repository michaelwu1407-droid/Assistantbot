import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyUnsubscribeToken } from "@/lib/email-unsubscribe-token"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? ""
  const contactId = verifyUnsubscribeToken(token)

  if (!contactId) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">
        <h2>Invalid link</h2>
        <p>This unsubscribe link is invalid or has expired.</p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    )
  }

  try {
    await db.contact.update({
      where: { id: contactId },
      data: { emailOptedOut: true },
    })
  } catch {
    // Contact may not exist — treat as success to avoid enumeration
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;max-width:480px;margin:auto">
      <h2>Unsubscribed</h2>
      <p>You won't receive further emails from this business via Earlymark.</p>
      <p style="color:#888;font-size:0.85rem">If this was a mistake, contact the business directly.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  )
}
