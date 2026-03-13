import { SipClient } from "livekit-server-sdk";
import { getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import { resolveLivekitDemoOutboundTrunk } from "@/lib/demo-call";
import type { RuntimeStatus } from "@/lib/voice-fleet";

export type LivekitSipHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  checkedAt: string;
  livekitUrl: string | null;
  inboundTrunkCount: number;
  dispatchRuleCount: number;
  expectedInboundNumbers: string[];
  missingInboundNumbers: string[];
  inboundTrunks: Array<{
    sipTrunkId: string;
    name: string;
    numbers: string[];
  }>;
  outboundTrunkCount: number;
  outboundTrunks: Array<{
    sipTrunkId: string;
    name: string;
    numbers: string[];
    address: string;
  }>;
  demoOutbound: {
    status: RuntimeStatus;
    summary: string;
    warnings: string[];
    configuredTrunkId: string | null;
    resolvedTrunkId: string | null;
    configuredTrunkMatched: boolean;
    callerNumber: string | null;
  };
  dispatchRules: Array<{
    sipDispatchRuleId: string;
    name: string;
    trunkIds: string[];
    roomPrefix: string | null;
    attributes: Record<string, string>;
  }>;
};

function getLivekitApiBaseUrl() {
  const raw = (process.env.LIVEKIT_URL || "").trim();
  if (!raw) return "";

  if (/^wss:/i.test(raw)) return raw.replace(/^wss:/i, "https:");
  if (/^ws:/i.test(raw)) return raw.replace(/^ws:/i, "http:");
  return raw;
}

