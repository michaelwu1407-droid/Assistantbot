import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { phoneMatches, getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import type { RuntimeStatus, VoiceSurface } from "@/lib/voice-fleet";

type VoiceLatencyThresholds = {
  llmTtftAvgMs: number;
  ttsTtfbAvgMs: number;
  totalTurnStartMs: number;
  firstTurnStartMs: number;
};

const CRITICAL_PROOF_SURFACES: VoiceSurface[] = ["inbound_demo"];
const ADVISORY_PROOF_SURFACES: VoiceSurface[] = ["demo", "normal"];
const MIN_SAMPLES_FOR_CONFIDENCE = 3;

export type VoiceLatencyHealthScope = {
  surface: VoiceSurface;
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  sampleCount: number;
  syntheticProbeSampleCount: number;
  latestCallAt: string | null;
  latestSyntheticProbeCallAt: string | null;
  averages: {
    llmTtftAvgMs: number;
    ttsTtfbAvgMs: number;
    totalTurnStartMs: number;
    firstTurnStartMs: number;
  };
  thresholds: VoiceLatencyThresholds;
  recentCalls: Array<{
    callId: string;
    roomName: string;
    createdAt: string;
    llmTtftAvgMs: number;
    ttsTtfbAvgMs: number;
    totalTurnStartMs: number;
    firstTurnStartMs: number;
    dominantBottleneck: "tts_ttfb" | "llm_ttft" | "turn_start" | "balanced";
    ttsVoiceId: string | null;
    ttsLanguage: string | null;
    syntheticProbeCall: boolean;
  }>;
};

export type VoiceLatencyProofSurface = {
  surface: VoiceSurface;
  status: RuntimeStatus;
  summary: string;
  sampleCount: number;
  syntheticProbeSampleCount: number;
  latestCallAt: string | null;
  latestSyntheticProbeCallAt: string | null;
  samplesSufficient: boolean;
  minSamplesForConfidence: number;
};

export type VoiceLatencyHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  lookbackMinutes: number;
  scopes: VoiceLatencyHealthScope[];
  proof: {
    status: RuntimeStatus;
    summary: string;
    surfaces: VoiceLatencyProofSurface[];
    advisorySurfaces: VoiceLatencyProofSurface[];
  };
};

const THRESHOLDS: Record<VoiceSurface, VoiceLatencyThresholds> = {
  demo: {
    llmTtftAvgMs: 1200,
    ttsTtfbAvgMs: 900,
    totalTurnStartMs: 1800,
    firstTurnStartMs: 300,
  },
  inbound_demo: {
    llmTtftAvgMs: 1200,
    // PSTN-backed inbound demo calls behave much closer to the real phone surface
    // than the in-browser demo surface. In production, healthy spoken-canary calls
    // consistently land around ~1.0s TTS first-byte time while still keeping
    // end-to-end turn-start latency comfortably healthy, so the stricter 900ms
    // browser/demo threshold over-flags this surface.
    ttsTtfbAvgMs: 1100,
    totalTurnStartMs: 1800,
    firstTurnStartMs: 300,
  },
  normal: {
    llmTtftAvgMs: 1500,
    ttsTtfbAvgMs: 1100,
    totalTurnStartMs: 2200,
    firstTurnStartMs: 450,
  },
};

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function requiresRecentProof(surface: VoiceSurface) {
  return CRITICAL_PROOF_SURFACES.includes(surface);
}

function getConfiguredSyntheticProbeCaller() {
  return (process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER || process.env.VOICE_ALERT_SMS_TO || "").trim();
}

function getConfiguredSyntheticProbeTargets() {
  const explicitTarget = (process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER || "").trim();
  const knownInboundNumbers = getKnownEarlymarkInboundNumbers();
  return explicitTarget ? [explicitTarget, ...knownInboundNumbers] : knownInboundNumbers;
}

