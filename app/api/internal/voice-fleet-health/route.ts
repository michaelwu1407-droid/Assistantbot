import { NextRequest, NextResponse } from "next/server";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { getMonitorRunHealth } from "@/lib/ops-monitor-runs";
import { getPassiveProductionHealth } from "@/lib/passive-production-health";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceBusinessInvariantHealth } from "@/lib/voice-business-invariants";
import { getVoiceFleetHealth, getVoiceSurfaceSaturationHealth } from "@/lib/voice-fleet";
import { getTwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import { getLivekitSipHealth } from "@/lib/livekit-sip-health";
import { getVoiceMonitorStaleAfterMs, getVoiceSyntheticProbeStaleAfterMs } from "@/lib/voice-monitor-config";
import { combineVoiceStatuses } from "@/lib/voice-monitoring";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";
import { getDemoCallHealth } from "@/lib/demo-call-health";
import { getOutboundCallHealth } from "@/lib/outbound-call-health";

export const dynamic = "force-dynamic";

function isVoiceAgentAuthorized(req: NextRequest) {
  return isVoiceAgentSecretAuthorized(req.headers.get("x-voice-agent-secret"));
}

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req) && !isVoiceAgentAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const staleAfterMs = getVoiceMonitorStaleAfterMs();
  const syntheticProbeStaleAfterMs = getVoiceSyntheticProbeStaleAfterMs();
  const [
    fleet,
    customerSaturation,
    twilioRouting,
    livekitSip,
    demoCalls,
    outboundCalls,
    recentCalls,
    latency,
    passiveProduction,
    monitorHealth,
    watchdogHealth,
    passiveMonitorHealth,
    probeHealth,
  ] = await Promise.all([
    getVoiceFleetHealth(),
    getVoiceSurfaceSaturationHealth("normal"),
    auditTwilioVoiceRouting({ apply: false }),
    getLivekitSipHealth(),
    getDemoCallHealth(),
    getOutboundCallHealth(),
    getTwilioVoiceCallHealth({ lookbackMinutes: 30, limitPerAccount: 30 }),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
    getPassiveProductionHealth(),
    getMonitorRunHealth("voice-agent-health", staleAfterMs),
    getMonitorRunHealth("voice-monitor-watchdog", staleAfterMs),
    getMonitorRunHealth("passive-communications-health", staleAfterMs),
    getMonitorRunHealth("voice-synthetic-probe", syntheticProbeStaleAfterMs),
  ]);
  const invariants = await getVoiceBusinessInvariantHealth(twilioRouting);

  const status = combineVoiceStatuses([
    fleet.status,
    customerSaturation.status,
    twilioRouting.status,
    livekitSip.status,
    demoCalls.status,
    outboundCalls.status,
    invariants.status,
    recentCalls.status,
    latency.status,
    passiveProduction.voice.status,
    monitorHealth.status,
    watchdogHealth.status,
    passiveMonitorHealth.status,
    probeHealth.status,
  ]);

  return NextResponse.json(
    {
      status,
      checkedAt: new Date().toISOString(),
      fleet,
      customerSaturation,
      twilioRouting,
      livekitSip,
      demoCalls,
      outboundCalls,
      invariants,
      recentCalls,
      latency,
      passiveProduction,
      monitorHealth,
      watchdogHealth,
      passiveMonitorHealth,
      probeHealth,
    },
    { status: status === "unhealthy" ? 500 : 200 },
  );
}
