import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { assertSafeRecipient } from "@/lib/messaging/safe-recipient";
import { withCostCeiling } from "@/lib/cost-ceiling";
import { createSupportTicket } from "@/lib/support-tickets";

const RESEND_EMAIL_COST_USD = 0.001;

export async function POST(request: NextRequest) {
  try {
    const actor = await requireCurrentWorkspaceAccess();

    const { subject, message, priority } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ 
        error: "Subject and message are required" 
      }, { status: 400 });
    }

    // Get user details for support context
    const user = await db.user.findUnique({
      where: { id: actor.id },
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

    const ticket = await createSupportTicket({
      userId: user.id,
      workspaceId: actor.workspaceId,
      subject,
      message,
      priority,
      source: "settings_form",
      requesterName: user.name,
      requesterEmail: user.email,
      workspaceName: user.workspace?.name,
      workspaceType: user.workspace?.type,
      traceyNumber: user.workspace?.twilioPhoneNumber,
    });

    if (!resendKey) {
      return NextResponse.json({
        success: false,
        error: "Support email is not configured",
      }, { status: 500 });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const safeSupportTo = assertSafeRecipient("email", supportEmail);
    const emailResult = await withCostCeiling("resend", RESEND_EMAIL_COST_USD, () =>
      resend.emails.send({
        from: `Earlymark Support <${fromAddress}>`,
        to: [safeSupportTo],
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
      }),
    );

    if (emailResult.error) {
      return NextResponse.json({
        success: false,
        error: "Failed to send support request",
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Support request sent successfully",
      ticketId: ticket.ticketId,
      ticketRef: ticket.ticketRef,
      slaHours: ticket.slaHours,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Workspace access not found")
    ) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.error("Support request failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to send support request" 
    }, { status: 500 });
  }
}
