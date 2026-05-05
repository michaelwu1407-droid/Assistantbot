import { NextRequest, NextResponse } from "next/server";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import { runVoiceSyntheticProbe } from "@/lib/voice-synthetic-probe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const checkedAt = new Date();

  try {
    const result = await runVoiceSyntheticProbe({
      checkedAt,
      probeCallerOverride: req.headers.get("x-voice-probe-caller"),
      probeTargetOverride: req.headers.get("x-voice-probe-target"),
    });

    await recordMonitorRun({
      monitorKey: "voice-synthetic-probe",
      status: result.status,
      summary: result.summary,
      details: result.details,
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(
      {
        status: result.status,
        checkedAt: result.checkedAt,
        summary: result.summary,
        skipped: result.skipped,
        probeResult: result.probeResult,
        probeCaller: result.probeCaller,
        probeCallerSource: result.probeCallerSource,
        targetNumber: result.targetNumber,
        targetNumberSource: result.targetNumberSource,
        expectedSipTarget: result.expectedSipTarget,
        responseStatus: result.responseStatus,
        gatewayProbe: result.gatewayProbe
          ? {
              result: result.gatewayProbe.result,
              responseStatus: result.gatewayProbe.responseStatus,
            }
          : null,
        spokenCanary: result.spokenCanary,
        incidents: result.incidents,
      },
      { status: result.status === "unhealthy" ? 500 : 200 },
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
