import { SipClient } from "livekit-server-sdk";
import { isEarlymarkInboundRoomName } from "./room-routing";

type RuntimeStatus = "healthy" | "degraded" | "unhealthy";

type DispatchRuleSummary = {
  sipDispatchRuleId: string;
  name: string;
  trunkIds: string[];
  roomPrefix: string | null;
  attributes: Record<string, string>;
};

type InboundTrunkSummary = {
  sipTrunkId: string;
  name: string;
  numbers: string[];
};

type OutboundTrunkSummary = {
  sipTrunkId: string;
  name: string;
  numbers: string[];
  address: string;
};

export type WorkerLivekitSipHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  checkedAt: string;
  livekitUrl: string | null;
  inboundTrunkCount: number;
  dispatchRuleCount: number;
  expectedInboundNumbers: string[];
  missingInboundNumbers: string[];
  inboundTrunks: InboundTrunkSummary[];
  outboundTrunkCount: number;
  outboundTrunks: OutboundTrunkSummary[];
  demoOutbound: {
    status: RuntimeStatus;
    summary: string;
    warnings: string[];
    configuredTrunkId: string | null;
    resolvedTrunkId: string | null;
    configuredTrunkMatched: boolean;
    callerNumber: string | null;
  };
  dispatchRules: DispatchRuleSummary[];
  source: "worker_control";
};

const CACHE_TTL_MS = 60_000;

let cached: { fetchedAt: number; result: WorkerLivekitSipHealth } | null = null;

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function phoneMatches(left?: string | null, right?: string | null) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (!a || !b) return false;
  return a === b || a.replace(/^\+/, "") === b.replace(/^\+/, "");
}

