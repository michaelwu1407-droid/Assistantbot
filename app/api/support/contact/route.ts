import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { subject, message, priority } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ 
        error: "Subject and message are required" 
      }, { status: 400 });
    }

    // Get user details for support context
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        workspace: {
          select: {
            name: true,
            twilioPhoneNumber: true,
            type: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const supportEmail = process.env.SUPPORT_EMAIL_TO || "support@earlymark.ai";
    const resendKey = process.env.RESEND_API_KEY;
    const fromDomain = process.env.RESEND_FROM_DOMAIN || "earlymark.ai";
    const fromAddress = process.env.SUPPORT_EMAIL_FROM || `support@${fromDomain}`;

    await db.activity.create({
      data: {
        type: "NOTE",
        title: `Support Request: ${subject}`,
        content: `Priority: ${priority}\n\n${message}\n\nUser: ${user.email}\nWorkspace: ${user.workspace?.name}\nAI Agent Number: ${user.workspace?.twilioPhoneNumber || "Not configured"}`,
      },
    });

    if (!resendKey) {
      return NextResponse.json({
        success: false,
        error: "Support email is not configured",
      }, { status: 500 });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const emailResult = await resend.emails.send({
      from: `Earlymark Support <${fromAddress}>`,
      to: [supportEmail],
      replyTo: user.email,
      subject: `[Support:${(priority || "medium").toUpperCase()}] ${subject}`,
      text: [
        `Priority: ${priority || "medium"}`,
        `User: ${user.name || "Unknown user"}`,
        `Email: ${user.email}`,
        `Workspace: ${user.workspace?.name || "Unknown workspace"}`,
        `Workspace type: ${user.workspace?.type || "unknown"}`,
        `Tracey number: ${user.workspace?.twilioPhoneNumber || "Not configured"}`,
        "",
        message,
      ].join("\n"),
    });

    if (emailResult.error) {
      return NextResponse.json({
        success: false,
        error: "Failed to send support request",
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Support request sent successfully"
    });
  } catch (error) {
    console.error("Support request failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to send support request" 
    }, { status: 500 });
  }
}
