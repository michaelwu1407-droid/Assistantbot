import { NextRequest, NextResponse } from "next/server";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import {
  buildVoiceAgentHealthMonitorDetails,
  getVoiceAgentHealthMonitorSummary,
  runVoiceAgentHealthMonitor,
} from "@/lib/voice-agent-health-monitor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const checkedAt = new Date();

  try {
    const result = await runVoiceAgentHealthMonitor(checkedAt);

    await recordMonitorRun({
      monitorKey: "voice-agent-health",
      status: result.status,
      summary: getVoiceAgentHealthMonitorSummary(result.status),
      details: buildVoiceAgentHealthMonitorDetails(result),
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(result, { status: result.status === "unhealthy" ? 500 : 200 });
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
