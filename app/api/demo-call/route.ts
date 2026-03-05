import { NextRequest, NextResponse } from "next/server";
import { SipClient } from "livekit-server-sdk";

/**
 * POST /api/demo-call
 * Initiates an outbound SIP call to a prospect via LiveKit + Twilio SIP trunk.
 * The LiveKit agent will join the room with callType=demo metadata,
 * triggering the demo-specific system prompt and 5-min timer.
 * 
 * TODO: Consider switching from Twilio to VolPine for SIP trunk to reduce costs
 * and simplify configuration. VolPine offers direct SIP-to-LiveKit integration
 * without the complex Twilio setup.
 */

const LIVEKIT_URL = process.env.LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

export async function POST(req: NextRequest) {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.error("[demo-call] Missing LIVEKIT env vars");
    return NextResponse.json(
      { error: "Voice infrastructure not configured" },
      { status: 503 }
    );
  }

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

  // Normalize phone: ensure E.164 format for AU numbers
  let normalizedPhone = phone.replace(/[\s\-()]/g, "");
  if (normalizedPhone.startsWith("04")) {
    normalizedPhone = "+61" + normalizedPhone.slice(1);
  } else if (!normalizedPhone.startsWith("+")) {
    normalizedPhone = "+61" + normalizedPhone.replace(/^0/, "");
  }

  try {
    // Convert wss:// URL to https:// for the API client
    const httpUrl = LIVEKIT_URL.replace("wss://", "https://");
    const sipClient = new SipClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    const roomName = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create outbound SIP participant — this dials the prospect's phone
    // and connects them into the LiveKit room where the agent will join
    const participant = await sipClient.createSipParticipant(
      process.env.LIVEKIT_SIP_TRUNK_ID || "", // SIP trunk ID for outbound
      normalizedPhone,
      roomName,
      {
        participantName: firstName,
        participantIdentity: `demo-caller-${normalizedPhone}`,
      }
    );

    console.log("[demo-call] SIP participant created:", {
      room: roomName,
      phone: normalizedPhone,
      participantSid: participant.participantId,
    });

    return NextResponse.json({
      success: true,
      roomName,
      message: `Calling ${normalizedPhone}...`,
    });
  } catch (err) {
    console.error("[demo-call] Failed to create SIP participant:", err);
    return NextResponse.json(
      {
        error: `Failed to initiate call: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
