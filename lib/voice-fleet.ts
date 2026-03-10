import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type RuntimeStatus = "healthy" | "degraded" | "unhealthy";
export type VoiceSurface = "demo" | "inbound_demo" | "normal";
export type VoiceWorkerRole = "tracey-sales-agent" | "tracey-customer-agent" | "tracey-all-agent";

export type VoiceWorkerSnapshot = {
  hostId: string;
  workerRole: string;
  surfaceSet: VoiceSurface[];
  deployGitSha: string | null;
  runtimeFingerprint: string;
  ready: boolean;
  activeCalls: number;
  summary: Record<string, unknown> | null;
  heartbeatAt: string;
  ageMs: number;
  status: RuntimeStatus;
  warnings: string[];
};

export type VoiceSurfaceHealth = {
  surface: VoiceSurface;
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  supportingHosts: string[];
  expectedHostCount: number;
  workers: VoiceWorkerSnapshot[];
};

export type VoiceHostHealth = {
  hostId: string;
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  workers: VoiceWorkerSnapshot[];
};

export type VoiceFleetHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  checkedAt: string;
  latestHeartbeatAt: string | null;
  hosts: VoiceHostHealth[];
  surfaces: Record<VoiceSurface, VoiceSurfaceHealth>;
};

const VOICE_SURFACES: VoiceSurface[] = ["demo", "inbound_demo", "normal"];
const EXPECTED_HOST_COUNT = 2;
const HEARTBEAT_LOOKBACK_MS = 10 * 60_000;
const DEGRADED_HEARTBEAT_AGE_MS = 90_000;
const UNHEALTHY_HEARTBEAT_AGE_MS = 150_000;

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSurface(value: unknown): VoiceSurface | null {
  return value === "demo" || value === "inbound_demo" || value === "normal" ? value : null;
}

function parseSurfaceSet(value: Prisma.JsonValue | null | undefined, workerRole: string): VoiceSurface[] {
  if (Array.isArray(value)) {
    const parsed = value
      .map((entry) => normalizeSurface(entry))
      .filter(Boolean) as VoiceSurface[];
    if (parsed.length > 0) return parsed;
  }

  if (typeof value === "string") {
    const parsed = value
      .split(",")
      .map((entry) => normalizeSurface(entry.trim()))
      .filter(Boolean) as VoiceSurface[];
    if (parsed.length > 0) return parsed;
  }

  if (workerRole === "tracey-sales-agent") return ["demo", "inbound_demo"];
  if (workerRole === "tracey-customer-agent") return ["normal"];
  return [...VOICE_SURFACES];
}

function readSummary(value: Prisma.JsonValue | null | undefined) {
  return isJsonObject(value) ? (value as Record<string, unknown>) : null;
}

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function buildWorkerSnapshot(record: {
  hostId: string;
  workerRole: string;
  surfaceSet: Prisma.JsonValue | null;
  deployGitSha: string | null;
  runtimeFingerprint: string;
  ready: boolean;
  activeCalls: number;
  summary: Prisma.JsonValue | null;
  heartbeatAt: Date;
}) {
  const ageMs = Date.now() - record.heartbeatAt.getTime();
  const warnings: string[] = [];

  if (!record.ready) {
    warnings.push("Worker reported itself as not ready.");
  }
  if (ageMs > UNHEALTHY_HEARTBEAT_AGE_MS) {
    warnings.push(`Heartbeat is stale (${Math.round(ageMs / 1000)}s old).`);
  } else if (ageMs > DEGRADED_HEARTBEAT_AGE_MS) {
    warnings.push(`Heartbeat is aging (${Math.round(ageMs / 1000)}s old).`);
  }

  const status: RuntimeStatus =
    !record.ready || ageMs > UNHEALTHY_HEARTBEAT_AGE_MS
      ? "unhealthy"
      : ageMs > DEGRADED_HEARTBEAT_AGE_MS
        ? "degraded"
        : "healthy";

  return {
    hostId: record.hostId,
    workerRole: record.workerRole,
    surfaceSet: parseSurfaceSet(record.surfaceSet, record.workerRole),
    deployGitSha: record.deployGitSha,
    runtimeFingerprint: record.runtimeFingerprint,
    ready: record.ready,
    activeCalls: record.activeCalls,
    summary: readSummary(record.summary),
    heartbeatAt: record.heartbeatAt.toISOString(),
    ageMs,
    status,
    warnings,
  } satisfies VoiceWorkerSnapshot;
}

function workerSupportsSurface(worker: VoiceWorkerSnapshot, surface: VoiceSurface) {
  return worker.surfaceSet.includes(surface);
}

