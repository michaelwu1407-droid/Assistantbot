import { db } from "@/lib/db";
import { PostHog } from 'posthog-node';

const phClient = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_eItDOEcnUFBDBPfwiquvIS7J5fvd870lyXHSHd1YXGQ',
  { host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com' }
);

type PercentileSummary = {
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
};

type LatencySnapshot = {
  generatedAt: string;
  windowSize: number;
  metrics: Record<string, PercentileSummary>;
};

const WINDOW_SIZE = 500;
const metricStore = new Map<string, number[]>();

function clampMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.round(value);
}

function percentileFromSorted(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const idx = Math.min(values.length - 1, Math.max(0, Math.ceil((percentile / 100) * values.length) - 1));
  return values[idx];
}

function summarize(values: number[]): PercentileSummary {
  if (!values.length) {
    return {
      count: 0,
      avgMs: 0,
      minMs: 0,
      maxMs: 0,
      p50Ms: 0,
      p95Ms: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    count: sorted.length,
    avgMs: Math.round(sum / sorted.length),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    p50Ms: percentileFromSorted(sorted, 50),
    p95Ms: percentileFromSorted(sorted, 95),
  };
}

export function recordLatencyMetric(metric: string, durationMs: number) {
  const sample = clampMs(durationMs);

  // 1. In-memory store (for local dev / single instance)
  const existing = metricStore.get(metric) ?? [];
  existing.push(sample);
  if (existing.length > WINDOW_SIZE) {
    existing.splice(0, existing.length - WINDOW_SIZE);
  }
  metricStore.set(metric, existing);

  // 2. Database store (Supabase)
  db.telemetryMetric.create({
    data: {
      metric,
      duration: sample,
    }
  }).catch(err => console.error("[Telemetry ERROR] Failed to save latency to DB:", err));

  // 3. PostHog store
  phClient.capture({
    distinctId: "server-telemetry",
    event: "backend_latency_metric",
    properties: {
      metric_name: metric,
      duration_ms: sample,
    }
  });
}

export async function getLatencySnapshot(): Promise<LatencySnapshot> {
  const metrics: Record<string, PercentileSummary> = {};

  try {
    // Read from DB instead of local memory
    const dbMetrics = await db.telemetryMetric.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000, // Reasonable max
    });

    // Group by metric name
    const grouped = new Map<string, number[]>();
    for (const row of dbMetrics) {
      const existing = grouped.get(row.metric) ?? [];
      existing.push(row.duration);
      grouped.set(row.metric, existing);
    }

    // Calculate summaries
    for (const [metric, values] of grouped.entries()) {
      metrics[metric] = summarize(values);
    }
  } catch (err) {
    console.error("[Telemetry ERROR] Failed to fetch latency from DB:", err);
  }

  return {
    generatedAt: new Date().toISOString(),
    windowSize: WINDOW_SIZE,
    metrics,
  };
}

export async function resetLatencyTelemetry() {
  metricStore.clear();
  try {
    await db.telemetryMetric.deleteMany({});
  } catch (err) {
    console.error("[Telemetry ERROR] Failed to reset DB metrics:", err);
  }
}

export function nowMs(): number {
  return Date.now();
}

export function instrumentToolsWithLatency<T extends Record<string, any>>(
  tools: T,
  onToolTiming: (toolName: string, durationMs: number) => void,
): T {
  const wrappedEntries = Object.entries(tools).map(([toolName, toolDef]) => {
    if (!toolDef || typeof toolDef !== "object" || typeof (toolDef as { execute?: unknown }).execute !== "function") {
      return [toolName, toolDef] as const;
    }
    const originalExecute = (toolDef as { execute: (...args: any[]) => Promise<any> }).execute;
    const wrappedTool = {
      ...toolDef,
      execute: async (...args: any[]) => {
        const startedAt = nowMs();
        try {
          return await originalExecute(...args);
        } finally {
          onToolTiming(toolName, nowMs() - startedAt);
        }
      },
    };
    return [toolName, wrappedTool] as const;
  });

  return Object.fromEntries(wrappedEntries) as T;
}
