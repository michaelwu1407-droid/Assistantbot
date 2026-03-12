import { NextResponse } from "next/server";
import { performOpsHealthAudit } from "@/lib/health-check";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  try {
    const audit = await performOpsHealthAudit({ applyTwilioReconciliation: true });

    await recordMonitorRun({
      monitorKey: "customer-agent-reconcile",
      status: audit.status,
      summary: audit.summary,
      details: {
        checkedAt: audit.checkedAt,
        environmentStatus: audit.environment.valid
          ? "healthy"
          : audit.environment.missing.length > 0
            ? "unhealthy"
            : "degraded",
        databaseStatus: audit.database.status,
        twilioStatus: audit.twilioVoiceRouting.status,
        twilioMessagingStatus: audit.twilioMessagingRouting.status,
        voiceWorkerStatus: audit.voiceWorker.status,
        readinessStatus: audit.readiness.overallStatus,
      },
      checkedAt: new Date(audit.checkedAt),
      succeeded: true,
    });

    return NextResponse.json(
      {
        status: audit.status,
        summary: audit.summary,
        checkedAt: audit.checkedAt,
        environment: audit.environment,
        database: audit.database,
        twilio: audit.twilioVoiceRouting,
        twilioMessaging: audit.twilioMessagingRouting,
        voiceWorker: audit.voiceWorker,
        readiness: audit.readiness,
      },
      { status: audit.status === "unhealthy" ? 500 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown customer-agent-reconcile failure";

    await recordMonitorRun({
      monitorKey: "customer-agent-reconcile",
      status: "unhealthy",
      summary: `Customer agent reconcile crashed: ${message}`,
      details: {
        checkedAt: new Date().toISOString(),
        error: message,
      },
      succeeded: false,
    }).catch(() => null);

    return NextResponse.json(
      {
        error: "Customer agent reconcile failed",
        details: message,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
