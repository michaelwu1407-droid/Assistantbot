import { NextRequest, NextResponse } from "next/server"
import { initiateDemoCall } from "@/lib/demo-call"
import { dispatchDemoCallFailureAlert } from "@/lib/demo-call-failure-alert"
import {
  markDemoLeadFailed,
  markDemoLeadInitiated,
  persistDemoLeadAttempt,
} from "@/lib/demo-lead-store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { department, name, email, phone, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject and message are required." },
        { status: 400 }
      )
    }

    // If a phone number was provided, trigger a Tracey callback right away.
    // The whole point of the product is that we call them back, so this must
    // never depend on the user manually configuring an automation rule.
    let callPlaced = false
    let callError: string | null = null
    if (typeof phone === "string" && phone.trim()) {
      const [firstName, ...rest] = String(name).trim().split(/\s+/)
      const lastName = rest.join(" ")
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined
      const userAgent = request.headers.get("user-agent") || undefined

      const leadId = await persistDemoLeadAttempt({
        firstName: firstName || "there",
        lastName,
        phone,
        email,
        source: "contact_form",
        ipAddress,
        userAgent,
      })

      try {
        const result = await initiateDemoCall({
          phone,
          firstName: firstName || "there",
          lastName,
          email,
        })
        callPlaced = true
        await markDemoLeadInitiated(leadId, {
          roomName: result.roomName,
          resolvedTrunkId: result.resolvedTrunkId,
          callerNumber: result.callerNumber,
          warnings: result.warnings,
        })
        console.log("[contact] Tracey callback initiated:", {
          leadId,
          room: result.roomName,
          phone: result.normalizedPhone,
        })
      } catch (err) {
        callError = err instanceof Error ? err.message : "Failed to place call"
        console.error("[contact] Failed to initiate Tracey callback:", err)
        await markDemoLeadFailed(leadId, err)
        await dispatchDemoCallFailureAlert({
          leadId,
          source: "contact_form",
          firstName: firstName || "there",
          lastName,
          email,
          phone,
          error: err,
        }).catch(() => null)
      }
    }

    // Optional: send email via Resend if RESEND_API_KEY is set.
    // Email is best-effort and must not block the callback success path.
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      try {
        const { Resend } = await import("resend")
        const resend = new Resend(resendKey)
        const fromDomain = process.env.RESEND_FROM_DOMAIN || "earlymark.ai"
        await resend.emails.send({
          from: `Earlymark Contact <contact@${fromDomain}>`,
          to: ["support@earlymark.ai"],
          replyTo: email,
          subject: `[Contact – ${department || "general"}] ${subject}`,
          text: [
            `Department: ${department || "general"}`,
            `Name: ${name}`,
            `Email: ${email}`,
            phone ? `Phone: ${phone}` : "",
            callPlaced ? `Tracey callback: initiated` : callError ? `Tracey callback FAILED: ${callError}` : "",
            "",
            message,
          ]
            .filter(Boolean)
            .join("\n"),
        })
      } catch (emailError) {
        console.error("Contact form email send failed:", emailError)
        // Email failure should not 500 if the callback already went through.
        if (!callPlaced) {
          return NextResponse.json(
            { error: "Failed to send message. Please try again or email us directly." },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ success: true, callPlaced, callError })
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    )
  }
}
