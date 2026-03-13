import {
  getExpectedSmsWebhookUrl,
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
} from "@/lib/earlymark-inbound-config";
import { runOpsAuditWithTimeout } from "@/lib/ops-audit";
import { getVoiceLatencyHealth, type VoiceLatencyHealth } from "@/lib/voice-call-latency-health";
import {
  getVoiceFleetHealth,
  type RuntimeStatus,
  type VoiceFleetHealth,
  type VoiceSurface,
  type VoiceSurfaceHealth,
} from "@/lib/voice-fleet";
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
import { getInboundLeadEmailReadiness } from "@/lib/inbound-lead-email-readiness";
import { getLivekitSipHealth, type LivekitSipHealth } from "@/lib/livekit-sip-health";

export type ReadinessStatus = "healthy" | "degraded" | "unhealthy";

export type AgentReadinessCheck = {
  status: ReadinessStatus;
  missing: string[];
  warnings: string[];
  summary: string;
};

export type CustomerAgentReadiness = {
  overallStatus: ReadinessStatus;
  checks: Record<string, AgentReadinessCheck>;
};

type ReadinessDependencies = {
  twilioVoiceRouting?: TwilioVoiceRoutingDrift;
  twilioMessagingRouting?: TwilioMessagingRoutingDrift;
  voiceWorker?: VoiceAgentRuntimeDrift;
  voiceFleet?: VoiceFleetHealth;
  voiceLatency?: VoiceLatencyHealth;
  livekitSip?: LivekitSipHealth;
};

function summarize(status: ReadinessStatus, missing: string[], warnings: string[]) {
  if (status === "healthy") return "ready";
  if (missing.length > 0) return `missing ${missing.join(", ")}`;
  if (warnings.length > 0) return warnings[0];
  return status;
}

function buildCheck(required: string[], warningChecks: string[] = []): AgentReadinessCheck {
  const missing = required.filter((key) => !process.env[key]);
  const warnings = warningChecks.filter(Boolean);
  const status: ReadinessStatus =
    missing.length > 0 ? "unhealthy" : warnings.length > 0 ? "degraded" : "healthy";
  return {
    status,
    missing,
    warnings,
    summary: summarize(status, missing, warnings),
  };
}

function mergeCheckWarnings(check: AgentReadinessCheck, warnings: string[], status: ReadinessStatus) {
  if (warnings.length > 0) {
    check.warnings.push(...warnings);
  }
  check.status = maxStatus(check.status, status);
  check.summary = summarize(check.status, check.missing, check.warnings);
}

