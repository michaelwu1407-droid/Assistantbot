import { NextRequest, NextResponse } from "next/server";
import { initiateDemoCall } from "@/lib/demo-call";

export async function POST(req: NextRequest) {
  let phone: string;
  let firstName: string;
  let businessName: string;

  try {
    const body = await req.json();
    phone = body.phone;
    firstName = body.firstName || "there";
    businessName = body.businessName || "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }

  try {
    const result = await initiateDemoCall({
      phone,
      firstName,
      businessName,
    });

    console.log("[demo-call] Initiated:", {
      room: result.roomName,
      phone: result.normalizedPhone,
      resolvedTrunkId: result.resolvedTrunkId,
      callerNumber: result.callerNumber,
      warnings: result.warnings,
    });

    return NextResponse.json({
      success: true,
      roomName: result.roomName,
      message: `Calling ${result.normalizedPhone}...`,
      trunkId: result.resolvedTrunkId,
      callerNumber: result.callerNumber,
      warnings: result.warnings,
    });
  } catch (err) {
    console.error("[demo-call] Failed to initiate demo call:", err);
    return NextResponse.json(
      {
        error: `Failed to initiate call: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
