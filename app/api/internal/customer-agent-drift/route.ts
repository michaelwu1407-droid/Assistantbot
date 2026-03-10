import { NextRequest, NextResponse } from "next/server";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";
import { getVoiceFleetHealth } from "@/lib/voice-fleet";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import { combineVoiceStatuses } from "@/lib/voice-monitoring";
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

  const [twilio, voiceWorker, fleet, latency] = await Promise.all([
    auditTwilioVoiceRouting({ apply: false }),
    getVoiceAgentRuntimeDrift(),
    getVoiceFleetHealth(),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
  ]);

  return NextResponse.json({
    status: combineVoiceStatuses([twilio.status, voiceWorker.status, fleet.status, latency.status]),
    twilio,
    voiceWorker,
    fleet,
    latency,
    checkedAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const [twilio, voiceWorker, fleet, latency] = await Promise.all([
    auditTwilioVoiceRouting({ apply: true }),
    getVoiceAgentRuntimeDrift(),
    getVoiceFleetHealth(),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
  ]);

  const status = combineVoiceStatuses([twilio.status, voiceWorker.status, fleet.status, latency.status]);

  return NextResponse.json(
    {
      status,
      twilio,
      voiceWorker,
      fleet,
      latency,
      checkedAt: new Date().toISOString(),
    },
    { status: status === "unhealthy" ? 500 : 200 },
  );
}
