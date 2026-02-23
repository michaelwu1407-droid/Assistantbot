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

    // Log support request to database
    await db.activity.create({
      data: {
        type: "NOTE",
        title: `Support Request: ${subject}`,
        content: `Priority: ${priority}\n\n${message}\n\nUser: ${user.email}\nWorkspace: ${user.workspace?.name}\nAI Agent Number: ${user.workspace?.twilioPhoneNumber || "Not configured"}`,
      },
    });

    // TODO: Send email to support team
    // await sendSupportEmail({
    //   to: "support@pjbuddy.com",
    //   subject: `Support Request: ${subject} (${priority})`,
    //   message,
    //   user: {
    //     email: user.email,
    //     name: user.name,
    //     workspace: user.workspace?.name,
    //     phoneNumber: user.workspace?.twilioPhoneNumber,
    //   }
    // });

    return NextResponse.json({ 
      success: true,
      message: "Support request sent successfully"
    });
  } catch (error: any) {
    console.error("Support request failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to send support request" 
    }, { status: 500 });
  }
}