function summarizeDispatchRule(rule: Record<string, unknown>) {
  const dispatchRule = (rule.rule || {}) as Record<string, unknown>;
  const individual = (dispatchRule.dispatchRuleIndividual || {}) as Record<string, unknown>;

  return {
    sipDispatchRuleId: String(rule.sipDispatchRuleId || ""),
    name: String(rule.name || ""),
    trunkIds: Array.isArray(rule.trunkIds) ? rule.trunkIds.map((value) => String(value)) : [],
    roomPrefix: typeof individual.roomPrefix === "string" ? individual.roomPrefix : null,
    attributes:
      rule.attributes && typeof rule.attributes === "object" && !Array.isArray(rule.attributes)
        ? Object.fromEntries(
            Object.entries(rule.attributes as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
          )
        : {},
  };
}

export async function getLivekitSipHealth(): Promise<LivekitSipHealth> {
  const checkedAt = new Date().toISOString();
  const livekitUrl = getLivekitApiBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
  const expectedInboundNumbers = getKnownEarlymarkInboundNumbers();

  if (!livekitUrl || !apiKey || !apiSecret) {
    return {
      status: "unhealthy",
      summary: "LiveKit SIP health cannot be checked because LiveKit credentials are incomplete.",
      warnings: ["LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET is missing."],
      checkedAt,
      livekitUrl: livekitUrl || null,
      inboundTrunkCount: 0,
      outboundTrunkCount: 0,
      dispatchRuleCount: 0,
      expectedInboundNumbers,
      missingInboundNumbers: expectedInboundNumbers,
      inboundTrunks: [],
      outboundTrunks: [],
      demoOutbound: {
        status: "unhealthy",
        summary: "LiveKit outbound SIP health cannot be checked because LiveKit credentials are incomplete.",
        warnings: ["LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET is missing."],
        configuredTrunkId: (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null,
        resolvedTrunkId: null,
        configuredTrunkMatched: false,
        callerNumber: null,
      },
      dispatchRules: [],
    };
  }

  try {
    const sip = new SipClient(livekitUrl, apiKey, apiSecret);
    const [rawInboundTrunks, rawOutboundTrunks, rawDispatchRules] = await Promise.all([
      sip.listSipInboundTrunk(),
      sip.listSipOutboundTrunk(),
      sip.listSipDispatchRule(),
    ]);
    const outboundDemo = await resolveLivekitDemoOutboundTrunk({
      sipClient: sip,
      preloadedOutboundTrunks: rawOutboundTrunks,
    });

    const inboundTrunks = rawInboundTrunks.map((trunk) => ({
      sipTrunkId: String(trunk.sipTrunkId || ""),
      name: String(trunk.name || ""),
      numbers: Array.isArray(trunk.numbers) ? trunk.numbers.map((value) => String(value)) : [],
    }));
    const outboundTrunks = rawOutboundTrunks.map((trunk) => ({
      sipTrunkId: String(trunk.sipTrunkId || ""),
      name: String(trunk.name || ""),
      numbers: Array.isArray(trunk.numbers) ? trunk.numbers.map((value) => String(value)) : [],
      address: String(trunk.address || ""),
    }));
    const dispatchRules = rawDispatchRules.map((rule) => summarizeDispatchRule(rule as unknown as Record<string, unknown>));

    const inboundTrunkIds = new Set(inboundTrunks.map((trunk) => trunk.sipTrunkId).filter(Boolean));
    const coveredNumbers = new Set(inboundTrunks.flatMap((trunk) => trunk.numbers));
    const missingInboundNumbers = expectedInboundNumbers.filter((number) => !coveredNumbers.has(number));
    const hasInboundDispatchRule = dispatchRules.some((rule) => {
      if (rule.roomPrefix?.startsWith("earlymark-inbound-")) return true;
      return rule.trunkIds.some((trunkId) => inboundTrunkIds.has(trunkId));
    });

    const warnings: string[] = [];
    if (inboundTrunks.length === 0) warnings.push("No LiveKit SIP inbound trunks are configured.");
    if (dispatchRules.length === 0) warnings.push("No LiveKit SIP dispatch rules are configured.");
    if (missingInboundNumbers.length > 0) {
      warnings.push(`Missing LiveKit SIP inbound trunk coverage for: ${missingInboundNumbers.join(", ")}.`);
    }
    if (!hasInboundDispatchRule) {
      warnings.push("No LiveKit SIP dispatch rule appears to handle the Earlymark inbound surface.");
    }
    if (outboundDemo.status === "unhealthy") {
      warnings.push(...(outboundDemo.warnings.length > 0 ? outboundDemo.warnings : [outboundDemo.summary]));
    } else if (outboundDemo.status === "degraded") {
      warnings.push(...outboundDemo.warnings);
    }

    const hasFatalInboundIssue =
      inboundTrunks.length === 0 ||
      dispatchRules.length === 0 ||
      missingInboundNumbers.length > 0 ||
      !hasInboundDispatchRule;

    const status: RuntimeStatus =
      hasFatalInboundIssue || outboundDemo.status === "unhealthy"
        ? "unhealthy"
        : expectedInboundNumbers.length === 0 || warnings.length > 0 || outboundDemo.status === "degraded"
          ? "degraded"
          : "healthy";
    const summary =
      status === "healthy"
        ? "LiveKit SIP inbound and outbound demo routing are configured."
        : expectedInboundNumbers.length === 0
          ? "LiveKit SIP is configured, but no Earlymark inbound number is configured in app env."
          : hasFatalInboundIssue
            ? "LiveKit SIP is missing the inbound trunk or dispatch state required for Earlymark inbound."
            : outboundDemo.summary;

    return {
      status,
      summary,
      warnings,
      checkedAt,
      livekitUrl,
      inboundTrunkCount: inboundTrunks.length,
      outboundTrunkCount: outboundTrunks.length,
      dispatchRuleCount: dispatchRules.length,
      expectedInboundNumbers,
      missingInboundNumbers,
      inboundTrunks,
      outboundTrunks,
      demoOutbound: {
        status: outboundDemo.status,
        summary: outboundDemo.summary,
        warnings: outboundDemo.warnings,
        configuredTrunkId: outboundDemo.configuredTrunkId,
        resolvedTrunkId: outboundDemo.resolvedTrunkId,
        configuredTrunkMatched: outboundDemo.configuredTrunkMatched,
        callerNumber: outboundDemo.callerNumber,
      },
      dispatchRules,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      summary: "LiveKit SIP health check failed.",
      warnings: [error instanceof Error ? error.message : "Unknown LiveKit SIP health failure."],
      checkedAt,
      livekitUrl,
      inboundTrunkCount: 0,
      outboundTrunkCount: 0,
      dispatchRuleCount: 0,
      expectedInboundNumbers,
      missingInboundNumbers: expectedInboundNumbers,
      inboundTrunks: [],
      outboundTrunks: [],
      demoOutbound: {
        status: "unhealthy",
        summary: "LiveKit outbound SIP health check failed.",
        warnings: [error instanceof Error ? error.message : "Unknown LiveKit SIP health failure."],
        configuredTrunkId: (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null,
        resolvedTrunkId: null,
        configuredTrunkMatched: false,
        callerNumber: null,
      },
      dispatchRules: [],
    };
  }
}
