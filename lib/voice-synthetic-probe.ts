import { getExpectedVoiceGatewayUrl, getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import { getEarlymarkInboundSipUri } from "@/lib/livekit-sip-config";
import { normalizePhone } from "@/lib/phone-utils";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import { runVoiceSpokenPstnCanary } from "@/lib/voice-spoken-canary";
import type { RuntimeStatus } from "@/lib/voice-fleet";

type ProbeTargetSource = "ops_header_target" | "VOICE_MONITOR_PROBE_TARGET_NUMBER" | "known_inbound_env" | null;
type ProbeCallerSource =
  | "ops_header_caller"
  | "VOICE_MONITOR_PROBE_CALLER_NUMBER"
  | "VOICE_ALERT_SMS_TO"
  | "default_probe_caller";
type ProbeResult = "pass" | "fallback" | "orphaned" | "disabled" | "mismatch" | "unknown";

export type VoiceSyntheticProbeExecution = {
  status: RuntimeStatus;
  checkedAt: string;
  summary: string;
  skipped: boolean;
  probeResult: ProbeResult | null;
  probeCaller: string;
  probeCallerSource: ProbeCallerSource;
  targetNumber: string;
  targetNumberSource: ProbeTargetSource;
  gatewayUrl: string;
  expectedSipTarget: string;
  responseStatus: number | null;
  gatewayProbe: {
    result: ProbeResult | null;
    responseStatus: number | null;
    twiml: string | null;
  } | null;
  spokenCanary: Awaited<ReturnType<typeof runVoiceSpokenPstnCanary>> | null;
  incidents: Awaited<ReturnType<typeof reconcileVoiceIncidents>>;
  details: Record<string, unknown>;
};

function getGatewayProbeAuthKey() {
  return (
    process.env.VOICE_MONITOR_PROBE_GATEWAY_KEY ||
    process.env.CRON_SECRET ||
    process.env.TELEMETRY_ADMIN_KEY ||
    ""
  ).trim();
}

function extractProbeResult(twiml: string, expectedSipTarget: string): ProbeResult {
  if (twiml.includes("VOICE MONITOR PROBE PASS")) return "pass";
  if (twiml.includes("VOICE MONITOR PROBE ORPHANED")) return "orphaned";
  if (twiml.includes("VOICE MONITOR PROBE DISABLED")) return "disabled";
  if (twiml.includes("VOICE MONITOR PROBE FALLBACK")) return "fallback";
  if (expectedSipTarget && twiml.includes(`<Sip>${expectedSipTarget}</Sip>`)) return "pass";
  if (twiml.includes("<Dial>") && twiml.includes("<Sip>")) return "mismatch";
  return "unknown";
}

function resolveProbeTargetNumber(explicitTarget?: string | null): { targetNumber: string; source: ProbeTargetSource } {
  const overrideTarget = normalizePhone(explicitTarget || "");
  if (overrideTarget) {
    return { targetNumber: overrideTarget, source: "ops_header_target" };
  }

  const configuredTarget = (process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER || "").trim();
  if (configuredTarget) {
    return {
      targetNumber: normalizePhone(configuredTarget),
      source: "VOICE_MONITOR_PROBE_TARGET_NUMBER",
    };
  }

  const configuredInboundNumber = getKnownEarlymarkInboundNumbers()[0] || "";
  if (configuredInboundNumber) {
    return { targetNumber: configuredInboundNumber, source: "known_inbound_env" };
  }

  return { targetNumber: "", source: null };
}

function resolveProbeCaller(explicitCaller?: string | null): { probeCaller: string; source: ProbeCallerSource } {
  const overrideCaller = normalizePhone(explicitCaller || "");
  if (overrideCaller) {
    return { probeCaller: overrideCaller, source: "ops_header_caller" };
  }

  const configuredCaller =
    process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER ||
    process.env.VOICE_ALERT_SMS_TO ||
    "+61434955958";
  const probeCaller = normalizePhone(configuredCaller);

  const source: ProbeCallerSource = process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER
    ? "VOICE_MONITOR_PROBE_CALLER_NUMBER"
    : process.env.VOICE_ALERT_SMS_TO
      ? "VOICE_ALERT_SMS_TO"
      : "default_probe_caller";

  return { probeCaller, source };
}

export async function runVoiceSyntheticProbe(options?: {
  checkedAt?: Date;
  probeCallerOverride?: string | null;
  probeTargetOverride?: string | null;
}): Promise<VoiceSyntheticProbeExecution> {
  const checkedAt = options?.checkedAt || new Date();
  const checkedAtIso = checkedAt.toISOString();
  const { probeCaller, source: probeCallerSource } = resolveProbeCaller(options?.probeCallerOverride);
  const { targetNumber, source: targetNumberSource } = resolveProbeTargetNumber(options?.probeTargetOverride);
  const gatewayUrl = getExpectedVoiceGatewayUrl();
  const gatewayProbeAuthKey = getGatewayProbeAuthKey();
  const expectedSipTarget = getEarlymarkInboundSipUri(targetNumber);

  if (!probeCaller || !targetNumber || !gatewayUrl || !gatewayProbeAuthKey) {
    const summary = "Synthetic voice probe is not fully configured, so the scheduled probe was skipped.";
    const details = {
      checkedAt: checkedAtIso,
      skipped: true,
      probeCallerConfigured: Boolean(probeCaller),
      probeCallerSource,
      targetNumberConfigured: Boolean(targetNumber),
      targetNumberSource,
      gatewayUrlConfigured: Boolean(gatewayUrl),
      gatewayProbeAuthConfigured: Boolean(gatewayProbeAuthKey),
    };

    return {
      status: "degraded",
      checkedAt: checkedAtIso,
      summary,
      skipped: true,
      probeResult: null,
      probeCaller,
      probeCallerSource,
      targetNumber,
      targetNumberSource,
      gatewayUrl,
      expectedSipTarget,
      responseStatus: null,
      gatewayProbe: null,
      spokenCanary: null,
      incidents: {
        opened: [],
        resolved: [],
      },
      details,
    };
  }

  const formBody = new URLSearchParams({
    From: probeCaller,
    To: targetNumber,
  });
  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-voice-probe-key": gatewayProbeAuthKey,
    },
    body: formBody.toString(),
    cache: "no-store",
  });

  const twiml = await response.text();
  const probeResult = extractProbeResult(twiml, expectedSipTarget);
  const spokenCanary = await runVoiceSpokenPstnCanary({
    probeCaller,
    targetNumber,
    checkedAt,
  });
  const status = probeResult !== "pass" ? "unhealthy" : spokenCanary.status;
  const summary =
    probeResult !== "pass"
      ? `Synthetic Earlymark inbound probe returned ${probeResult}`
      : spokenCanary.summary;

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
              expectedSipTarget,
              gatewayProbe: {
                result: probeResult,
                responseStatus: response.status,
                twiml,
              },
              spokenCanary,
            },
          },
        ];
  const incidents = await reconcileVoiceIncidents(observations, {
    resolveKeys: ["voice:probe:earlymark-inbound"],
  });

  const gatewayProbe = {
    result: probeResult,
    responseStatus: response.status,
    twiml,
  };
  const details = {
    checkedAt: checkedAtIso,
    probeResult,
    probeCaller,
    probeCallerSource,
    targetNumber,
    targetNumberSource,
    gatewayUrl,
    expectedSipTarget,
    gatewayProbe,
    spokenCanary,
  };

  return {
    status,
    checkedAt: checkedAtIso,
    summary,
    skipped: false,
    probeResult,
    probeCaller,
    probeCallerSource,
    targetNumber,
    targetNumberSource,
    gatewayUrl,
    expectedSipTarget,
    responseStatus: response.status,
    gatewayProbe,
    spokenCanary,
    incidents,
    details,
  };
}
