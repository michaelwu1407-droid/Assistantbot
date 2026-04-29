import { SipClient } from "livekit-server-sdk";
import { getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import { resolveLivekitDemoOutboundTrunk } from "@/lib/demo-call";
import { normalizePhone } from "@/lib/phone-utils";
import type { WorkerLivekitSipHealth } from "@/livekit-agent/livekit-sip-runtime";
import { isEarlymarkInboundRoomName } from "@/lib/voice-room-routing";
import { getLatestVoiceWorkerSnapshots, type RuntimeStatus } from "@/lib/voice-fleet";

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
  source?: "web_probe" | "worker_summary";
  observedHostIds?: string[];
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

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function readWorkerLivekitSipHealth(summary: Record<string, unknown> | null): WorkerLivekitSipHealth | null {
  const candidate = summary?.livekitSip;
  if (!isJsonObject(candidate)) return null;

  const status = candidate.status;
  const summaryText = candidate.summary;
  const warnings = candidate.warnings;
  if (
    (status !== "healthy" && status !== "degraded" && status !== "unhealthy") ||
    typeof summaryText !== "string" ||
    !Array.isArray(warnings)
  ) {
    return null;
  }

  return candidate as unknown as WorkerLivekitSipHealth;
}

async function getWorkerReportedLivekitSipHealth(): Promise<LivekitSipHealth | null> {
  const snapshots = await getLatestVoiceWorkerSnapshots();
  const latestByHost = new Map<string, { hostId: string; checkedAt: string; health: WorkerLivekitSipHealth }>();

  for (const snapshot of snapshots) {
    const health = readWorkerLivekitSipHealth(snapshot.summary);
    if (!health) continue;

    const current = latestByHost.get(snapshot.hostId);
    if (!current || health.checkedAt > current.checkedAt) {
      latestByHost.set(snapshot.hostId, {
        hostId: snapshot.hostId,
        checkedAt: health.checkedAt,
        health,
      });
    }
  }

  const hostReports = Array.from(latestByHost.values());
  if (hostReports.length === 0) return null;

  const [base, ...rest] = hostReports
    .slice()
    .sort((left, right) => right.checkedAt.localeCompare(left.checkedAt));
  const status = hostReports.reduce<RuntimeStatus>((current, report) => maxStatus(current, report.health.status), "healthy");
  const warnings = Array.from(
    new Set([
      ...hostReports.flatMap((report) => report.health.warnings),
      ...(rest.some((report) => report.health.status !== base.health.status)
        ? ["Worker hosts disagree about LiveKit SIP health; using the freshest host report as the detail source."]
        : []),
    ]),
  );

  return {
    ...base.health,
    status,
    summary:
      status === "healthy"
        ? "Worker-reported LiveKit SIP inbound and outbound demo routing are configured."
        : hostReports.find((report) => report.health.status !== "healthy")?.health.summary || base.health.summary,
    warnings,
    checkedAt: base.health.checkedAt,
    source: "worker_summary",
    observedHostIds: hostReports.map((report) => report.hostId),
  };
}

async function getWebProbeLivekitSipHealth(): Promise<LivekitSipHealth> {
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
      source: "web_probe",
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
      preloadedInboundTrunks: rawInboundTrunks,
    });

    const inboundTrunks = rawInboundTrunks.map((trunk) => ({
      sipTrunkId: String(trunk.sipTrunkId || ""),
      name: String(trunk.name || ""),
      numbers: Array.isArray(trunk.numbers)
        ? trunk.numbers.map((value) => normalizePhone(String(value))).filter(Boolean)
        : [],
    }));
    const outboundTrunks = rawOutboundTrunks.map((trunk) => ({
      sipTrunkId: String(trunk.sipTrunkId || ""),
      name: String(trunk.name || ""),
      numbers: Array.isArray(trunk.numbers)
        ? trunk.numbers.map((value) => normalizePhone(String(value))).filter(Boolean)
        : [],
      address: String(trunk.address || ""),
    }));
    const dispatchRules = rawDispatchRules.map((rule) => summarizeDispatchRule(rule as unknown as Record<string, unknown>));

    const inboundTrunkIds = new Set(inboundTrunks.map((trunk) => trunk.sipTrunkId).filter(Boolean));
    const coveredNumbers = new Set(inboundTrunks.flatMap((trunk) => trunk.numbers));
    const missingInboundNumbers = expectedInboundNumbers.filter((number) => !coveredNumbers.has(number));
    const hasInboundDispatchRule = dispatchRules.some((rule) => {
      if (isEarlymarkInboundRoomName(rule.roomPrefix)) return true;
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
      source: "web_probe",
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
      source: "web_probe",
    };
  }
}

export async function getLivekitSipHealth(): Promise<LivekitSipHealth> {
  const workerReported = await getWorkerReportedLivekitSipHealth().catch(() => null);
  if (workerReported) {
    return workerReported;
  }

  return getWebProbeLivekitSipHealth();
}
