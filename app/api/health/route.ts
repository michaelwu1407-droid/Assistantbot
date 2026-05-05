import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/health-check";
import { getLaunchReadiness } from "@/lib/launch-readiness";
import { getCurrentAppReleaseInfo } from "@/lib/release-truth";
import type { RuntimeStatus } from "@/lib/voice-fleet";

export const dynamic = "force-dynamic";

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function buildEnvironmentSummary() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ? "SET" : "MISSING",
  };
}

export async function GET() {
  try {
    const [databaseResult, launchReadinessResult] = await Promise.allSettled([
      checkDatabaseHealth(),
      getLaunchReadiness(),
    ]);

    const database =
      databaseResult.status === "fulfilled"
        ? databaseResult.value
        : {
            status: "unhealthy" as const,
            error: databaseResult.reason instanceof Error ? databaseResult.reason.message : "Database health check failed",
            timestamp: new Date(),
          };

    const launchReadiness = launchReadinessResult.status === "fulfilled" ? launchReadinessResult.value : null;
    const launchReadinessError =
      launchReadinessResult.status === "rejected"
        ? launchReadinessResult.reason instanceof Error
          ? launchReadinessResult.reason.message
          : "Launch readiness check failed"
        : null;

    const launchStatus = launchReadiness?.status || "unhealthy";
    const appRelease = getCurrentAppReleaseInfo();
    const voiceLatencyProof = launchReadiness?.latency.proof || null;
    const canaryStatusForCore: RuntimeStatus =
      launchReadiness?.canary.status === "unhealthy" ? "unhealthy" : "healthy";
    const voiceStatus = launchReadiness
      ? [launchReadiness.voiceCritical.status, canaryStatusForCore, launchReadiness.latency.status].reduce<RuntimeStatus>(
          (current, candidate) => maxStatus(current, candidate),
          "healthy",
        )
      : "unhealthy";
    const coreStatus = launchReadiness
      ? [
          voiceStatus,
          launchReadiness.communications.status,
          launchReadiness.provisioning.status,
          launchReadiness.readiness.overallStatus,
        ].reduce<RuntimeStatus>((current, candidate) => maxStatus(current, candidate), "healthy")
      : "unhealthy";
    const overallStatus = launchReadiness ? launchStatus : "unhealthy";
    const status = database.status === "healthy" && coreStatus === "healthy" ? "ok" : "degraded";
    const httpStatus = database.status === "unhealthy" || coreStatus === "unhealthy" ? 503 : 200;
    const summary =
      database.status === "unhealthy"
        ? database.error || "Database health check failed"
        : launchReadinessError
          ? `Launch readiness check failed: ${launchReadinessError}`
          : !launchReadiness
            ? "Launch readiness data is unavailable."
            : overallStatus === "healthy"
              ? launchReadiness.summary
              : coreStatus === "healthy"
                ? `Core voice and launch-critical services are healthy. ${launchReadiness.summary}`
                : launchReadiness.summary;

    const payload = {
      status,
      coreStatus,
      voiceStatus,
      overallStatus,
      summary,
      timestamp: new Date().toISOString(),
      environment: buildEnvironmentSummary(),
      services: {
        database: database.status,
        launchReadiness: launchStatus,
        launchCore: coreStatus,
        voiceCritical: launchReadiness?.voiceCritical.status || "unhealthy",
        passiveProduction: launchReadiness?.passiveProduction.status || "unhealthy",
        voiceLatency: launchReadiness?.latency.status || "unhealthy",
        communications: launchReadiness?.communications.status || "unhealthy",
        provisioning: launchReadiness?.provisioning.status || "unhealthy",
        monitoring: launchReadiness?.monitoring.status || "unhealthy",
        sentry: "configured",
        posthog: process.env.NEXT_PUBLIC_POSTHOG_KEY ? "configured" : "disabled",
      },
      database,
      launchReadiness,
      launchReadinessError,
      customerFacingAgents: launchReadiness?.readiness || null,
      release: launchReadiness?.release || {
        app: appRelease,
        worker: null,
      },
      voiceWorker: launchReadiness?.voiceCritical.voiceWorker || null,
      voiceFleet: launchReadiness?.voiceCritical.voiceFleet || null,
      voiceLatency: launchReadiness?.latency || null,
      voiceLatencyProof,
      twilioVoiceRouting: launchReadiness?.voiceCritical.twilioVoiceRouting || null,
      twilioMessagingRouting: launchReadiness
        ? {
            status: launchReadiness.communications.sms.status,
            summary: launchReadiness.communications.sms.summary,
            warnings: launchReadiness.communications.sms.warnings,
            managedNumberCount: launchReadiness.communications.sms.managedNumberCount,
            expectedSmsWebhookUrl: launchReadiness.communications.sms.expectedSmsWebhookUrl,
          }
        : null,
      passiveProduction: launchReadiness?.passiveProduction || null,
      communications: launchReadiness?.communications || null,
      provisioning: launchReadiness?.provisioning || null,
      monitoring: launchReadiness?.monitoring || null,
      canary: launchReadiness?.canary || null,
    };

    return NextResponse.json(payload, { status: httpStatus });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
