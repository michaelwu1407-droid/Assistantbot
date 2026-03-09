import { NextRequest, NextResponse } from "next/server";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

function isVoiceAgentAuthorized(req: NextRequest) {
  const expected = process.env.VOICE_AGENT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET || "";
  const provided = req.headers.get("x-voice-agent-secret") || "";
  return Boolean(expected) && provided === expected;
}

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req) && !isVoiceAgentAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const [twilio, voiceWorker] = await Promise.all([
    auditTwilioVoiceRouting({ apply: false }),
    getVoiceAgentRuntimeDrift(),
  ]);

  return NextResponse.json({
    status: [twilio.status, voiceWorker.status].includes("unhealthy")
      ? "unhealthy"
      : [twilio.status, voiceWorker.status].includes("degraded")
        ? "degraded"
        : "healthy",
    twilio,
    voiceWorker,
    checkedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const [twilio, voiceWorker] = await Promise.all([
    auditTwilioVoiceRouting({ apply: true }),
    getVoiceAgentRuntimeDrift(),
  ]);

  const status = [twilio.status, voiceWorker.status].includes("unhealthy")
    ? "unhealthy"
    : [twilio.status, voiceWorker.status].includes("degraded")
      ? "degraded"
      : "healthy";

  return NextResponse.json(
    {
      status,
      twilio,
      voiceWorker,
      checkedAt: new Date().toISOString(),
    },
    { status: status === "unhealthy" ? 500 : 200 },
  );
}
