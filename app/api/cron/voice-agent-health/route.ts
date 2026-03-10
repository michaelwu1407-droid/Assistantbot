import { NextRequest, NextResponse } from "next/server";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { getVoiceFleetHealth, getVoiceSurfaceSaturationHealth } from "@/lib/voice-fleet";
import { getTwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import {
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

  try {
    const [fleet, customerSaturation, twilioRouting, recentCalls, latency] = await Promise.all([
      getVoiceFleetHealth(),
      getVoiceSurfaceSaturationHealth("normal"),
      auditTwilioVoiceRouting({ apply: true }),
      getTwilioVoiceCallHealth({ lookbackMinutes: 20, limitPerAccount: 50 }),
      getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
    ]);

    const observations = [
      ...buildFleetIncidentObservations(fleet),
      ...buildSaturationIncidentObservations(customerSaturation),
      ...buildRoutingIncidentObservations(twilioRouting),
      ...buildCallHealthIncidentObservations(recentCalls),
      ...buildLatencyIncidentObservations(latency),
    ];
    const incidents = await reconcileVoiceIncidents(observations);
    const status = combineVoiceStatuses([
      fleet.status,
      customerSaturation.status,
      twilioRouting.status,
      recentCalls.status,
      latency.status,
    ]);

    return NextResponse.json(
      {
        status,
        checkedAt: new Date().toISOString(),
        fleet,
        customerSaturation,
        twilioRouting,
        recentCalls,
        latency,
        incidents,
      },
      { status: status === "unhealthy" ? 500 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown voice monitor failure";
    const notifications = await dispatchVoiceIncidentNotifications({
      subject: "VOICE ALERT: monitor error",
      message: `Voice fleet health monitor crashed: ${message}`,
      metadata: { checkedAt: new Date().toISOString() },
    }).catch(() => null);

    return NextResponse.json(
      {
        error: "Voice agent health check failed",
        details: message,
        checkedAt: new Date().toISOString(),
        notifications,
      },
      { status: 500 },
    );
  }
}
