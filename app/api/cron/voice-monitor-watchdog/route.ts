import { NextRequest, NextResponse } from "next/server";
import { recordMonitorRun, getMonitorRunHealth } from "@/lib/ops-monitor-runs";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import { buildMonitorIncidentObservations } from "@/lib/voice-monitoring";

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
  const staleAfterMs = (Number(process.env.VOICE_MONITOR_STALE_AFTER_MINUTES || "15") || 15) * 60_000;

  try {
    const voiceAgentHealth = await getMonitorRunHealth("voice-agent-health", staleAfterMs);
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
      },
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(
      {
        status: voiceAgentHealth.status,
        checkedAt: checkedAt.toISOString(),
        voiceAgentHealth,
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
