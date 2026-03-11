import { NextRequest, NextResponse } from "next/server";
import { getExpectedVoiceGatewayUrl, getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";

export const dynamic = "force-dynamic";

function extractProbeResult(twiml: string) {
  if (twiml.includes("VOICE MONITOR PROBE PASS")) return "pass";
  if (twiml.includes("VOICE MONITOR PROBE ORPHANED")) return "orphaned";
  if (twiml.includes("VOICE MONITOR PROBE DISABLED")) return "disabled";
  if (twiml.includes("VOICE MONITOR PROBE FALLBACK")) return "fallback";
  return "unknown";
}

async function resolveProbeTargetNumber() {
  const explicitTarget = (process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER || "").trim();
  if (explicitTarget) {
    return { targetNumber: explicitTarget, source: "VOICE_MONITOR_PROBE_TARGET_NUMBER" as const };
  }

  const configuredInboundNumber = getKnownEarlymarkInboundNumbers()[0] || "";
  if (configuredInboundNumber) {
    return { targetNumber: configuredInboundNumber, source: "known_inbound_env" as const };
  }

  try {
    const routing = await auditTwilioVoiceRouting({ apply: false });
    const probedNumber =
      routing.numbers.find((record) => record.scope === "earlymark" && record.found && record.phoneNumber)?.phoneNumber || "";

    if (probedNumber) {
      return { targetNumber: probedNumber, source: "twilio_routing_audit" as const };
    }
  } catch {
    // Leave detailed Twilio drift failures to the dedicated health monitor.
  }

  return { targetNumber: "", source: null as const };
}

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const checkedAt = new Date();
  const probeCaller = (
    process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER ||
    process.env.VOICE_ALERT_SMS_TO ||
    "+61434955958"
  ).trim();
  const { targetNumber, source: targetNumberSource } = await resolveProbeTargetNumber();
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
          targetNumberSource,
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
          probeCallerConfigured: Boolean(probeCaller),
          targetNumberConfigured: Boolean(targetNumber),
          targetNumberSource,
          gatewayUrlConfigured: Boolean(gatewayUrl),
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
