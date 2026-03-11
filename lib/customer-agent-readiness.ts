import { getExpectedVoiceGatewayUrl, getKnownEarlymarkInboundNumbers, phoneMatches } from "@/lib/earlymark-inbound-config";
import { twilioMasterClient } from "@/lib/twilio";
import { auditTwilioMessagingRouting } from "@/lib/twilio-drift";
import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";
import { getVoiceFleetHealth } from "@/lib/voice-fleet";
import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";

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

function maxStatus(left: ReadinessStatus, right: ReadinessStatus): ReadinessStatus {
  const order: ReadinessStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function mergeCheckWarnings(check: AgentReadinessCheck, warnings: string[], status: ReadinessStatus) {
  if (warnings.length > 0) {
    check.warnings.push(...warnings);
  }
  check.status = maxStatus(check.status, status);
  check.summary = summarize(check.status, check.missing, check.warnings);
}

async function auditInboundVoiceConfig(): Promise<AgentReadinessCheck> {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ];
  const warnings: string[] = [];
  const missing = required.filter((key) => !process.env[key]);
  const knownNumbers = getKnownEarlymarkInboundNumbers();
  if (knownNumbers.length === 0) {
    missing.push("EARLYMARK_INBOUND_PHONE_NUMBERS / EARLYMARK_INBOUND_PHONE_NUMBER / EARLYMARK_PHONE_NUMBER / TWILIO_PHONE_NUMBER");
  }

  const expectedGatewayUrl = getExpectedVoiceGatewayUrl();
  if (!expectedGatewayUrl) {
    warnings.push("Expected voice gateway URL could not be derived from NEXT_PUBLIC_APP_URL");
  }

  if (!twilioMasterClient) {
    warnings.push("Twilio client unavailable, so inbound number routing cannot be audited");
  } else if (knownNumbers.length > 0) {
    try {
      const incomingNumbers = await twilioMasterClient.incomingPhoneNumbers.list({ limit: 200 });
      const matchedNumbers = incomingNumbers.filter((record) =>
        knownNumbers.some((configured) => phoneMatches(configured, record.phoneNumber)),
      );

      if (matchedNumbers.length === 0) {
        warnings.push(`Configured Earlymark inbound number(s) were not found on Twilio: ${knownNumbers.join(", ")}`);
      }

      for (const record of matchedNumbers) {
        if (record.voiceApplicationSid) {
          warnings.push(`Inbound number ${record.phoneNumber} uses Twilio Voice Application ${record.voiceApplicationSid} instead of direct voice webhook routing`);
          continue;
        }
        if (expectedGatewayUrl && (record.voiceUrl || "") !== expectedGatewayUrl) {
          warnings.push(`Inbound number ${record.phoneNumber} points to ${record.voiceUrl || "[empty]"} instead of ${expectedGatewayUrl}`);
        }
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Failed to audit Twilio inbound voice routing");
    }
  }

  const status: ReadinessStatus =
    missing.length > 0 ? "unhealthy" : warnings.length > 0 ? "degraded" : "healthy";
  return {
    status,
    missing,
    warnings,
    summary: summarize(status, missing, warnings),
  };
}

export async function getCustomerAgentReadiness(): Promise<CustomerAgentReadiness> {
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
      "LIVEKIT_SIP_TRUNK_ID",
    ]),
    voicePreview: buildCheck(["CARTESIA_API_KEY"]),
    emailLeadCapture: buildCheck(geminiPresent ? [] : ["GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY"], [
      !process.env.INBOUND_LEAD_DOMAIN ? "INBOUND_LEAD_DOMAIN is not set; generated inbound aliases may drift to defaults" : "",
    ]),
  };

  const [inboundVoice, smsRouting, voiceWorker, voiceFleet, voiceLatency] = await Promise.all([
    auditInboundVoiceConfig(),
    auditTwilioMessagingRouting({ apply: false }),
    getVoiceAgentRuntimeDrift(),
    getVoiceFleetHealth(),
    getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
  ]);
  checks.inboundVoice = inboundVoice;
  if (smsRouting.status !== "healthy") {
    mergeCheckWarnings(checks.smsInbound, smsRouting.warnings.length > 0 ? smsRouting.warnings : [smsRouting.summary], smsRouting.status);
  }
  checks.voiceWorker = {
    status: voiceWorker.status,
    missing: [],
    warnings: voiceWorker.warnings,
    summary: voiceWorker.summary,
  };
  checks.voiceFleet = {
    status: voiceFleet.status,
    missing: [],
    warnings: voiceFleet.warnings,
    summary: voiceFleet.summary,
  };
  checks.voiceLatency = {
    status: voiceLatency.status,
    missing: [],
    warnings: voiceLatency.warnings,
    summary: voiceLatency.summary,
  };

  const overallStatus = Object.values(checks).reduce<ReadinessStatus>(
    (current, check) => maxStatus(current, check.status),
    "healthy",
  );

  return { overallStatus, checks };
}