function buildSurfaceHealth(surface: VoiceSurface, workers: VoiceWorkerSnapshot[]): VoiceSurfaceHealth {
  const relevantWorkers = workers.filter((worker) => workerSupportsSurface(worker, surface));
  const routableWorkers = relevantWorkers.filter((worker) => worker.status !== "unhealthy");
  const healthyHosts = new Set(routableWorkers.map((worker) => worker.hostId));
  const warnings: string[] = [];

  if (relevantWorkers.length === 0) {
    warnings.push("No worker heartbeat has registered support for this surface.");
  } else if (healthyHosts.size < EXPECTED_HOST_COUNT) {
    warnings.push(`Only ${healthyHosts.size}/${EXPECTED_HOST_COUNT} expected host(s) are currently routable.`);
  }

  const status: RuntimeStatus =
    healthyHosts.size === 0
      ? "unhealthy"
      : healthyHosts.size < EXPECTED_HOST_COUNT || relevantWorkers.some((worker) => worker.status === "degraded")
        ? "degraded"
        : "healthy";

  const summary =
    status === "healthy"
      ? `${surface} has healthy workers on ${healthyHosts.size} host(s)`
      : warnings[0] || `${surface} worker capacity is degraded`;

  return {
    surface,
    status,
    summary,
    warnings,
    supportingHosts: Array.from(healthyHosts),
    expectedHostCount: EXPECTED_HOST_COUNT,
    workers: relevantWorkers,
  };
}

function buildHostHealth(hostId: string, workers: VoiceWorkerSnapshot[]): VoiceHostHealth {
  const warnings: string[] = [];
  const roles = new Set(workers.map((worker) => worker.workerRole));
  const expectedRoles = ["tracey-sales-agent", "tracey-customer-agent"];

  for (const role of expectedRoles) {
    if (!roles.has(role)) {
      warnings.push(`Missing ${role} heartbeat on this host.`);
    }
  }
  if (workers.some((worker) => worker.status === "unhealthy")) {
    warnings.push("At least one worker role on this host is unhealthy.");
  } else if (workers.some((worker) => worker.status === "degraded")) {
    warnings.push("At least one worker role on this host is degraded.");
  }

  const status =
    workers.length === 0 || workers.every((worker) => worker.status === "unhealthy")
      ? "unhealthy"
      : warnings.length > 0
        ? "degraded"
        : "healthy";

  return {
    hostId,
    status,
    summary:
      status === "healthy"
        ? "All expected worker roles on this host are healthy"
        : warnings[0] || "Voice worker host is degraded",
    warnings,
    workers,
  };
}

export async function getLatestVoiceWorkerSnapshots(): Promise<VoiceWorkerSnapshot[]> {
  const since = new Date(Date.now() - HEARTBEAT_LOOKBACK_MS);
  const records = await db.voiceWorkerHeartbeat.findMany({
    where: { heartbeatAt: { gte: since } },
    orderBy: [{ heartbeatAt: "desc" }, { createdAt: "desc" }],
  });

  const latestByWorker = new Map<string, VoiceWorkerSnapshot>();
  for (const record of records) {
    const key = `${record.hostId}::${record.workerRole}`;
    if (latestByWorker.has(key)) continue;
    latestByWorker.set(key, buildWorkerSnapshot(record));
  }

  return Array.from(latestByWorker.values()).sort((left, right) =>
    left.hostId === right.hostId
      ? left.workerRole.localeCompare(right.workerRole)
      : left.hostId.localeCompare(right.hostId),
  );
}

export async function getVoiceFleetHealth(): Promise<VoiceFleetHealth> {
  const checkedAt = new Date().toISOString();
  const workers = await getLatestVoiceWorkerSnapshots();
  const warnings: string[] = [];

  const surfaces = Object.fromEntries(
    VOICE_SURFACES.map((surface) => [surface, buildSurfaceHealth(surface, workers)]),
  ) as Record<VoiceSurface, VoiceSurfaceHealth>;

  const hostIds = Array.from(new Set(workers.map((worker) => worker.hostId)));
  const hosts = hostIds.map((hostId) =>
    buildHostHealth(
      hostId,
      workers.filter((worker) => worker.hostId === hostId),
    ),
  );

  if (workers.length === 0) {
    warnings.push("No recent voice worker heartbeats were found.");
  }
  if (hosts.length < EXPECTED_HOST_COUNT) {
    warnings.push(`Only ${hosts.length}/${EXPECTED_HOST_COUNT} voice host(s) have reported in recently.`);
  }
  for (const surface of VOICE_SURFACES) {
    if (surfaces[surface].status !== "healthy") {
      warnings.push(surfaces[surface].summary);
    }
  }

  const status = VOICE_SURFACES.reduce<RuntimeStatus>(
    (current, surface) => maxStatus(current, surfaces[surface].status),
    "healthy",
  );

  const latestHeartbeatAt =
    workers
      .map((worker) => worker.heartbeatAt)
      .sort((left, right) => right.localeCompare(left))[0] || null;

  return {
    status,
    summary:
      status === "healthy"
        ? "Voice worker fleet is healthy across all Tracey surfaces"
        : warnings[0] || "Voice worker fleet is degraded",
    warnings,
    checkedAt,
    latestHeartbeatAt,
    hosts,
    surfaces,
  };
}

export function isVoiceSurfaceRoutable(fleet: VoiceFleetHealth, surface: VoiceSurface) {
  return fleet.surfaces[surface].status !== "unhealthy";
}
