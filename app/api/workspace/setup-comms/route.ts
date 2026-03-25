import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging";
import { ensureWorkspaceProvisioned } from "@/lib/onboarding-provision";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  try {
    const requestStartedAt = Date.now();
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
        settings: true,
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

    const result = await ensureWorkspaceProvisioned({
      workspaceId: workspace.id,
      businessName,
      ownerPhone,
      triggerSource: "onboarding-check",
    });

    logger.info("ONBOARDING PROVISION: Last-step resolution complete", {
      workspaceId: workspace.id,
      provisioningStatus: result.provisioningStatus,
      elapsedMs: result.elapsedMs,
      totalRequestMs: Date.now() - requestStartedAt,
    });

    return NextResponse.json({ 
      success: result.success,
      phoneNumber: result.phoneNumber,
      provisioningStatus: result.provisioningStatus,
      error: result.error,
      stageReached: result.stageReached,
      mode: result.mode,
      errorCode: result.errorCode,
      status: result.status,
      bundleSid: result.bundleSid,
      subaccountSid: result.subaccountSid,
      elapsedMs: result.elapsedMs,
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
