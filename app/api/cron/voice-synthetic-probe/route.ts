import { NextRequest, NextResponse } from "next/server";
import { getExpectedVoiceGatewayUrl, getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { normalizePhone } from "@/lib/phone-utils";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";

export const dynamic = "force-dynamic";

type ProbeTargetSource = "ops_header_target" | "VOICE_MONITOR_PROBE_TARGET_NUMBER" | "known_inbound_env" | null;
type ProbeCallerSource =
  | "ops_header_caller"
  | "VOICE_MONITOR_PROBE_CALLER_NUMBER"
  | "VOICE_ALERT_SMS_TO"
  | "default_probe_caller";

function extractProbeResult(twiml: string) {
  if (twiml.includes("VOICE MONITOR PROBE PASS")) return "pass";
  if (twiml.includes("VOICE MONITOR PROBE ORPHANED")) return "orphaned";
  if (twiml.includes("VOICE MONITOR PROBE DISABLED")) return "disabled";
  if (twiml.includes("VOICE MONITOR PROBE FALLBACK")) return "fallback";
  return "unknown";
}

function getProbeNumberOverride(req: NextRequest, headerName: string) {
  return normalizePhone(req.headers.get(headerName) || "");
}

function resolveProbeTargetNumber(req: NextRequest): { targetNumber: string; source: ProbeTargetSource } {
  const overrideTarget = getProbeNumberOverride(req, "x-voice-probe-target");
  if (overrideTarget) {
    return { targetNumber: overrideTarget, source: "ops_header_target" };
  }

  const explicitTarget = (process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER || "").trim();
  if (explicitTarget) {
    return {
      targetNumber: normalizePhone(explicitTarget),
      source: "VOICE_MONITOR_PROBE_TARGET_NUMBER",
    };
  }

  const configuredInboundNumber = getKnownEarlymarkInboundNumbers()[0] || "";
  if (configuredInboundNumber) {
    return { targetNumber: configuredInboundNumber, source: "known_inbound_env" };
  }

  return { targetNumber: "", source: null };
}

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const checkedAt = new Date();
  const probeCaller =
    getProbeNumberOverride(req, "x-voice-probe-caller") ||
    normalizePhone(
      process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER ||
        process.env.VOICE_ALERT_SMS_TO ||
        "+61434955958",
    );
  const probeCallerSource: ProbeCallerSource = req.headers.get("x-voice-probe-caller")
    ? "ops_header_caller"
    : process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER
      ? "VOICE_MONITOR_PROBE_CALLER_NUMBER"
      : process.env.VOICE_ALERT_SMS_TO
        ? "VOICE_ALERT_SMS_TO"
        : "default_probe_caller";
  const { targetNumber, source: targetNumberSource } = resolveProbeTargetNumber(req);
  const gatewayUrl = getExpectedVoiceGatewayUrl();

  try {
    if (!probeCaller || !targetNumber || !gatewayUrl) {
      const summary = "Synthetic voice probe is not fully configured, so the scheduled probe was skipped.";
      await recordMonitorRun({
        monitorKey: "voice-synthetic-probe",
        status: "degraded",
        summary,
        details: {
          checkedAt: checkedAt.toISOString(),
          skipped: true,
          probeCallerConfigured: Boolean(probeCaller),
          probeCallerSource,
          targetNumberConfigured: Boolean(targetNumber),
          targetNumberSource,
          gatewayUrlConfigured: Boolean(gatewayUrl),
        },
        checkedAt,
        succeeded: true,
      });

      return NextResponse.json(
        {
          status: "degraded",
          skipped: true,
          checkedAt: checkedAt.toISOString(),
          summary,
          probeCallerConfigured: Boolean(probeCaller),
          probeCallerSource,
          targetNumberConfigured: Boolean(targetNumber),
          targetNumberSource,
          gatewayUrlConfigured: Boolean(gatewayUrl),
        },
        { status: 200 },
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
        probeCaller,
        probeCallerSource,
        targetNumber,
        targetNumberSource,
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
        probeCaller,
        probeCallerSource,
        targetNumber,
        targetNumberSource,
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
