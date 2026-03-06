import { NextRequest, NextResponse } from "next/server";
import { provisionTradieCommsWithFallback } from "@/lib/comms-provision";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { businessName, ownerPhone } = await request.json();

    // Get the user's workspace
    const workspace = await db.workspace.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        twilioPhoneNumber: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ 
        error: "No workspace found for this user" 
      }, { status: 404 });
    }

    if (!businessName) {
      return NextResponse.json({ 
        error: "Missing required field: businessName" 
      }, { status: 400 });
    }

    // Idempotency: return the existing provisioned number instead of buying again.
    if (workspace.twilioPhoneNumber) {
      return NextResponse.json({
        success: true,
        phoneNumber: workspace.twilioPhoneNumber,
        result: {
          success: true,
          phoneNumber: workspace.twilioPhoneNumber,
          stageReached: "already-provisioned",
        },
      });
    }

    const result = await provisionTradieCommsWithFallback(
      workspace.id,
      businessName,
      ownerPhone || ""
    );

    return NextResponse.json({ 
      success: result.success,
      phoneNumber: result.phoneNumber,
      error: result.error,
      stageReached: result.stageReached,
      mode: result.mode,
      result: result
    });
  } catch (error: any) {
    console.error("Manual comms setup failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
