import { NextRequest, NextResponse } from "next/server";
import { initiateDemoCall } from "@/lib/demo-call";
import { dispatchDemoCallFailureAlert } from "@/lib/demo-call-failure-alert";
import { sendDemoLeadNotificationEmail } from "@/lib/demo-lead-email";
import {
  markDemoLeadFailed,
  markDemoLeadInitiated,
  persistDemoLeadAttempt,
} from "@/lib/demo-lead-store";

export async function POST(req: NextRequest) {
  let phone: string;
  let firstName: string;
  let lastName: string;
  let email: string;
  let businessName: string;

  try {
    const body = await req.json();
    phone = typeof body.phone === "string" ? body.phone : "";
    firstName = typeof body.firstName === "string" && body.firstName.trim() ? body.firstName : "there";
    lastName = typeof body.lastName === "string" ? body.lastName : "";
    email = typeof body.email === "string" ? body.email : "";
    businessName = typeof body.businessName === "string" ? body.businessName : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  const leadId = await persistDemoLeadAttempt({
    firstName,
    lastName,
    phone,
    email,
    businessName,
    source: "api",
    ipAddress,
    userAgent,
  });

  try {
    const result = await initiateDemoCall({
      phone,
      firstName,
      lastName,
      email,
      businessName,
    }, {
      waitForConnection: false,
    });

    console.log("[demo-call] Initiated:", {
      leadId,
      room: result.roomName,
      phone: result.normalizedPhone,
      resolvedTrunkId: result.resolvedTrunkId,
      callerNumber: result.callerNumber,
      warnings: result.warnings,
    });

    await markDemoLeadInitiated(leadId, {
      roomName: result.roomName,
      resolvedTrunkId: result.resolvedTrunkId,
      callerNumber: result.callerNumber,
      warnings: result.warnings,
    });

    await sendDemoLeadNotificationEmail({
      leadId,
      source: "api",
      firstName,
      lastName,
      phone,
      email,
      businessName,
      callStatus: "initiated",
      roomName: result.roomName,
      resolvedTrunkId: result.resolvedTrunkId,
      callerNumber: result.callerNumber,
      warnings: result.warnings,
    }).catch((emailError) => {
      console.error("[demo-call] Failed to send sales lead email:", emailError);
    });

    return NextResponse.json({
      success: true,
      leadId,
      roomName: result.roomName,
      message: `Calling ${result.normalizedPhone}...`,
      trunkId: result.resolvedTrunkId,
      callerNumber: result.callerNumber,
      warnings: result.warnings,
    });
  } catch (err) {
    console.error("[demo-call] Failed to initiate demo call:", err);
    await markDemoLeadFailed(leadId, err);
    await dispatchDemoCallFailureAlert({
      leadId,
      source: "api",
      firstName,
      lastName,
      email,
      phone,
      businessName,
      error: err,
    }).catch(() => null);

    await sendDemoLeadNotificationEmail({
      leadId,
      source: "api",
      firstName,
      lastName,
      phone,
      email,
      businessName,
      callStatus: "failed",
      callError: err instanceof Error ? err.message : "Unknown error",
    }).catch((emailError) => {
      console.error("[demo-call] Failed to send sales lead email:", emailError);
    });

    return NextResponse.json(
      {
        leadId,
        error: `Failed to initiate call: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
