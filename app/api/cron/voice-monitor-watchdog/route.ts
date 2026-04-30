import { NextRequest, NextResponse } from "next/server";
import { recordMonitorRun, getMonitorRunHealth } from "@/lib/ops-monitor-runs";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import {
  getVoiceMonitorStaleAfterMs,
  getVoiceSyntheticProbeRefreshAfterMs,
  getVoiceSyntheticProbeStaleAfterMs,
} from "@/lib/voice-monitor-config";
import { buildMonitorIncidentObservations } from "@/lib/voice-monitoring";
import { getPassiveProductionHealth } from "@/lib/passive-production-health";
import { runVoiceSyntheticProbe } from "@/lib/voice-synthetic-probe";
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
  const staleAfterMs = getVoiceMonitorStaleAfterMs();
  const syntheticProbeStaleAfterMs = getVoiceSyntheticProbeStaleAfterMs();
  const syntheticProbeRefreshAfterMs = getVoiceSyntheticProbeRefreshAfterMs();

  try {
    let voiceAgentHealth = await getMonitorRunHealth("voice-agent-health", staleAfterMs);
    let refreshedVoiceAgentHealthRun = null;
    let passiveTrafficHealth = await getMonitorRunHealth("passive-communications-health", staleAfterMs);
    let refreshedPassiveTrafficRun = null;
    let syntheticProbeHealth = await getMonitorRunHealth("voice-synthetic-probe", syntheticProbeStaleAfterMs);
    let refreshedSyntheticProbeRun = null;

    if (syntheticProbeHealth.ageMs === null || syntheticProbeHealth.ageMs >= syntheticProbeRefreshAfterMs) {
      const refreshCheckedAt = new Date();

      try {
        refreshedSyntheticProbeRun = await runVoiceSyntheticProbe({
          checkedAt: refreshCheckedAt,
        });
        await recordMonitorRun({
          monitorKey: "voice-synthetic-probe",
          status: refreshedSyntheticProbeRun.status,
          summary: refreshedSyntheticProbeRun.summary,
          details: {
            ...refreshedSyntheticProbeRun.details,
            refreshedBy: "voice-monitor-watchdog",
          },
          checkedAt: refreshCheckedAt,
          succeeded: true,
        });
        syntheticProbeHealth = await getMonitorRunHealth("voice-synthetic-probe", syntheticProbeStaleAfterMs);
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : "Unknown synthetic probe refresh failure";
        await recordMonitorRun({
          monitorKey: "voice-synthetic-probe",
          status: "unhealthy",
          summary: `Synthetic voice probe crashed: ${refreshMessage}`,
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

    // Don't immediately rerun fleet health just because the watchdog placed its own
    // spoken canary call. The sales worker is single-capacity, so the canary can
    // transiently mark demo/inbound_demo as saturated until the next heartbeat lands.
    if (voiceAgentHealth.status !== "healthy") {
      const refreshCheckedAt = new Date();

      try {
        refreshedVoiceAgentHealthRun = await runVoiceAgentHealthMonitor(refreshCheckedAt);
        await recordMonitorRun({
          monitorKey: "voice-agent-health",
          status: refreshedVoiceAgentHealthRun.status,
          summary: getVoiceAgentHealthMonitorSummary(refreshedVoiceAgentHealthRun.status),
          details: buildVoiceAgentHealthMonitorDetails(refreshedVoiceAgentHealthRun, {
            refreshedBy: "voice-monitor-watchdog",
          }),
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

    if (passiveTrafficHealth.status !== "healthy") {
      const refreshCheckedAt = new Date();

      try {
        refreshedPassiveTrafficRun = await getPassiveProductionHealth();
        await recordMonitorRun({
          monitorKey: "passive-communications-health",
          status: refreshedPassiveTrafficRun.status,
          summary: refreshedPassiveTrafficRun.summary,
          details: {
            checkedAt: refreshedPassiveTrafficRun.checkedAt,
            voiceStatus: refreshedPassiveTrafficRun.voice.status,
            smsStatus: refreshedPassiveTrafficRun.sms.status,
            emailStatus: refreshedPassiveTrafficRun.email.status,
            activeWorkspaceCount: refreshedPassiveTrafficRun.activeWorkspaceCount,
            unhealthyActiveWorkspaceCount: refreshedPassiveTrafficRun.unhealthyActiveWorkspaceCount,
            unknownWorkspaceCount: refreshedPassiveTrafficRun.unknownWorkspaceCount,
            refreshedBy: "voice-monitor-watchdog",
          },
          checkedAt: refreshCheckedAt,
          succeeded: true,
        });
        passiveTrafficHealth = await getMonitorRunHealth("passive-communications-health", staleAfterMs);
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : "Unknown passive monitor refresh failure";
        await recordMonitorRun({
          monitorKey: "passive-communications-health",
          status: "unhealthy",
          summary: `Passive communications monitor crashed: ${refreshMessage}`,
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

    const watchdogStatus =
      voiceAgentHealth.status === "unhealthy" ||
      passiveTrafficHealth.status === "unhealthy" ||
      syntheticProbeHealth.status === "unhealthy"
        ? "unhealthy"
        : voiceAgentHealth.status === "degraded" ||
            passiveTrafficHealth.status === "degraded" ||
            syntheticProbeHealth.status === "degraded"
          ? "degraded"
          : "healthy";
    const watchdogSummary =
      watchdogStatus === "healthy"
        ? "Voice monitor watchdog completed successfully"
        : voiceAgentHealth.status !== "healthy"
          ? voiceAgentHealth.summary
          : syntheticProbeHealth.status !== "healthy"
            ? syntheticProbeHealth.summary
          : passiveTrafficHealth.summary;

    await recordMonitorRun({
      monitorKey: "voice-monitor-watchdog",
      status: watchdogStatus,
      summary: watchdogSummary,
      details: {
        checkedAt: checkedAt.toISOString(),
        voiceAgentHealth,
        passiveTrafficHealth,
        syntheticProbeHealth,
        refreshedVoiceAgentHealthRun,
        refreshedPassiveTrafficRun,
        refreshedSyntheticProbeRun,
      },
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(
      {
        status: watchdogStatus,
        checkedAt: checkedAt.toISOString(),
        voiceAgentHealth,
        passiveTrafficHealth,
        syntheticProbeHealth,
        refreshedVoiceAgentHealthRun,
        refreshedPassiveTrafficRun,
        refreshedSyntheticProbeRun,
        incidents,
      },
      { status: watchdogStatus === "unhealthy" ? 500 : 200 },
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
