import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { RuntimeStatus, VoiceSurface } from "@/lib/voice-fleet";

type VoiceLatencyThresholds = {
  llmTtftAvgMs: number;
  ttsTtfbAvgMs: number;
  totalTurnStartMs: number;
};

export type VoiceLatencyHealthScope = {
  surface: VoiceSurface;
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  sampleCount: number;
  averages: {
    llmTtftAvgMs: number;
    ttsTtfbAvgMs: number;
    totalTurnStartMs: number;
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
  }>;
};

export type VoiceLatencyHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  lookbackMinutes: number;
  scopes: VoiceLatencyHealthScope[];
};

const THRESHOLDS: Record<VoiceSurface, VoiceLatencyThresholds> = {
  demo: {
    llmTtftAvgMs: 1200,
    ttsTtfbAvgMs: 900,
    totalTurnStartMs: 1800,
  },
  inbound_demo: {
    llmTtftAvgMs: 1200,
    ttsTtfbAvgMs: 900,
    totalTurnStartMs: 1800,
  },
  normal: {
    llmTtftAvgMs: 1500,
    ttsTtfbAvgMs: 1100,
    totalTurnStartMs: 2200,
  },
};

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function extractLatency(call: {
  latency: Prisma.JsonValue | null;
  callId: string;
  roomName: string;
  createdAt: Date;
}) {
  const latency = isJsonObject(call.latency) ? call.latency : null;
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

  return {
    callId: call.callId,
    roomName: call.roomName,
    createdAt: call.createdAt.toISOString(),
    llmTtftAvgMs,
    ttsTtfbAvgMs,
    totalTurnStartMs,
    firstTurnStartMs,
  };
}

function evaluateScope(surface: VoiceSurface, recentCalls: VoiceLatencyHealthScope["recentCalls"]): VoiceLatencyHealthScope {
  const thresholds = THRESHOLDS[surface];
  const warnings: string[] = [];
  const llmValues = recentCalls.map((call) => call.llmTtftAvgMs).filter((value) => value > 0);
  const ttsValues = recentCalls.map((call) => call.ttsTtfbAvgMs).filter((value) => value > 0);
  const totalValues = recentCalls.map((call) => call.totalTurnStartMs).filter((value) => value > 0);

  const averages = {
    llmTtftAvgMs: avg(llmValues),
    ttsTtfbAvgMs: avg(ttsValues),
    totalTurnStartMs: avg(totalValues),
  };

  if (recentCalls.length >= 3 && averages.llmTtftAvgMs > thresholds.llmTtftAvgMs) {
    warnings.push(`Average LLM TTFT is ${averages.llmTtftAvgMs}ms (threshold ${thresholds.llmTtftAvgMs}ms).`);
  }
  if (recentCalls.length >= 3 && averages.ttsTtfbAvgMs > thresholds.ttsTtfbAvgMs) {
    warnings.push(`Average TTS TTFB is ${averages.ttsTtfbAvgMs}ms (threshold ${thresholds.ttsTtfbAvgMs}ms).`);
  }
  if (recentCalls.length >= 3 && averages.totalTurnStartMs > thresholds.totalTurnStartMs) {
    warnings.push(
      `Average turn-start latency is ${averages.totalTurnStartMs}ms (threshold ${thresholds.totalTurnStartMs}ms).`,
    );
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

  return {
    surface,
    status,
    summary:
      status === "healthy"
        ? recentCalls.length === 0
          ? `No recent ${surface} calls have been persisted`
          : `${surface} latency is within expected thresholds`
        : warnings[0] || `${surface} latency has regressed`,
    warnings,
    sampleCount: recentCalls.length,
    averages,
    thresholds,
    recentCalls,
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
      latency: true,
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
  };
}
