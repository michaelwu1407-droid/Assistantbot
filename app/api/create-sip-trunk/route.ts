import { NextResponse } from "next/server";
import { getLivekitSipTerminationUri } from "@/lib/livekit-sip-config";

/**
 * Create SIP Trunk via LiveKit API
 * This script creates a SIP trunk on your self-hosted LiveKit server
 */

const LIVEKIT_URL = process.env.LIVEKIT_URL?.replace("wss://", "https://") || "https://live.earlymark.ai";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";

export async function POST() {
  try {
    const sipServer = getLivekitSipTerminationUri();
    const response = await fetch(`${LIVEKIT_URL}/sip/trunk`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${generateLiveKitToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Earlymark Outbound",
        sip_server: sipServer,
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN,
        outbound: true,
      }),
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      trunkId: result.sip_trunk_id,
      sipServer,
      result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
}

function generateLiveKitToken() {
  // This would need the LiveKit SDK to generate proper auth token
  // For now, use the API key directly (might not work for all operations)
  return LIVEKIT_API_KEY;
}
