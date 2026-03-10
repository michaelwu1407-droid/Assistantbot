import type { TwilioVoiceRoutingDrift } from "@/lib/twilio-drift";
import type { VoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import type { VoiceIncidentObservation } from "@/lib/voice-incidents";
import type { VoiceFleetHealth, VoiceSurface } from "@/lib/voice-fleet";
import type { TwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";

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

export function buildRoutingIncidentObservations(routing: TwilioVoiceRoutingDrift): VoiceIncidentObservation[] {
  if (routing.status === "healthy") return [];

  return [
    {
      incidentKey: "voice:routing:drift",
      surface: "routing",
      severity: routing.status === "unhealthy" ? "critical" : "warning",
      summary: routing.summary,
      details: {
        routing,
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
