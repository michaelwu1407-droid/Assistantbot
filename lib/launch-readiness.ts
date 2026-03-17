import { getCustomerAgentReadiness } from "@/lib/customer-agent-readiness";
import { getInboundLeadEmailReadiness } from "@/lib/inbound-lead-email-readiness";
import { getLivekitSipHealth } from "@/lib/livekit-sip-health";
import { getMonitorRunHealth } from "@/lib/ops-monitor-runs";
import { getPassiveProductionHealth } from "@/lib/passive-production-health";
import { getProvisioningReadinessSummary } from "@/lib/provisioning-readiness";
import { getCurrentAppReleaseInfo, buildWorkerReleaseTruth } from "@/lib/release-truth";
import { auditTwilioMessagingRouting, auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";
import { getVoiceMonitorStaleAfterMs } from "@/lib/voice-monitor-config";
import { getVoiceFleetHealth, type RuntimeStatus } from "@/lib/voice-fleet";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";

type StatusSummary = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
};

export type LaunchReadiness = {
  status: RuntimeStatus;
  summary: string;
  checkedAt: string;
  release: {
    app: ReturnType<typeof getCurrentAppReleaseInfo>;
    worker: ReturnType<typeof buildWorkerReleaseTruth>;
  };
  voiceCritical: StatusSummary & {
    twilioVoiceRouting: Awaited<ReturnType<typeof auditTwilioVoiceRouting>>;
    livekitSip: Awaited<ReturnType<typeof getLivekitSipHealth>>;
    voiceWorker: Awaited<ReturnType<typeof getVoiceAgentRuntimeDrift>>;
    voiceFleet: Awaited<ReturnType<typeof getVoiceFleetHealth>>;
  };
  passiveProduction: Awaited<ReturnType<typeof getPassiveProductionHealth>>;
  canary: StatusSummary & {
    monitor: Awaited<ReturnType<typeof getMonitorRunHealth>>;
    probeResult: string | null;
    probeMode: string | null;
    targetNumber: string | null;
    callSid: string | null;
    callStatus: string | null;
    spokenCanary: Record<string, unknown> | null;
  };
  monitoring: StatusSummary & {
    healthAudit: Awaited<ReturnType<typeof getMonitorRunHealth>>;
    watchdog: Awaited<ReturnType<typeof getMonitorRunHealth>>;
    passiveTraffic: Awaited<ReturnType<typeof getMonitorRunHealth>>;
  };
  communications: StatusSummary & {
    sms: StatusSummary & {
      managedNumberCount: number;
      expectedSmsWebhookUrl: string | null;
    };
    email: StatusSummary & Awaited<ReturnType<typeof getInboundLeadEmailReadiness>>;
  };
  provisioning: Awaited<ReturnType<typeof getProvisioningReadinessSummary>>;
  readiness: Awaited<ReturnType<typeof getCustomerAgentReadiness>>;
  latency: Awaited<ReturnType<typeof getVoiceLatencyHealth>>;
};

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function summarizeStatus(status: RuntimeStatus, warnings: string[], healthySummary: string) {
  return status === "healthy" ? healthySummary : warnings[0] || healthySummary;
}

