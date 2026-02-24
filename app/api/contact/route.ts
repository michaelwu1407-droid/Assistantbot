import { NextRequest, NextResponse } from "next/server"

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

    // Optional: send email via Resend if RESEND_API_KEY is set
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
            "",
            message,
          ]
            .filter(Boolean)
            .join("\n"),
        })
      } catch (emailError) {
        console.error("Contact form email send failed:", emailError)
        return NextResponse.json(
          { error: "Failed to send message. Please try again or email us directly." },
          { status: 500 }
        )
      }
    }
    // If no Resend, we still return success (you can log to DB or use another channel later)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    )
  }
}
