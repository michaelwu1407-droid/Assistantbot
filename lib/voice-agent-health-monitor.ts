import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceBusinessInvariantHealth } from "@/lib/voice-business-invariants";
import { getVoiceFleetHealth, getVoiceSurfaceSaturationHealth, type RuntimeStatus } from "@/lib/voice-fleet";
import { getTwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import {
  buildBusinessInvariantIncidentObservations,
  buildCallHealthIncidentObservations,
  buildFleetIncidentObservations,
  buildLatencyIncidentObservations,
  buildRoutingIncidentObservations,
  buildSaturationIncidentObservations,
  combineVoiceStatuses,
} from "@/lib/voice-monitoring";

export type VoiceAgentHealthMonitorResult = {
  status: RuntimeStatus;
  checkedAt: string;
  fleet: Awaited<ReturnType<typeof getVoiceFleetHealth>>;
  customerSaturation: Awaited<ReturnType<typeof getVoiceSurfaceSaturationHealth>>;
  twilioRouting: Awaited<ReturnType<typeof auditTwilioVoiceRouting>>;
  invariants: Awaited<ReturnType<typeof getVoiceBusinessInvariantHealth>>;
  recentCalls: Awaited<ReturnType<typeof getTwilioVoiceCallHealth>>;
  latency: Awaited<ReturnType<typeof getVoiceLatencyHealth>>;
  incidents: Awaited<ReturnType<typeof reconcileVoiceIncidents>>;
};

export function getVoiceAgentHealthMonitorSummary(status: RuntimeStatus) {
  return status === "healthy"
    ? "Voice agent health monitor completed successfully"
    : `Voice agent health monitor completed with ${status} status`;
}

export async function runVoiceAgentHealthMonitor(
  checkedAt: Date = new Date(),
): Promise<VoiceAgentHealthMonitorResult> {
  const [fleet, customerSaturation, twilioRouting, recentCalls, latency] = await Promise.all([
    getVoiceFleetHealth(),
    getVoiceSurfaceSaturationHealth("normal"),
    auditTwilioVoiceRouting({ apply: true }),
    getTwilioVoiceCallHealth({ lookbackMinutes: 20, limitPerAccount: 50 }),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
  ]);
  const invariants = await getVoiceBusinessInvariantHealth(twilioRouting);

  const observations = [
    ...buildFleetIncidentObservations(fleet),
    ...buildSaturationIncidentObservations(customerSaturation),
    ...buildRoutingIncidentObservations(twilioRouting),
    ...buildBusinessInvariantIncidentObservations(invariants),
    ...buildCallHealthIncidentObservations(recentCalls),
    ...buildLatencyIncidentObservations(latency),
  ];
  const incidents = await reconcileVoiceIncidents(observations);
  const status = combineVoiceStatuses([
    fleet.status,
    customerSaturation.status,
    twilioRouting.status,
    invariants.status,
    recentCalls.status,
    latency.status,
  ]);

  return {
    status,
    checkedAt: checkedAt.toISOString(),
    fleet,
    customerSaturation,
    twilioRouting,
    invariants,
    recentCalls,
    latency,
    incidents,
  };
}
