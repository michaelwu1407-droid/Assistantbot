import { NextRequest, NextResponse } from "next/server";
import { recordMonitorRun, getMonitorRunHealth } from "@/lib/ops-monitor-runs";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import { buildMonitorIncidentObservations } from "@/lib/voice-monitoring";
import { getVoiceAgentHealthMonitorSummary, runVoiceAgentHealthMonitor } from "@/lib/voice-agent-health-monitor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const checkedAt = new Date();
  const staleAfterMs = (Number(process.env.VOICE_MONITOR_STALE_AFTER_MINUTES || "15") || 15) * 60_000;

  try {
    let voiceAgentHealth = await getMonitorRunHealth("voice-agent-health", staleAfterMs);
    let refreshedVoiceAgentHealthRun = null;

    if (voiceAgentHealth.status === "unhealthy") {
      const refreshCheckedAt = new Date();

      try {
        refreshedVoiceAgentHealthRun = await runVoiceAgentHealthMonitor(refreshCheckedAt);
        await recordMonitorRun({
          monitorKey: "voice-agent-health",
          status: refreshedVoiceAgentHealthRun.status,
          summary: getVoiceAgentHealthMonitorSummary(refreshedVoiceAgentHealthRun.status),
          details: {
            checkedAt: refreshedVoiceAgentHealthRun.checkedAt,
            fleetStatus: refreshedVoiceAgentHealthRun.fleet.status,
            customerSaturationStatus: refreshedVoiceAgentHealthRun.customerSaturation.status,
            twilioRoutingStatus: refreshedVoiceAgentHealthRun.twilioRouting.status,
            invariantStatus: refreshedVoiceAgentHealthRun.invariants.status,
            recentCallsStatus: refreshedVoiceAgentHealthRun.recentCalls.status,
            latencyStatus: refreshedVoiceAgentHealthRun.latency.status,
            refreshedBy: "voice-monitor-watchdog",
          },
          checkedAt: refreshCheckedAt,
          succeeded: true,
        });
        voiceAgentHealth = await getMonitorRunHealth("voice-agent-health", staleAfterMs);
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : "Unknown voice monitor refresh failure";
        await recordMonitorRun({
          monitorKey: "voice-agent-health",
          status: "unhealthy",
          summary: `Voice agent health monitor crashed: ${refreshMessage}`,
          details: {
            checkedAt: refreshCheckedAt.toISOString(),
            error: refreshMessage,
            refreshedBy: "voice-monitor-watchdog",
          },
          checkedAt: refreshCheckedAt,
          succeeded: false,
        }).catch(() => null);
        throw refreshError;
      }
    }

    const observations = buildMonitorIncidentObservations(voiceAgentHealth);
    const incidents = await reconcileVoiceIncidents(observations, {
      resolveKeys: ["voice:monitor:stale"],
    });

    await recordMonitorRun({
      monitorKey: "voice-monitor-watchdog",
      status: voiceAgentHealth.status,
      summary:
        voiceAgentHealth.status === "healthy"
          ? "Voice monitor watchdog completed successfully"
          : voiceAgentHealth.summary,
      details: {
        checkedAt: checkedAt.toISOString(),
        voiceAgentHealth,
        refreshedVoiceAgentHealthRun,
      },
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(
      {
        status: voiceAgentHealth.status,
        checkedAt: checkedAt.toISOString(),
        voiceAgentHealth,
        refreshedVoiceAgentHealthRun,
        incidents,
      },
      { status: voiceAgentHealth.status === "unhealthy" ? 500 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown watchdog failure";
    await recordMonitorRun({
      monitorKey: "voice-monitor-watchdog",
      status: "unhealthy",
      summary: `Voice monitor watchdog crashed: ${message}`,
      details: {
        checkedAt: checkedAt.toISOString(),
        error: message,
      },
      checkedAt,
      succeeded: false,
    }).catch(() => null);

    const notifications = await dispatchVoiceIncidentNotifications({
      subject: "VOICE ALERT: monitor watchdog error",
      message: `Voice monitor watchdog crashed: ${message}`,
      metadata: { checkedAt: checkedAt.toISOString() },
    }).catch(() => null);

    return NextResponse.json(
      {
        error: "Voice monitor watchdog failed",
        details: message,
        checkedAt: checkedAt.toISOString(),
        notifications,
      },
      { status: 500 },
    );
  }
}
