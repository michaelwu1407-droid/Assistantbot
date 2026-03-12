import {
  getCustomerAgentReadiness,
  type CustomerAgentReadiness,
} from "@/lib/customer-agent-readiness";
import { db } from "@/lib/db";
import {
  getExpectedSmsWebhookUrl,
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
} from "@/lib/earlymark-inbound-config";
import { maxRuntimeStatus, runOpsAuditWithTimeout } from "@/lib/ops-audit";
import {
  auditTwilioMessagingRouting,
  auditTwilioVoiceRouting,
  type TwilioMessagingRoutingDrift,
  type TwilioVoiceRoutingDrift,
} from "@/lib/twilio-drift";
import {
  getExpectedVoiceAgentRuntimeFingerprint,
  getVoiceAgentRuntimeDrift,
  type VoiceAgentRuntimeDrift,
} from "@/lib/voice-agent-runtime";
import type { RuntimeStatus } from "@/lib/voice-fleet";

export type DatabaseHealthCheck = {
  status: "healthy" | "degraded" | "unhealthy";
  latency?: number;
  error?: string;
  timestamp: Date;
};

export type EnvironmentValidation = {
  valid: boolean;
  missing: string[];
  warnings: string[];
};

export type OpsHealthAudit = {
  status: RuntimeStatus;
  summary: string;
  checkedAt: string;
  environment: EnvironmentValidation;
  database: DatabaseHealthCheck;
  twilioVoiceRouting: TwilioVoiceRoutingDrift;
  twilioMessagingRouting: TwilioMessagingRoutingDrift;
  voiceWorker: VoiceAgentRuntimeDrift;
  readiness: CustomerAgentReadiness;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  const startTime = Date.now();

  try {
    await db.workspace.findFirst({
      select: { id: true },
    });
    const latency = Date.now() - startTime;

    return {
      status: "healthy",
      latency,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Database health check exception:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

export function validateEnvironment(): EnvironmentValidation {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  const warnings: string[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder")) {
    warnings.push("NEXT_PUBLIC_SUPABASE_URL contains placeholder value");
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder")) {
    warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY contains placeholder value");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push("NEXT_PUBLIC_APP_URL is missing; Twilio voice/SMS callbacks and diagnostics may drift");
  }

  if (getKnownEarlymarkInboundNumbers().length === 0) {
    warnings.push(
      "No Earlymark inbound phone number is configured (EARLYMARK_INBOUND_PHONE_NUMBERS / EARLYMARK_INBOUND_PHONE_NUMBER / EARLYMARK_PHONE_NUMBER / TWILIO_PHONE_NUMBER)",
    );
  }

  return {
    valid: missing.length === 0 && warnings.length === 0,
    missing,
    warnings,
  };
}

function getEnvironmentStatus(environment: EnvironmentValidation): RuntimeStatus {
  if (environment.missing.length > 0) return "unhealthy";
  if (environment.warnings.length > 0) return "degraded";
  return "healthy";
}

function getEnvironmentSummary(environment: EnvironmentValidation) {
  if (environment.missing.length > 0) {
    return `Missing environment variables: ${environment.missing.join(", ")}`;
  }

  if (environment.warnings.length > 0) {
    return environment.warnings[0];
  }

  return "Startup environment validation passed";
}

function buildDatabaseHealthFailure(message: string): DatabaseHealthCheck {
  return {
    status: "unhealthy",
    error: message,
    timestamp: new Date(),
  };
}

function buildTwilioVoiceRoutingFailure(message: string): TwilioVoiceRoutingDrift {
  return {
    status: "unhealthy",
    summary: message,
    expectedVoiceGatewayUrl: getExpectedVoiceGatewayUrl(),
    numbers: [],
    warnings: [message],
    managedNumberCount: 0,
    orphanedNumbers: [],
  };
}

function buildTwilioMessagingRoutingFailure(message: string): TwilioMessagingRoutingDrift {
  return {
    status: "unhealthy",
    summary: message,
    expectedSmsWebhookUrl: getExpectedSmsWebhookUrl(),
    numbers: [],
    warnings: [message],
    managedNumberCount: 0,
    orphanedNumbers: [],
  };
}

function buildVoiceWorkerFailure(message: string): VoiceAgentRuntimeDrift {
  return {
    status: "unhealthy",
    summary: message,
    warnings: [message],
    expectedFingerprint: getExpectedVoiceAgentRuntimeFingerprint(),
    latestHeartbeat: null,
  };
}

function pickOverallSummary(parts: Array<{ status: RuntimeStatus; summary: string }>) {
  return parts.find((part) => part.status !== "healthy")?.summary || "Comprehensive ops audit completed successfully";
}

export function runStartupEnvironmentValidation() {
  console.log("[startup] Performing startup environment validation...");

  const environment = validateEnvironment();
  if (!environment.valid) {
    console.warn("[startup] Environment validation issues:", environment);
  } else {
    console.log("[startup] Startup environment validation passed");
  }

  return environment;
}

export async function performStartupHealthCheck(): Promise<EnvironmentValidation> {
  return runStartupEnvironmentValidation();
}

export async function performOpsHealthAudit(options?: {
  applyTwilioReconciliation?: boolean;
}): Promise<OpsHealthAudit> {
  const checkedAt = new Date();
  const environment = validateEnvironment();
  const applyTwilioReconciliation = Boolean(options?.applyTwilioReconciliation);

  const [database, twilioVoiceRouting, twilioMessagingRouting, voiceWorker] = await Promise.all([
    runOpsAuditWithTimeout("Database health check", () => checkDatabaseHealth(), buildDatabaseHealthFailure),
    runOpsAuditWithTimeout(
      "Twilio voice routing audit",
      () => auditTwilioVoiceRouting({ apply: applyTwilioReconciliation }),
      buildTwilioVoiceRoutingFailure,
    ),
    runOpsAuditWithTimeout(
      "Twilio messaging routing audit",
      () => auditTwilioMessagingRouting({ apply: applyTwilioReconciliation }),
      buildTwilioMessagingRoutingFailure,
    ),
    runOpsAuditWithTimeout("Voice worker runtime audit", () => getVoiceAgentRuntimeDrift(), buildVoiceWorkerFailure),
  ]);

  const readiness = await getCustomerAgentReadiness({
    twilioVoiceRouting,
    twilioMessagingRouting,
    voiceWorker,
  });

  const environmentStatus = getEnvironmentStatus(environment);
  const status = [
    environmentStatus,
    database.status,
    twilioVoiceRouting.status,
    twilioMessagingRouting.status,
    voiceWorker.status,
    readiness.overallStatus,
  ].reduce<RuntimeStatus>((current, candidate) => maxRuntimeStatus(current, candidate), "healthy");

  const summary = pickOverallSummary([
    { status: environmentStatus, summary: getEnvironmentSummary(environment) },
    { status: database.status, summary: database.error || "Database health check passed" },
    { status: twilioVoiceRouting.status, summary: twilioVoiceRouting.summary },
    { status: twilioMessagingRouting.status, summary: twilioMessagingRouting.summary },
    { status: voiceWorker.status, summary: voiceWorker.summary },
    { status: readiness.overallStatus, summary: readiness.checks.inboundVoice?.summary || "Customer readiness passed" },
  ]);

  return {
    status,
    summary,
    checkedAt: checkedAt.toISOString(),
    environment,
    database,
    twilioVoiceRouting,
    twilioMessagingRouting,
    voiceWorker,
    readiness,
  };
}
