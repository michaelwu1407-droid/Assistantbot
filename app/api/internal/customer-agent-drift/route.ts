import { NextRequest, NextResponse } from "next/server";
import { auditTwilioMessagingRouting, auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";
import { getVoiceFleetHealth } from "@/lib/voice-fleet";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import { combineVoiceStatuses } from "@/lib/voice-monitoring";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";

export const dynamic = "force-dynamic";

function isVoiceAgentAuthorized(req: NextRequest) {
  return isVoiceAgentSecretAuthorized(req.headers.get("x-voice-agent-secret"));
}

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req) && !isVoiceAgentAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const [twilio, twilioMessaging, voiceWorker, fleet, latency] = await Promise.all([
    auditTwilioVoiceRouting({ apply: false }),
    auditTwilioMessagingRouting({ apply: false }),
    getVoiceAgentRuntimeDrift(),
    getVoiceFleetHealth(),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
  ]);

  const status = combineVoiceStatuses([twilio.status, voiceWorker.status, fleet.status, latency.status]);
  const overallStatus =
    twilioMessaging.status === "unhealthy"
      ? "unhealthy"
      : twilioMessaging.status === "degraded" && status === "healthy"
        ? "degraded"
        : status;

  return NextResponse.json({
    status: overallStatus,
    twilio,
    twilioMessaging,
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

  const [twilio, twilioMessaging, voiceWorker, fleet, latency] = await Promise.all([
    auditTwilioVoiceRouting({ apply: true }),
    auditTwilioMessagingRouting({ apply: true }),
    getVoiceAgentRuntimeDrift(),
    getVoiceFleetHealth(),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
  ]);

  const status = combineVoiceStatuses([twilio.status, voiceWorker.status, fleet.status, latency.status]);
  const overallStatus =
    twilioMessaging.status === "unhealthy"
      ? "unhealthy"
      : twilioMessaging.status === "degraded" && status === "healthy"
        ? "degraded"
        : status;

  return NextResponse.json(
    {
      status: overallStatus,
      twilio,
      twilioMessaging,
      voiceWorker,
      fleet,
      latency,
      checkedAt: new Date().toISOString(),
    },
    { status: overallStatus === "unhealthy" ? 500 : 200 },
  );
}
