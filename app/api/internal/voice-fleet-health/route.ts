import { NextRequest, NextResponse } from "next/server";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { getMonitorRunHealth } from "@/lib/ops-monitor-runs";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceBusinessInvariantHealth } from "@/lib/voice-business-invariants";
import { getVoiceFleetHealth, getVoiceSurfaceSaturationHealth } from "@/lib/voice-fleet";
import { getTwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import { getLivekitSipHealth } from "@/lib/livekit-sip-health";
import { combineVoiceStatuses } from "@/lib/voice-monitoring";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";

export const dynamic = "force-dynamic";

function isVoiceAgentAuthorized(req: NextRequest) {
  return isVoiceAgentSecretAuthorized(req.headers.get("x-voice-agent-secret"));
}

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req) && !isVoiceAgentAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const staleAfterMs = (Number(process.env.VOICE_MONITOR_STALE_AFTER_MINUTES || "15") || 15) * 60_000;
  const [fleet, customerSaturation, twilioRouting, livekitSip, recentCalls, latency, monitorHealth] = await Promise.all([
    getVoiceFleetHealth(),
    getVoiceSurfaceSaturationHealth("normal"),
    auditTwilioVoiceRouting({ apply: false }),
    getLivekitSipHealth(),
    getTwilioVoiceCallHealth({ lookbackMinutes: 30, limitPerAccount: 30 }),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
    getMonitorRunHealth("voice-agent-health", staleAfterMs),
  ]);
  const invariants = await getVoiceBusinessInvariantHealth(twilioRouting);

  const status = combineVoiceStatuses([
    fleet.status,
    customerSaturation.status,
    twilioRouting.status,
    livekitSip.status,
    invariants.status,
    recentCalls.status,
    latency.status,
    monitorHealth.status,
  ]);

  return NextResponse.json(
    {
      status,
      checkedAt: new Date().toISOString(),
      fleet,
      customerSaturation,
      twilioRouting,
      livekitSip,
      invariants,
      recentCalls,
      latency,
      monitorHealth,
    },
    { status: status === "unhealthy" ? 500 : 200 },
  );
}
