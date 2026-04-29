import type { OpsMonitorHealth } from "@/lib/ops-monitor-runs";
import type { LivekitSipHealth } from "@/lib/livekit-sip-health";
import type { TwilioVoiceRoutingDrift } from "@/lib/twilio-drift";
import type { VoiceBusinessInvariantHealth } from "@/lib/voice-business-invariants";
import type { VoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import type { VoiceIncidentObservation } from "@/lib/voice-incidents";
import type { VoiceFleetHealth, VoiceSurface, VoiceSurfaceSaturationHealth } from "@/lib/voice-fleet";
import type { TwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";
import type { DemoCallHealth } from "@/lib/demo-call-health";
import type { OutboundCallHealth } from "@/lib/outbound-call-health";

export function combineVoiceStatuses(statuses: Array<"healthy" | "degraded" | "unhealthy">) {
  if (statuses.includes("unhealthy")) return "unhealthy";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

export function buildFleetIncidentObservations(fleet: VoiceFleetHealth): VoiceIncidentObservation[] {
  const observations: VoiceIncidentObservation[] = [];

  if (fleet.status !== "healthy") {
    observations.push({
      incidentKey: "voice:fleet:capacity",
      surface: "fleet",
      severity: fleet.status === "unhealthy" ? "critical" : "warning",
      summary: fleet.summary,
      details: {
        fleet,
      },
    });
  }

  (["demo", "inbound_demo", "normal"] as VoiceSurface[]).forEach((surface) => {
    const state = fleet.surfaces[surface];
    if (state.status === "healthy") return;
    if (state.status === "degraded" && state.capacityExhausted) return;

    observations.push({
      incidentKey: `voice:surface:${surface}:workers`,
      surface,
      severity: state.status === "unhealthy" ? "critical" : "warning",
      summary: state.summary,
      details: {
        surface: state,
      },
    });
  });

  return observations;
}

export function buildSaturationIncidentObservations(saturation: VoiceSurfaceSaturationHealth): VoiceIncidentObservation[] {
  if (saturation.status === "healthy") return [];

  return [
    {
      incidentKey: `voice:saturation:${saturation.surface}`,
      surface: saturation.surface,
      severity: "warning",
      summary: saturation.summary,
      details: {
        saturation,
      },
    },
  ];
}

export function buildRoutingIncidentObservations(routing: TwilioVoiceRoutingDrift): VoiceIncidentObservation[] {
  const observations: VoiceIncidentObservation[] = [];

  if (routing.status !== "healthy") {
    observations.push({
      incidentKey: "voice:routing:drift",
      surface: "routing",
      severity: routing.status === "unhealthy" ? "critical" : "warning",
      summary: routing.summary,
      details: {
        routing,
      },
    });
  }

  if (routing.orphanedNumbers.length > 0) {
    observations.push({
      incidentKey: "voice:routing:orphaned-number",
      surface: "routing",
      severity: "critical",
      summary: `${routing.orphanedNumbers.length} managed customer number(s) are missing workspace mappings.`,
      details: {
        orphanedNumbers: routing.orphanedNumbers,
      },
    });
  }

  return observations;
}

export function buildBusinessInvariantIncidentObservations(
  invariants: VoiceBusinessInvariantHealth,
): VoiceIncidentObservation[] {
  if (invariants.status === "healthy") return [];

  return invariants.issues.map((issue) => ({
    incidentKey: issue.incidentKey,
    surface: "data",
    severity: issue.severity,
    summary: issue.summary,
    details: issue.details,
  }));
}

export function buildMonitorIncidentObservations(monitorHealth: OpsMonitorHealth): VoiceIncidentObservation[] {
  if (monitorHealth.status === "healthy") return [];

  return [
    {
      incidentKey: "voice:monitor:stale",
      surface: "monitor",
      severity: monitorHealth.status === "unhealthy" ? "critical" : "warning",
      summary: monitorHealth.summary,
      details: {
        monitorHealth,
      },
    },
  ];
}

export function buildLivekitSipIncidentObservations(livekitSip: LivekitSipHealth): VoiceIncidentObservation[] {
  if (livekitSip.status === "healthy") return [];

  return [
    {
      incidentKey: "voice:livekit:sip",
      surface: "routing",
      severity: livekitSip.status === "unhealthy" ? "critical" : "warning",
      summary: livekitSip.summary,
      details: {
        livekitSip,
      },
    },
  ];
}

export function buildDemoCallIncidentObservations(demoCalls: DemoCallHealth): VoiceIncidentObservation[] {
  if (demoCalls.status === "healthy") return [];

  return [
    {
      incidentKey: "voice:demo:public-callbacks",
      surface: "demo",
      severity: demoCalls.status === "unhealthy" ? "critical" : "warning",
      summary: demoCalls.summary,
      details: {
        demoCalls,
      },
    },
  ];
}

export function buildOutboundCallIncidentObservations(outboundCalls: OutboundCallHealth): VoiceIncidentObservation[] {
  if (outboundCalls.status === "healthy") return [];

  return [
    {
      incidentKey: "voice:outbound:queued-calls",
      surface: "normal",
      severity: outboundCalls.status === "unhealthy" ? "critical" : "warning",
      summary: outboundCalls.summary,
      details: {
        outboundCalls,
      },
    },
  ];
}

export function buildCallHealthIncidentObservations(callHealth: TwilioVoiceCallHealth): VoiceIncidentObservation[] {
  return callHealth.scopes
    .filter((scope) => scope.status !== "healthy" && scope.failingCalls.length > 0)
    .map((scope) => ({
      incidentKey: `voice:calls:${scope.surface}:${scope.scopeId}`,
      surface: scope.surface,
      severity: scope.status === "unhealthy" ? "critical" : "warning",
      summary: scope.summary,
      details: {
        scope,
      },
    }));
}

export function buildLatencyIncidentObservations(latency: VoiceLatencyHealth): VoiceIncidentObservation[] {
  return latency.scopes
    .filter((scope) => scope.status !== "healthy")
    .map((scope) => ({
      incidentKey: `voice:latency:${scope.surface}`,
      surface: scope.surface,
      severity: scope.status === "unhealthy" ? "critical" : "warning",
      summary: scope.summary,
      details: {
        scope,
      },
    }));
}