function maxStatus(left: ReadinessStatus, right: ReadinessStatus): ReadinessStatus {
  const order: ReadinessStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function normalizeWarnings(status: ReadinessStatus, summary: string, warnings: string[]) {
  if (warnings.length > 0) return warnings;
  if (status === "healthy" || !summary) return [];
  return [summary];
}

function toReadinessStatus(status: RuntimeStatus): ReadinessStatus {
  return status;
}

function createEmptySurfaceHealth(surface: VoiceSurface): VoiceSurfaceHealth {
  return {
    surface,
    status: "unhealthy",
    summary: `${surface} voice surface audit failed`,
    warnings: [],
    supportingHosts: [],
    atCapacityHosts: [],
    expectedHostCount: 0,
    capacityExhausted: false,
    workers: [],
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

function buildVoiceFleetFailure(message: string): VoiceFleetHealth {
  return {
    status: "unhealthy",
    summary: message,
    warnings: [message],
    checkedAt: new Date().toISOString(),
    latestHeartbeatAt: null,
    hosts: [],
    surfaces: {
      demo: createEmptySurfaceHealth("demo"),
      inbound_demo: createEmptySurfaceHealth("inbound_demo"),
      normal: createEmptySurfaceHealth("normal"),
    },
  };
}

function buildVoiceLatencyFailure(message: string): VoiceLatencyHealth {
  return {
    status: "unhealthy",
    summary: message,
    warnings: [message],
    lookbackMinutes: 60,
    scopes: [],
  };
}

function buildLivekitSipFailure(message: string): LivekitSipHealth {
  return {
    status: "unhealthy",
    summary: message,
    warnings: [message],
    checkedAt: new Date().toISOString(),
    livekitUrl: (process.env.LIVEKIT_URL || "").trim() || null,
    inboundTrunkCount: 0,
    outboundTrunkCount: 0,
    dispatchRuleCount: 0,
    expectedInboundNumbers: getKnownEarlymarkInboundNumbers(),
    missingInboundNumbers: getKnownEarlymarkInboundNumbers(),
    inboundTrunks: [],
    outboundTrunks: [],
    demoOutbound: {
      status: "unhealthy",
      summary: message,
      warnings: [message],
      configuredTrunkId: (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null,
      resolvedTrunkId: null,
      configuredTrunkMatched: false,
      callerNumber: null,
    },
    dispatchRules: [],
  };
}

function buildResultCheck(result: {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
}): AgentReadinessCheck {
  const status = toReadinessStatus(result.status);
  const warnings = normalizeWarnings(status, result.summary, result.warnings);
  return {
    status,
    missing: [],
    warnings,
    summary: status === "healthy" ? result.summary : summarize(status, [], warnings),
  };
}

function buildInboundVoiceCheck(twilioVoiceRouting: TwilioVoiceRoutingDrift): AgentReadinessCheck {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (getKnownEarlymarkInboundNumbers().length === 0) {
    missing.push(
      "EARLYMARK_INBOUND_PHONE_NUMBERS / EARLYMARK_INBOUND_PHONE_NUMBER / EARLYMARK_PHONE_NUMBER / TWILIO_PHONE_NUMBER",
    );
  }

  const warnings: string[] = [];
  if (!getExpectedVoiceGatewayUrl()) {
    warnings.push("Expected voice gateway URL could not be derived from NEXT_PUBLIC_APP_URL");
  }

  if (twilioVoiceRouting.status !== "healthy") {
    warnings.push(...normalizeWarnings(twilioVoiceRouting.status, twilioVoiceRouting.summary, twilioVoiceRouting.warnings));
  }

  const status: ReadinessStatus =
    missing.length > 0 ? "unhealthy" : twilioVoiceRouting.status === "unhealthy" ? "unhealthy" : warnings.length > 0 ? "degraded" : "healthy";

  return {
    status,
    missing,
    warnings,
    summary: summarize(status, missing, warnings),
  };
}

export async function getCustomerAgentReadiness(
  dependencies: ReadinessDependencies = {},
): Promise<CustomerAgentReadiness> {
  const geminiPresent = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  const checks: CustomerAgentReadiness["checks"] = {
    webChat: buildCheck(geminiPresent ? [] : ["GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY"]),
    headlessChat: buildCheck(geminiPresent ? [] : ["GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY"]),
    smsInbound: buildCheck(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"], [
      !geminiPresent ? "AI key missing, SMS replies will fall back to a generic manual-response message" : "",
    ]),
    whatsappAssistant: buildCheck(
      [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
      [
        !(process.env.TWILIO_WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER)
          ? "TWILIO_WHATSAPP_NUMBER / NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER is missing"
          : "",
        !geminiPresent ? "AI key missing, WhatsApp assistant cannot generate replies" : "",
      ],
    ),
    outboundDemoVoice: buildCheck([
      "LIVEKIT_URL",
      "LIVEKIT_API_KEY",
      "LIVEKIT_API_SECRET",
    ]),
    livekitSip: buildCheck([]),
    voicePreview: buildCheck(["CARTESIA_API_KEY"]),
    emailLeadCapture: buildCheck(geminiPresent ? [] : ["GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY"], [
      !process.env.INBOUND_LEAD_DOMAIN
        ? "INBOUND_LEAD_DOMAIN is not set; generated inbound aliases may drift to defaults"
        : "",
    ]),
  };

  const [twilioVoiceRouting, twilioMessagingRouting, voiceWorker, voiceFleet, voiceLatency, livekitSip, emailLeadCaptureReadiness] = await Promise.all([
    dependencies.twilioVoiceRouting
      ? Promise.resolve(dependencies.twilioVoiceRouting)
      : runOpsAuditWithTimeout(
          "Twilio voice routing audit",
          () => auditTwilioVoiceRouting({ apply: false }),
          buildTwilioVoiceRoutingFailure,
        ),
    dependencies.twilioMessagingRouting
      ? Promise.resolve(dependencies.twilioMessagingRouting)
      : runOpsAuditWithTimeout(
          "Twilio messaging routing audit",
          () => auditTwilioMessagingRouting({ apply: false }),
          buildTwilioMessagingRoutingFailure,
        ),
    dependencies.voiceWorker
      ? Promise.resolve(dependencies.voiceWorker)
      : runOpsAuditWithTimeout(
          "Voice worker runtime audit",
          () => getVoiceAgentRuntimeDrift(),
          buildVoiceWorkerFailure,
        ),
    dependencies.voiceFleet
      ? Promise.resolve(dependencies.voiceFleet)
      : runOpsAuditWithTimeout(
          "Voice fleet health audit",
          () => getVoiceFleetHealth(),
          buildVoiceFleetFailure,
        ),
    dependencies.voiceLatency
      ? Promise.resolve(dependencies.voiceLatency)
      : runOpsAuditWithTimeout(
          "Voice latency audit",
          () => getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
          buildVoiceLatencyFailure,
        ),
    dependencies.livekitSip
      ? Promise.resolve(dependencies.livekitSip)
      : runOpsAuditWithTimeout(
          "LiveKit SIP audit",
          () => getLivekitSipHealth(),
          buildLivekitSipFailure,
        ),
    getInboundLeadEmailReadiness(),
  ]);

  checks.inboundVoice = buildInboundVoiceCheck(twilioVoiceRouting);

  if (twilioMessagingRouting.status !== "healthy") {
    mergeCheckWarnings(
      checks.smsInbound,
      normalizeWarnings(twilioMessagingRouting.status, twilioMessagingRouting.summary, twilioMessagingRouting.warnings),
      twilioMessagingRouting.status,
    );
  }

  checks.voiceWorker = buildResultCheck(voiceWorker);
  checks.voiceFleet = buildResultCheck(voiceFleet);
  checks.voiceLatency = buildResultCheck(voiceLatency);
  checks.livekitSip = buildResultCheck(livekitSip);
  mergeCheckWarnings(
    checks.outboundDemoVoice,
    normalizeWarnings(livekitSip.demoOutbound.status, livekitSip.demoOutbound.summary, livekitSip.demoOutbound.warnings),
    livekitSip.demoOutbound.status,
  );

  if (!emailLeadCaptureReadiness.ready) {
    mergeCheckWarnings(checks.emailLeadCapture, emailLeadCaptureReadiness.issues, "unhealthy");
  }

  const overallStatus = Object.values(checks).reduce<ReadinessStatus>(
    (current, check) => maxStatus(current, check.status),
    "healthy",
  );

  return { overallStatus, checks };
}
