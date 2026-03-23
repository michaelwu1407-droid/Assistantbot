import { NextRequest, NextResponse } from "next/server";
import { initiateOutboundCall } from "@/lib/outbound-call";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/internal/outbound-call
 * Place an outbound call from the AI agent to a contact.
 * Requires either voice-agent-secret header or authenticated user session.
 */
export async function POST(req: NextRequest) {
  // Auth: accept either voice-agent-secret (for cron/internal) or user session
  const voiceSecret = req.headers.get("x-voice-agent-secret") || "";
  let authorized = isVoiceAgentSecretAuthorized(voiceSecret);

  if (!authorized) {
    try {
      const user = await getAuthUser();
      authorized = Boolean(user?.email);
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, contactPhone, contactName, dealId, reason } = body;

    if (!workspaceId || !contactPhone) {
      return NextResponse.json(
        { error: "workspaceId and contactPhone are required" },
        { status: 400 },
      );
    }

    const result = await initiateOutboundCall({
      workspaceId,
      contactPhone,
      contactName,
      dealId,
      reason,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[outbound-call] Failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to place outbound call",
      },
      { status: 500 },
    );
  }
}