function detectSyntheticProbeCall(call: {
  roomName: string;
  callerPhone?: string | null;
  calledPhone?: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  const metadata = isJsonObject(call.metadata) ? call.metadata : null;
  const monitoring = isJsonObject(metadata?.monitoring) ? metadata.monitoring : null;
  const explicitFlag = readBoolean(monitoring?.syntheticProbeCall) ?? readBoolean(metadata?.syntheticProbeCall);
  if (explicitFlag === true) {
    return true;
  }

  const configuredProbeCaller = getConfiguredSyntheticProbeCaller();
  const configuredProbeTargets = getConfiguredSyntheticProbeTargets();
  if (
    configuredProbeCaller &&
    configuredProbeTargets.length > 0 &&
    phoneMatches(call.callerPhone, configuredProbeCaller) &&
    configuredProbeTargets.some((target) => phoneMatches(call.calledPhone, target))
  ) {
    return true;
  }

  return /(^|[_-])probe([_-]|$)/i.test(call.roomName);
}

function extractLatency(call: {
  latency: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  callId: string;
  roomName: string;
  createdAt: Date;
  callerPhone: string | null;
  calledPhone: string | null;
}) {
  const latency = isJsonObject(call.latency) ? call.latency : null;
  const metadata = isJsonObject(call.metadata) ? call.metadata : null;
  const llmTtftAvgMs = latency ? readNumber(latency.llmTtftAvgMs) : 0;
  const ttsTtfbAvgMs = latency ? readNumber(latency.ttsTtfbAvgMs) : 0;
  const totalTurnStartMs = latency
    ? readNumber(latency.totalTurnStartAvgMs) ||
      (
        readNumber(latency.eouAvgMs) +
        readNumber(latency.transcriptionDelayAvgMs) +
        llmTtftAvgMs +
        ttsTtfbAvgMs
      )
    : 0;
  const firstTurnStartMs = latency ? readNumber(latency.firstTurnStartMs) : 0;
  const dominantBottleneck: "tts_ttfb" | "llm_ttft" | "turn_start" | "balanced" =
    ttsTtfbAvgMs > llmTtftAvgMs && ttsTtfbAvgMs >= totalTurnStartMs * 0.45
      ? "tts_ttfb"
      : llmTtftAvgMs >= ttsTtfbAvgMs && llmTtftAvgMs >= totalTurnStartMs * 0.35
        ? "llm_ttft"
        : totalTurnStartMs > 0
          ? "turn_start"
          : "balanced";

  return {
    callId: call.callId,
    roomName: call.roomName,
    createdAt: call.createdAt.toISOString(),
    llmTtftAvgMs,
    ttsTtfbAvgMs,
    totalTurnStartMs,
    firstTurnStartMs,
    dominantBottleneck,
    ttsVoiceId: typeof metadata?.ttsVoiceId === "string" ? metadata.ttsVoiceId : null,
    ttsLanguage: typeof metadata?.ttsLanguage === "string" ? metadata.ttsLanguage : null,
    syntheticProbeCall: detectSyntheticProbeCall(call),
  };
}

function evaluateScope(surface: VoiceSurface, recentCalls: VoiceLatencyHealthScope["recentCalls"]): VoiceLatencyHealthScope {
  const thresholds = THRESHOLDS[surface];
  const warnings: string[] = [];
  const requiresProof = requiresRecentProof(surface);
  const syntheticProbeSampleCount = recentCalls.filter((call) => call.syntheticProbeCall).length;
  const latestCallAt = recentCalls[0]?.createdAt || null;
  const latestSyntheticProbeCallAt = recentCalls.find((call) => call.syntheticProbeCall)?.createdAt || null;
  const llmValues = recentCalls.map((call) => call.llmTtftAvgMs).filter((value) => value > 0);
  const ttsValues = recentCalls.map((call) => call.ttsTtfbAvgMs).filter((value) => value > 0);
  const totalValues = recentCalls.map((call) => call.totalTurnStartMs).filter((value) => value > 0);
  const firstTurnValues = recentCalls.map((call) => call.firstTurnStartMs).filter((value) => value > 0);

  const averages = {
    llmTtftAvgMs: avg(llmValues),
    ttsTtfbAvgMs: avg(ttsValues),
    totalTurnStartMs: avg(totalValues),
    firstTurnStartMs: avg(firstTurnValues),
  };

  if (recentCalls.length === 0 && requiresProof) {
    warnings.push(`No recent ${surface} calls have been persisted, so latency cannot be verified.`);
  }

  const perceivedStartHealthyThresholdMs = Math.min(thresholds.totalTurnStartMs, thresholds.ttsTtfbAvgMs + 100);
  const fastPerceivedCallCount = recentCalls.filter((call) => (
    call.firstTurnStartMs > 0 &&
    call.firstTurnStartMs <= thresholds.firstTurnStartMs &&
    call.totalTurnStartMs > 0 &&
    call.totalTurnStartMs <= perceivedStartHealthyThresholdMs
  )).length;

  const usesFastSpeechLead =
    (surface === "demo" || surface === "inbound_demo") &&
    recentCalls.length >= 3 &&
    averages.totalTurnStartMs > 0 &&
    averages.totalTurnStartMs <= perceivedStartHealthyThresholdMs &&
    fastPerceivedCallCount >= Math.max(3, Math.ceil(recentCalls.length * 0.6));

  if (recentCalls.length >= 3 && averages.llmTtftAvgMs > thresholds.llmTtftAvgMs) {
    warnings.push(`Average LLM TTFT is ${averages.llmTtftAvgMs}ms (threshold ${thresholds.llmTtftAvgMs}ms).`);
  }
  if (recentCalls.length >= 3 && averages.ttsTtfbAvgMs > thresholds.ttsTtfbAvgMs && !usesFastSpeechLead) {
    warnings.push(`Average TTS TTFB is ${averages.ttsTtfbAvgMs}ms (threshold ${thresholds.ttsTtfbAvgMs}ms).`);
  }
  if (recentCalls.length >= 3 && averages.totalTurnStartMs > thresholds.totalTurnStartMs) {
    warnings.push(
      `Average turn-start latency is ${averages.totalTurnStartMs}ms (threshold ${thresholds.totalTurnStartMs}ms).`,
    );
  }

  const dominantBottleneckCounts = recentCalls.reduce<Record<string, number>>((acc, call) => {
    acc[call.dominantBottleneck] = (acc[call.dominantBottleneck] || 0) + 1;
    return acc;
  }, {});
  if (
    recentCalls.length >= 3 &&
    averages.ttsTtfbAvgMs > thresholds.ttsTtfbAvgMs &&
    !usesFastSpeechLead &&
    (dominantBottleneckCounts.tts_ttfb || 0) >= Math.max(2, Math.ceil(recentCalls.length / 2))
  ) {
    warnings.push("TTS first-byte latency is currently the dominant contributor on recent calls.");
  }

  const isSeverelyRegressed =
    recentCalls.length >= 3 &&
    (
      averages.llmTtftAvgMs > thresholds.llmTtftAvgMs * 1.25 ||
      averages.ttsTtfbAvgMs > thresholds.ttsTtfbAvgMs * 1.25 ||
      averages.totalTurnStartMs > thresholds.totalTurnStartMs * 1.25
    );

  const status: RuntimeStatus =
    warnings.length === 0
      ? "healthy"
      : isSeverelyRegressed
        ? "unhealthy"
        : "degraded";

  const noRecentCallsSummary = requiresProof
    ? `No recent ${surface} calls have been persisted, so latency cannot be verified`
    : `No recent ${surface} calls have been persisted`;

  return {
    surface,
    status,
    summary:
      status === "healthy"
        ? recentCalls.length === 0
          ? noRecentCallsSummary
          : `${surface} latency is within expected thresholds`
        : warnings[0] || (recentCalls.length === 0 ? noRecentCallsSummary : `${surface} latency has regressed`),
    warnings,
    sampleCount: recentCalls.length,
    syntheticProbeSampleCount,
    latestCallAt,
    latestSyntheticProbeCallAt,
    averages,
    thresholds,
    recentCalls,
  };
}

function buildCriticalProofSurface(scope: VoiceLatencyHealthScope): VoiceLatencyProofSurface {
  const samplesSufficient = scope.sampleCount >= MIN_SAMPLES_FOR_CONFIDENCE;
  return {
    surface: scope.surface,
    status: scope.status,
    summary:
      scope.sampleCount === 0
        ? scope.summary
        : scope.syntheticProbeSampleCount > 0
          ? `Recent ${scope.surface} latency proof has ${scope.sampleCount} phone sample(s), including ${scope.syntheticProbeSampleCount} spoken-canary sample(s).`
          : `Recent ${scope.surface} latency proof has ${scope.sampleCount} phone sample(s), but none came from the spoken canary yet.`,
    sampleCount: scope.sampleCount,
    syntheticProbeSampleCount: scope.syntheticProbeSampleCount,
    latestCallAt: scope.latestCallAt,
    latestSyntheticProbeCallAt: scope.latestSyntheticProbeCallAt,
    samplesSufficient,
    minSamplesForConfidence: MIN_SAMPLES_FOR_CONFIDENCE,
  };
}

function buildAdvisoryProofSurface(scope: VoiceLatencyHealthScope): VoiceLatencyProofSurface {
  const samplesSufficient = scope.sampleCount >= MIN_SAMPLES_FOR_CONFIDENCE;
  const summary = samplesSufficient
    ? `Recent ${scope.surface} latency has ${scope.sampleCount} sample(s), enough to evaluate optimization wins.`
    : `Only ${scope.sampleCount} recent ${scope.surface} sample(s); need ${MIN_SAMPLES_FOR_CONFIDENCE}+ before claiming optimization wins.`;
  return {
    surface: scope.surface,
    status: scope.status,
    summary,
    sampleCount: scope.sampleCount,
    syntheticProbeSampleCount: scope.syntheticProbeSampleCount,
    latestCallAt: scope.latestCallAt,
    latestSyntheticProbeCallAt: scope.latestSyntheticProbeCallAt,
    samplesSufficient,
    minSamplesForConfidence: MIN_SAMPLES_FOR_CONFIDENCE,
  };
}

function buildLatencyProof(scopes: VoiceLatencyHealthScope[]) {
  const surfaces = scopes
    .filter((scope) => requiresRecentProof(scope.surface))
    .map(buildCriticalProofSurface);

  const advisorySurfaces = scopes
    .filter((scope) => ADVISORY_PROOF_SURFACES.includes(scope.surface))
    .map(buildAdvisoryProofSurface);

  const status = surfaces.reduce<RuntimeStatus>((current, scope) => maxStatus(current, scope.status), "healthy");
  const summary =
    surfaces.find((scope) => scope.status !== "healthy")?.summary ||
    surfaces[0]?.summary ||
    "No latency-proof surfaces are configured.";

  return {
    status,
    summary,
    surfaces,
    advisorySurfaces,
  };
}

export async function getVoiceLatencyHealth(options?: {
  lookbackMinutes?: number;
  limitPerSurface?: number;
}): Promise<VoiceLatencyHealth> {
  const lookbackMinutes = options?.lookbackMinutes ?? 60;
  const limitPerSurface = options?.limitPerSurface ?? 20;
  const since = new Date(Date.now() - lookbackMinutes * 60_000);

  const calls = await db.voiceCall.findMany({
    where: {
      createdAt: { gte: since },
      callType: { in: ["demo", "inbound_demo", "normal"] },
      endedAt: { not: null },
    },
    select: {
      callId: true,
      callType: true,
      roomName: true,
      createdAt: true,
      callerPhone: true,
      calledPhone: true,
      latency: true,
      metadata: true,
    },
    orderBy: { createdAt: "desc" },
    take: limitPerSurface * 6,
  });

  const grouped = {
    demo: [] as VoiceLatencyHealthScope["recentCalls"],
    inbound_demo: [] as VoiceLatencyHealthScope["recentCalls"],
    normal: [] as VoiceLatencyHealthScope["recentCalls"],
  };

  for (const call of calls) {
    const surface = call.callType as VoiceSurface;
    if (grouped[surface].length >= limitPerSurface) continue;
    grouped[surface].push(extractLatency(call));
  }

  const scopes = (["demo", "inbound_demo", "normal"] as VoiceSurface[]).map((surface) =>
    evaluateScope(surface, grouped[surface]),
  );
  const proof = buildLatencyProof(scopes);
  const status = scopes.reduce<RuntimeStatus>((current, scope) => maxStatus(current, scope.status), "healthy");

  return {
    status,
    summary:
      status === "healthy"
        ? "Recent persisted voice-call latency is within expected thresholds"
        : scopes.find((scope) => scope.status !== "healthy")?.summary || "Voice latency regression detected",
    warnings: scopes.flatMap((scope) => scope.warnings),
    lookbackMinutes,
    scopes,
    proof,
  };
}
