import { NextRequest, NextResponse } from "next/server";
import { getExpectedVoiceGatewayUrl, getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return provided === secret;
}

function extractProbeResult(twiml: string) {
  if (twiml.includes("VOICE MONITOR PROBE PASS")) return "pass";
  if (twiml.includes("VOICE MONITOR PROBE ORPHANED")) return "orphaned";
  if (twiml.includes("VOICE MONITOR PROBE DISABLED")) return "disabled";
  if (twiml.includes("VOICE MONITOR PROBE FALLBACK")) return "fallback";
  return "unknown";
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkedAt = new Date();
  const probeCaller = (
    process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER ||
    process.env.VOICE_ALERT_SMS_TO ||
    "+61434955958"
  ).trim();
  const targetNumber = (process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER || "").trim() || getKnownEarlymarkInboundNumbers()[0] || "";
  const gatewayUrl = getExpectedVoiceGatewayUrl();

  try {
    if (!probeCaller || !targetNumber || !gatewayUrl) {
      const summary = "Synthetic voice probe is not fully configured.";
      await recordMonitorRun({
        monitorKey: "voice-synthetic-probe",
        status: "unhealthy",
        summary,
        details: {
          checkedAt: checkedAt.toISOString(),
          probeCallerConfigured: Boolean(probeCaller),
          targetNumberConfigured: Boolean(targetNumber),
          gatewayUrlConfigured: Boolean(gatewayUrl),
        },
        checkedAt,
        succeeded: true,
      });

      return NextResponse.json(
        {
          status: "unhealthy",
          checkedAt: checkedAt.toISOString(),
          summary,
        },
        { status: 500 },
      );
    }

    const formBody = new URLSearchParams({
      From: probeCaller,
      To: targetNumber,
    });
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
      cache: "no-store",
    });

    const twiml = await response.text();
    const probeResult = extractProbeResult(twiml);
    const status = probeResult === "pass" ? "healthy" : "unhealthy";
    const summary =
      probeResult === "pass"
        ? "Synthetic Earlymark inbound probe passed"
        : `Synthetic Earlymark inbound probe returned ${probeResult}`;

    const observations =
      status === "healthy"
        ? []
        : [
            {
              incidentKey: "voice:probe:earlymark-inbound",
              surface: "monitor" as const,
              severity: "critical" as const,
              summary,
              details: {
                probeResult,
                targetNumber,
                gatewayUrl,
                responseStatus: response.status,
                twiml,
              },
            },
          ];
    const incidents = await reconcileVoiceIncidents(observations, {
      resolveKeys: ["voice:probe:earlymark-inbound"],
    });

    await recordMonitorRun({
      monitorKey: "voice-synthetic-probe",
      status,
      summary,
      details: {
        checkedAt: checkedAt.toISOString(),
        probeResult,
        targetNumber,
        gatewayUrl,
        responseStatus: response.status,
      },
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(
      {
        status,
        checkedAt: checkedAt.toISOString(),
        summary,
        probeResult,
        targetNumber,
        responseStatus: response.status,
        incidents,
      },
      { status: status === "healthy" ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown synthetic probe failure";
    await recordMonitorRun({
      monitorKey: "voice-synthetic-probe",
      status: "unhealthy",
      summary: `Synthetic voice probe crashed: ${message}`,
      details: {
        checkedAt: checkedAt.toISOString(),
        error: message,
      },
      checkedAt,
      succeeded: false,
    }).catch(() => null);

    const notifications = await dispatchVoiceIncidentNotifications({
      subject: "VOICE ALERT: synthetic probe error",
      message: `Synthetic voice probe crashed: ${message}`,
      metadata: { checkedAt: checkedAt.toISOString() },
    }).catch(() => null);

    return NextResponse.json(
      {
        error: "Synthetic voice probe failed",
        details: message,
        checkedAt: checkedAt.toISOString(),
        notifications,
      },
      { status: 500 },
    );
  }
}
