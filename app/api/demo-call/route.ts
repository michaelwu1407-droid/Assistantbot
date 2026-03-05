import { NextRequest, NextResponse } from "next/server";
import { SipClient } from "livekit-server-sdk";

/**
 * POST /api/demo-call
 * Initiates an outbound SIP call to a prospect via Self-Hosted LiveKit + Twilio SIP trunk.
 * 
 * INFRASTRUCTURE SETUP:
 * - LiveKit Server: Self-hosted (NOT LiveKit Cloud)
 * - SIP Integration: LiveKit SIP trunk → Twilio SIP trunk → Phone network
 * - Agent: LiveKit agent joins room with demo-specific prompt
 * 
 * ENVIRONMENT VARIABLES NEEDED:
 * - LIVEKIT_URL: wss://your-livekit-server.com
 * - LIVEKIT_API_KEY: From your self-hosted LiveKit server
 * - LIVEKIT_API_SECRET: From your self-hosted LiveKit server  
 * - LIVEKIT_SIP_TRUNK_ID: Self-hosted LiveKit SIP trunk ID (starts with ST_)
 * - LIVEKIT_SIP_TERMINATION_URI: earlymark-outbound.pstn.twilio.com
 * 
 * SETUP STEPS:
 * 1. Create SIP trunk in your self-hosted LiveKit server admin
 * 2. Configure trunk to point to Twilio SIP domain
 * 3. Update LIVEKIT_SIP_TRUNK_ID with your LiveKit trunk ID (NOT Twilio TK_ ID)
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
