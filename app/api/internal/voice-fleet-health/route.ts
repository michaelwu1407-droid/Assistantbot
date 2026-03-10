import { NextRequest, NextResponse } from "next/server";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { getMonitorRunHealth } from "@/lib/ops-monitor-runs";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceBusinessInvariantHealth } from "@/lib/voice-business-invariants";
import { getVoiceFleetHealth, getVoiceSurfaceSaturationHealth } from "@/lib/voice-fleet";
import { getTwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import { combineVoiceStatuses } from "@/lib/voice-monitoring";

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

  const staleAfterMs = (Number(process.env.VOICE_MONITOR_STALE_AFTER_MINUTES || "15") || 15) * 60_000;
  const [fleet, customerSaturation, twilioRouting, recentCalls, latency, monitorHealth] = await Promise.all([
    getVoiceFleetHealth(),
    getVoiceSurfaceSaturationHealth("normal"),
    auditTwilioVoiceRouting({ apply: false }),
    getTwilioVoiceCallHealth({ lookbackMinutes: 30, limitPerAccount: 30 }),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
    getMonitorRunHealth("voice-agent-health", staleAfterMs),
  ]);
  const invariants = await getVoiceBusinessInvariantHealth(twilioRouting);

  const status = combineVoiceStatuses([
    fleet.status,
    customerSaturation.status,
    twilioRouting.status,
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
      invariants,
      recentCalls,
      latency,
      monitorHealth,
    },
    { status: status === "unhealthy" ? 500 : 200 },
  );
}
