import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/health-check";
import { getLaunchReadiness } from "@/lib/launch-readiness";
import { getCurrentAppReleaseInfo } from "@/lib/release-truth";

export const dynamic = "force-dynamic";

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
    const isUnhealthy = database.status === "unhealthy" || launchStatus === "unhealthy";
    const appRelease = getCurrentAppReleaseInfo();
    const voiceLatencyProof = launchReadiness?.latency.proof || null;
    const summary =
      database.status === "unhealthy"
        ? database.error || "Database health check failed"
        : launchReadinessError
          ? `Launch readiness check failed: ${launchReadinessError}`
          : launchReadiness?.summary || "Launch readiness data is unavailable.";

    const payload = {
      status: database.status === "healthy" && launchStatus === "healthy" ? "ok" : "degraded",
      summary,
      timestamp: new Date().toISOString(),
      environment: buildEnvironmentSummary(),
      services: {
        database: database.status,
        launchReadiness: launchStatus,
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

    return NextResponse.json(payload, { status: isUnhealthy ? 503 : 200 });
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
