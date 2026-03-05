import { NextRequest, NextResponse } from "next/server";
import { initializeTradieComms } from "@/lib/comms";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      console.error("[setup-comms] No user ID found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { businessName, ownerPhone } = await request.json();
    console.log("[setup-comms] Request received:", { userId, businessName, ownerPhone: ownerPhone ? "***" : undefined });

    // Get the user's workspace
    const workspace = await db.workspace.findFirst({
      where: { ownerId: userId },
    });

    if (!workspace) {
      console.error("[setup-comms] No workspace found for user:", userId);
      return NextResponse.json({ 
        error: "No workspace found for this user" 
      }, { status: 404 });
    }

    if (!businessName) {
      return NextResponse.json({ 
        error: "Missing required field: businessName" 
      }, { status: 400 });
    }

    console.log("[setup-comms] Starting comms provision for workspace:", workspace.id);
    const result = await initializeTradieComms(
      workspace.id,
      businessName,
      ownerPhone || ""
    );
    console.log("[setup-comms] Provision result:", { success: result.success, stageReached: result.stageReached, error: result.error });

    return NextResponse.json({ 
      success: result.success,
      result: result
    });
  } catch (error: any) {
    console.error("[setup-comms] Error:", error.message, error.stack);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