export async function getLaunchReadiness(options?: {
  expectedWorkerSha?: string | null;
  hostId?: string | null;
}): Promise<LaunchReadiness> {
  const checkedAt = new Date().toISOString();
  const staleAfterMs = getVoiceMonitorStaleAfterMs();
  const appRelease = getCurrentAppReleaseInfo();

  const [
    twilioVoiceRouting,
    twilioMessagingRouting,
    voiceWorker,
    voiceFleet,
    livekitSip,
    latency,
    monitorHealth,
    watchdogHealth,
    passiveTrafficHealth,
    probeHealth,
    emailReadiness,
    provisioning,
    passiveProduction,
  ] = await Promise.all([
    auditTwilioVoiceRouting({ apply: false }),
    auditTwilioMessagingRouting({ apply: false }),
    getVoiceAgentRuntimeDrift(),
    getVoiceFleetHealth(),
    getLivekitSipHealth(),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
    getMonitorRunHealth("voice-agent-health", staleAfterMs),
    getMonitorRunHealth("voice-monitor-watchdog", staleAfterMs),
    getMonitorRunHealth("passive-communications-health", staleAfterMs),
    getMonitorRunHealth("voice-synthetic-probe", staleAfterMs),
    getInboundLeadEmailReadiness(),
    getProvisioningReadinessSummary(),
    getPassiveProductionHealth(),
  ]);

  const readiness = await getCustomerAgentReadiness({
    twilioVoiceRouting,
    twilioMessagingRouting,
    voiceWorker,
    voiceFleet,
    voiceLatency: latency,
    livekitSip,
  });

  const workerRelease = buildWorkerReleaseTruth(voiceFleet, {
    expectedWorkerSha: options?.expectedWorkerSha,
    hostId: options?.hostId,
  });

  const voiceCriticalWarnings = Array.from(
    new Set([
      ...twilioVoiceRouting.warnings,
      ...livekitSip.warnings,
      ...voiceWorker.warnings,
      ...voiceFleet.warnings,
      ...workerRelease.warnings,
    ].filter(Boolean)),
  );
  const voiceCriticalStatus = [
    twilioVoiceRouting.status,
    livekitSip.status,
    voiceWorker.status,
    voiceFleet.status,
    workerRelease.status,
  ].reduce<RuntimeStatus>((current, candidate) => maxStatus(current, candidate), "healthy");

  const canaryWarnings = Array.from(new Set(probeHealth.warnings.filter(Boolean)));
  const canaryStatus = probeHealth.status;
  const probeDetails = probeHealth.details || null;

  const monitoringWarnings = Array.from(
    new Set([
      ...monitorHealth.warnings,
      ...watchdogHealth.warnings,
      ...passiveTrafficHealth.warnings,
    ].filter(Boolean)),
  );
  const monitoringStatus = [monitorHealth.status, watchdogHealth.status, passiveTrafficHealth.status].reduce<RuntimeStatus>(
    (current, candidate) => maxStatus(current, candidate),
    "healthy",
  );

  const smsWarnings = Array.from(new Set(twilioMessagingRouting.warnings.filter(Boolean)));
  const smsStatus: RuntimeStatus =
    twilioMessagingRouting.status === "unhealthy"
      ? "unhealthy"
      : smsWarnings.length > 0
        ? "degraded"
        : "healthy";

  const emailWarnings = Array.from(new Set(emailReadiness.issues.filter(Boolean)));
  const emailStatus: RuntimeStatus = emailReadiness.ready ? "healthy" : "degraded";
  const communicationsStatus = [smsStatus, emailStatus].reduce<RuntimeStatus>(
    (current, candidate) => maxStatus(current, candidate),
    "healthy",
  );

  const voiceCritical: LaunchReadiness["voiceCritical"] = {
    status: voiceCriticalStatus,
    summary: summarizeStatus(
      voiceCriticalStatus,
      voiceCriticalWarnings,
      "Voice routing, SIP, and worker release state are healthy.",
    ),
    warnings: voiceCriticalWarnings,
    twilioVoiceRouting,
    livekitSip,
    voiceWorker,
    voiceFleet,
  };

  const canary: LaunchReadiness["canary"] = {
    status: canaryStatus,
    summary: summarizeStatus(canaryStatus, canaryWarnings, "Spoken canary is reporting healthy."),
    warnings: canaryWarnings,
    monitor: probeHealth,
    probeResult:
      typeof probeDetails?.probeResult === "string"
        ? probeDetails.probeResult
        : typeof probeDetails?.gatewayProbe === "object" && typeof (probeDetails.gatewayProbe as Record<string, unknown>)?.result === "string"
          ? ((probeDetails.gatewayProbe as Record<string, unknown>).result as string)
          : null,
    probeMode:
      typeof probeDetails?.spokenCanary === "object" &&
      probeDetails.spokenCanary &&
      typeof (probeDetails.spokenCanary as Record<string, unknown>).mode === "string"
        ? ((probeDetails.spokenCanary as Record<string, unknown>).mode as string)
        : null,
    targetNumber: typeof probeDetails?.targetNumber === "string" ? probeDetails.targetNumber : null,
    callSid:
      typeof probeDetails?.spokenCanary === "object" &&
      probeDetails.spokenCanary &&
      typeof (probeDetails.spokenCanary as Record<string, unknown>).callSid === "string"
        ? ((probeDetails.spokenCanary as Record<string, unknown>).callSid as string)
        : null,
    callStatus:
      typeof probeDetails?.spokenCanary === "object" &&
      probeDetails.spokenCanary &&
      typeof (probeDetails.spokenCanary as Record<string, unknown>).callStatus === "string"
        ? ((probeDetails.spokenCanary as Record<string, unknown>).callStatus as string)
        : null,
    spokenCanary:
      probeDetails && typeof probeDetails.spokenCanary === "object" && probeDetails.spokenCanary
        ? (probeDetails.spokenCanary as Record<string, unknown>)
        : null,
  };

  const monitoring: LaunchReadiness["monitoring"] = {
    status: monitoringStatus,
    summary: summarizeStatus(
      monitoringStatus,
      monitoringWarnings,
      "Control-plane and passive traffic monitors are reporting on schedule.",
    ),
    warnings: monitoringWarnings,
    healthAudit: monitorHealth,
    watchdog: watchdogHealth,
    passiveTraffic: passiveTrafficHealth,
  };

  const communications: LaunchReadiness["communications"] = {
    status: communicationsStatus,
    summary: summarizeStatus(communicationsStatus, [...smsWarnings, ...emailWarnings], "SMS and inbound email are ready."),
    warnings: Array.from(new Set([...smsWarnings, ...emailWarnings])),
    sms: {
      status: smsStatus,
      summary:
        twilioMessagingRouting.managedNumberCount === 0
          ? summarizeStatus(
              smsStatus,
              smsWarnings,
              "No managed production SMS numbers are configured for Earlymark, which is allowed.",
            )
          : summarizeStatus(smsStatus, smsWarnings, "Twilio SMS routing is healthy."),
      warnings: smsWarnings,
      managedNumberCount: twilioMessagingRouting.managedNumberCount,
      expectedSmsWebhookUrl: twilioMessagingRouting.expectedSmsWebhookUrl,
    },
    email: {
      status: emailStatus,
      summary: summarizeStatus(emailStatus, emailWarnings, "Inbound lead email is ready."),
      warnings: emailWarnings,
      ...emailReadiness,
    },
  };

  const overallStatus = [
    voiceCritical.status,
    passiveProduction.status,
    monitoring.status,
    communications.status,
    provisioning.status,
    readiness.overallStatus,
  ].reduce<RuntimeStatus>((current, candidate) => maxStatus(current, candidate), "healthy");

  const firstFailingReadinessKey = Object.keys(readiness.checks).find((key) => readiness.checks[key]?.status !== "healthy");
  const summary =
    voiceCritical.status !== "healthy"
      ? voiceCritical.summary
      : passiveProduction.status !== "healthy"
        ? passiveProduction.summary
        : monitoring.status !== "healthy"
          ? monitoring.summary
          : communications.status !== "healthy"
            ? communications.summary
            : provisioning.status !== "healthy"
              ? provisioning.summary
              : readiness.overallStatus !== "healthy"
                ? readiness.checks[firstFailingReadinessKey || "inboundVoice"]?.summary || "Customer-facing readiness is degraded."
                : "Launch-critical web, voice, communications, and provisioning signals are healthy.";

  return {
    status: overallStatus,
    summary,
    checkedAt,
    release: {
      app: appRelease,
      worker: workerRelease,
    },
    voiceCritical,
    passiveProduction,
    canary,
    monitoring,
    communications,
    provisioning,
    readiness,
    latency,
  };
}