function splitNumbers(raw?: string) {
  return (raw || "")
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getKnownEarlymarkInboundNumbers() {
  return Array.from(
    new Set(
      [
        ...splitNumbers(process.env.EARLYMARK_INBOUND_PHONE_NUMBERS),
        process.env.EARLYMARK_INBOUND_PHONE_NUMBER,
        process.env.EARLYMARK_PHONE_NUMBER,
        process.env.TWILIO_PHONE_NUMBER,
      ]
        .filter(Boolean)
        .map((value) => normalizePhone(value))
        .filter(Boolean),
    ),
  );
}

function getLivekitControlBaseUrl() {
  const explicit = (process.env.LIVEKIT_CONTROL_URL || "").trim();
  if (explicit) return explicit;
  if ((process.env.NODE_ENV || "").trim() === "production") return "http://127.0.0.1:7880";

  const raw = (process.env.LIVEKIT_URL || "").trim();
  if (!raw) return "";
  if (/^wss:/i.test(raw)) return raw.replace(/^wss:/i, "https:");
  if (/^ws:/i.test(raw)) return raw.replace(/^ws:/i, "http:");
  return raw;
}

function summarizeDispatchRule(rule: Record<string, unknown>): DispatchRuleSummary {
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

function summarizeInboundTrunk(trunk: {
  sipTrunkId?: string | null;
  name?: string | null;
  numbers?: string[] | null;
}) {
  return {
    sipTrunkId: String(trunk.sipTrunkId || ""),
    name: String(trunk.name || ""),
    numbers: Array.isArray(trunk.numbers)
      ? trunk.numbers.map((value) => normalizePhone(String(value))).filter(Boolean)
      : [],
  } satisfies InboundTrunkSummary;
}

function summarizeOutboundTrunk(trunk: {
  sipTrunkId?: string | null;
  name?: string | null;
  numbers?: string[] | null;
  address?: string | null;
}) {
  return {
    sipTrunkId: String(trunk.sipTrunkId || ""),
    name: String(trunk.name || ""),
    numbers: Array.isArray(trunk.numbers)
      ? trunk.numbers.map((value) => normalizePhone(String(value))).filter(Boolean)
      : [],
    address: String(trunk.address || ""),
  } satisfies OutboundTrunkSummary;
}

function getConfiguredCallerNumbers(inboundTrunks: InboundTrunkSummary[]) {
  const configured = [
    ...getKnownEarlymarkInboundNumbers(),
    ...inboundTrunks.flatMap((trunk) => trunk.numbers),
  ];
  return Array.from(new Set(configured.filter(Boolean)));
}

function resolveDemoOutboundTrunk(outboundTrunks: OutboundTrunkSummary[], inboundTrunks: InboundTrunkSummary[]) {
  const configuredTrunkId = (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null;
  const callerNumbers = getConfiguredCallerNumbers(inboundTrunks);
  const warnings: string[] = [];
  let resolved = configuredTrunkId
    ? outboundTrunks.find((trunk) => trunk.sipTrunkId === configuredTrunkId) || null
    : null;

  const configuredTrunkMatched = Boolean(resolved);
  if (configuredTrunkId && !configuredTrunkMatched) {
    warnings.push(`Configured LIVEKIT_SIP_TRUNK_ID ${configuredTrunkId} does not match any current outbound SIP trunk.`);
  }

  if (!resolved && callerNumbers.length > 0) {
    resolved =
      outboundTrunks.find((trunk) => callerNumbers.some((number) => trunk.numbers.some((candidate) => phoneMatches(candidate, number)))) ||
      null;
  }
  if (!resolved) resolved = outboundTrunks.find((trunk) => trunk.numbers.includes("*")) || null;
  if (!resolved) resolved = outboundTrunks[0] || null;

  const callerNumber =
    callerNumbers.find((number) => resolved?.numbers.some((candidate) => phoneMatches(candidate, number))) ||
    (resolved?.numbers.includes("*") ? callerNumbers[0] || null : null) ||
    (resolved?.numbers.find((number) => number !== "*") || null);

  const summary =
    outboundTrunks.length === 0
      ? { status: "unhealthy" as const, summary: "No LiveKit outbound SIP trunks are configured for demo calls." }
      : !resolved
        ? { status: "unhealthy" as const, summary: "No valid LiveKit outbound SIP trunk could be resolved for demo calls." }
        : warnings.length > 0
          ? { status: "degraded" as const, summary: warnings[0] }
          : { status: "healthy" as const, summary: "LiveKit outbound SIP trunk is ready for demo calls." };

  return {
    status: summary.status,
    summary: summary.summary,
    warnings,
    configuredTrunkId,
    resolvedTrunkId: resolved?.sipTrunkId || null,
    configuredTrunkMatched,
    callerNumber,
  };
}

export async function getWorkerLivekitSipHealth(options?: { force?: boolean }): Promise<WorkerLivekitSipHealth> {
  if (!options?.force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  const checkedAt = new Date().toISOString();
  const livekitUrl = getLivekitControlBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
  const expectedInboundNumbers = getKnownEarlymarkInboundNumbers();

  if (!livekitUrl || !apiKey || !apiSecret) {
    const result: WorkerLivekitSipHealth = {
      status: "unhealthy",
      summary: "Worker-side LiveKit SIP health cannot be checked because LiveKit credentials are incomplete.",
      warnings: ["LIVEKIT control URL, API key, or API secret is missing."],
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
        summary: "Worker-side outbound SIP health cannot be checked because LiveKit credentials are incomplete.",
        warnings: ["LIVEKIT control URL, API key, or API secret is missing."],
        configuredTrunkId: (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null,
        resolvedTrunkId: null,
        configuredTrunkMatched: false,
        callerNumber: null,
      },
      dispatchRules: [],
      source: "worker_control",
    };
    cached = { fetchedAt: Date.now(), result };
    return result;
  }

  try {
    const sip = new SipClient(livekitUrl, apiKey, apiSecret);
    const [rawInboundTrunks, rawOutboundTrunks, rawDispatchRules] = await Promise.all([
      sip.listSipInboundTrunk(),
      sip.listSipOutboundTrunk(),
      sip.listSipDispatchRule(),
    ]);

    const inboundTrunks = rawInboundTrunks.map((trunk) => summarizeInboundTrunk(trunk));
    const outboundTrunks = rawOutboundTrunks.map((trunk) => summarizeOutboundTrunk(trunk));
    const dispatchRules = rawDispatchRules.map((rule) => summarizeDispatchRule(rule as unknown as Record<string, unknown>));
    const inboundTrunkIds = new Set(inboundTrunks.map((trunk) => trunk.sipTrunkId).filter(Boolean));
    const coveredNumbers = new Set(inboundTrunks.flatMap((trunk) => trunk.numbers));
    const missingInboundNumbers = expectedInboundNumbers.filter((number) => !coveredNumbers.has(number));
    const hasInboundDispatchRule = dispatchRules.some((rule) => {
      if (isEarlymarkInboundRoomName(rule.roomPrefix)) return true;
      return rule.trunkIds.some((trunkId) => inboundTrunkIds.has(trunkId));
    });
    const demoOutbound = resolveDemoOutboundTrunk(outboundTrunks, inboundTrunks);

    const warnings: string[] = [];
    if (inboundTrunks.length === 0) warnings.push("No LiveKit SIP inbound trunks are configured.");
    if (dispatchRules.length === 0) warnings.push("No LiveKit SIP dispatch rules are configured.");
    if (missingInboundNumbers.length > 0) {
      warnings.push(`Missing LiveKit SIP inbound trunk coverage for: ${missingInboundNumbers.join(", ")}.`);
    }
    if (!hasInboundDispatchRule) {
      warnings.push("No LiveKit SIP dispatch rule appears to handle the Earlymark inbound surface.");
    }
    if (demoOutbound.status !== "healthy") {
      warnings.push(...(demoOutbound.warnings.length > 0 ? demoOutbound.warnings : [demoOutbound.summary]));
    }

    const hasFatalInboundIssue =
      inboundTrunks.length === 0 ||
      dispatchRules.length === 0 ||
      missingInboundNumbers.length > 0 ||
      !hasInboundDispatchRule;
    const status: RuntimeStatus =
      hasFatalInboundIssue || demoOutbound.status === "unhealthy"
        ? "unhealthy"
        : expectedInboundNumbers.length === 0 || warnings.length > 0 || demoOutbound.status === "degraded"
          ? "degraded"
          : "healthy";
    const result: WorkerLivekitSipHealth = {
      status,
      summary:
        status === "healthy"
          ? "Worker-side LiveKit SIP inbound and outbound demo routing are configured."
          : expectedInboundNumbers.length === 0
            ? "Worker-side LiveKit SIP is configured, but no Earlymark inbound number is configured in worker env."
            : hasFatalInboundIssue
              ? "Worker-side LiveKit SIP is missing the inbound trunk or dispatch state required for Earlymark inbound."
              : demoOutbound.summary,
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
      demoOutbound,
      dispatchRules,
      source: "worker_control",
    };
    cached = { fetchedAt: Date.now(), result };
    return result;
  } catch (error) {
    const result: WorkerLivekitSipHealth = {
      status: "unhealthy",
      summary: "Worker-side LiveKit SIP health check failed.",
      warnings: [error instanceof Error ? error.message : "Unknown worker-side LiveKit SIP health failure."],
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
        summary: "Worker-side LiveKit outbound SIP health check failed.",
        warnings: [error instanceof Error ? error.message : "Unknown worker-side LiveKit SIP health failure."],
        configuredTrunkId: (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null,
        resolvedTrunkId: null,
        configuredTrunkMatched: false,
        callerNumber: null,
      },
      dispatchRules: [],
      source: "worker_control",
    };
    cached = { fetchedAt: Date.now(), result };
    return result;
  }
}
