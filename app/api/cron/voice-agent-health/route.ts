import { NextRequest, NextResponse } from "next/server";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { getVoiceBusinessInvariantHealth } from "@/lib/voice-business-invariants";
import { getVoiceFleetHealth, getVoiceSurfaceSaturationHealth } from "@/lib/voice-fleet";
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

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return provided === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkedAt = new Date();

  try {
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
    await recordMonitorRun({
      monitorKey: "voice-agent-health",
      status,
      summary:
        status === "healthy"
          ? "Voice agent health monitor completed successfully"
          : `Voice agent health monitor completed with ${status} status`,
      details: {
        checkedAt: checkedAt.toISOString(),
        fleetStatus: fleet.status,
        customerSaturationStatus: customerSaturation.status,
        twilioRoutingStatus: twilioRouting.status,
        invariantStatus: invariants.status,
        recentCallsStatus: recentCalls.status,
        latencyStatus: latency.status,
      },
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(
      {
        status,
        checkedAt: checkedAt.toISOString(),
        fleet,
        customerSaturation,
        twilioRouting,
        invariants,
        recentCalls,
        latency,
        incidents,
      },
      { status: status === "unhealthy" ? 500 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice monitor failure";
    await recordMonitorRun({
      monitorKey: "voice-agent-health",
      status: "unhealthy",
      summary: `Voice agent health monitor crashed: ${message}`,
      details: {
        checkedAt: checkedAt.toISOString(),
        error: message,
      },
      checkedAt,
      succeeded: false,
    }).catch(() => null);
    const notifications = await dispatchVoiceIncidentNotifications({
      subject: "VOICE ALERT: monitor error",
      message: `Voice fleet health monitor crashed: ${message}`,
      metadata: { checkedAt: checkedAt.toISOString() },
    }).catch(() => null);

    return NextResponse.json(
      {
        error: "Voice agent health check failed",
        details: message,
        checkedAt: checkedAt.toISOString(),
        notifications,
      },
      { status: 500 },
    );
  }
}
