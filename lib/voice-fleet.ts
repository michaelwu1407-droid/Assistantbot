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
  capacityState: "available" | "at_capacity" | "unknown";
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
  atCapacityHosts: string[];
  expectedHostCount: number;
  capacityExhausted: boolean;
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

export type VoiceSurfaceSaturationHealth = {
  surface: VoiceSurface;
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  lookbackMinutes: number;
  sustainedHeartbeatThreshold: number;
  sustainedHosts: string[];
  hostCounts: Record<string, number>;
};

const VOICE_SURFACES: VoiceSurface[] = ["demo", "inbound_demo", "normal"];
const DEFAULT_EXPECTED_HOST_COUNT = 2;
const HEARTBEAT_LOOKBACK_MS = 10 * 60_000;
const DEGRADED_HEARTBEAT_AGE_MS = 90_000;
const UNHEALTHY_HEARTBEAT_AGE_MS = 150_000;
const SATURATION_LOOKBACK_MINUTES = 5;
const SATURATION_HEARTBEAT_THRESHOLD = 3;

function parseBooleanEnv(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y";
}

function getExpectedHostCount(env: NodeJS.ProcessEnv = process.env) {
  const singleHostAccepted = parseBooleanEnv(env.VOICE_SINGLE_HOST_ACCEPTED);
  const configuredHostIds = (env.VOICE_EXPECTED_HOST_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredHostIds.length > 0) {
    return new Set(configuredHostIds).size;
  }

  const configuredCount = Number.parseInt((env.VOICE_EXPECTED_HOST_COUNT || "").trim(), 10);
  if (Number.isInteger(configuredCount) && configuredCount > 0) return configuredCount;

  if (singleHostAccepted) return 1;
  return DEFAULT_EXPECTED_HOST_COUNT;
}

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

function readCapacityState(summary: Record<string, unknown> | null): VoiceWorkerSnapshot["capacityState"] {
  const capacity = summary && typeof summary.capacity === "object" && summary.capacity
    ? (summary.capacity as Record<string, unknown>)
    : null;
  return capacity?.capacityState === "available" || capacity?.capacityState === "at_capacity"
    ? capacity.capacityState
    : "unknown";
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
  const summary = readSummary(record.summary);
  const capacityState = readCapacityState(summary);

  if (capacityState === "at_capacity") {
    warnings.push(
      "Worker is at configured call capacity.",
    );
  } else if (!record.ready) {
    warnings.push("Worker reported itself as not ready.");
  }
  if (ageMs > UNHEALTHY_HEARTBEAT_AGE_MS) {
    warnings.push(`Heartbeat is stale (${Math.round(ageMs / 1000)}s old).`);
  } else if (ageMs > DEGRADED_HEARTBEAT_AGE_MS) {
    warnings.push(`Heartbeat is aging (${Math.round(ageMs / 1000)}s old).`);
  }

  const status: RuntimeStatus =
    ageMs > UNHEALTHY_HEARTBEAT_AGE_MS || (!record.ready && capacityState !== "at_capacity")
      ? "unhealthy"
      : capacityState === "at_capacity" || ageMs > DEGRADED_HEARTBEAT_AGE_MS
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
    capacityState,
    summary,
    heartbeatAt: record.heartbeatAt.toISOString(),
    ageMs,
    status,
    warnings,
  } satisfies VoiceWorkerSnapshot;
}

function workerSupportsSurface(worker: VoiceWorkerSnapshot, surface: VoiceSurface) {
  return worker.surfaceSet.includes(surface);
}

function buildSurfaceHealth(
  surface: VoiceSurface,
  workers: VoiceWorkerSnapshot[],
  expectedHostCount: number,
): VoiceSurfaceHealth {
  const relevantWorkers = workers.filter((worker) => workerSupportsSurface(worker, surface));
  const availableWorkers = relevantWorkers.filter(
    (worker) => worker.status !== "unhealthy" && worker.capacityState !== "at_capacity",
  );
  const availableHosts = new Set(availableWorkers.map((worker) => worker.hostId));
  const atCapacityHosts = new Set(
    relevantWorkers
      .filter((worker) => worker.capacityState === "at_capacity")
      .map((worker) => worker.hostId),
  );
  const warnings: string[] = [];
  const allWorkersUnavailableOnlyFromCapacity =
    relevantWorkers.length > 0 &&
    availableWorkers.length === 0 &&
    atCapacityHosts.size > 0 &&
    relevantWorkers.every((worker) => worker.status !== "unhealthy");

  if (relevantWorkers.length === 0) {
    warnings.push("No worker heartbeat has registered support for this surface.");
  } else if (allWorkersUnavailableOnlyFromCapacity) {
    warnings.push("All routable workers for this surface are at configured call capacity.");
  } else if (availableHosts.size < expectedHostCount) {
    warnings.push(`Only ${availableHosts.size}/${expectedHostCount} expected host(s) are currently routable.`);
  }

  const status: RuntimeStatus =
    relevantWorkers.length === 0 || relevantWorkers.every((worker) => worker.status === "unhealthy")
      ? "unhealthy"
      : allWorkersUnavailableOnlyFromCapacity ||
        availableHosts.size < expectedHostCount ||
        relevantWorkers.some((worker) => worker.status === "degraded")
        ? "degraded"
        : "healthy";

  const summary =
    status === "healthy"
      ? `${surface} has healthy workers on ${availableHosts.size} host(s)`
      : warnings[0] || `${surface} worker capacity is degraded`;

  return {
    surface,
    status,
    summary,
    warnings,
    supportingHosts: Array.from(availableHosts),
    atCapacityHosts: Array.from(atCapacityHosts),
    expectedHostCount,
    capacityExhausted: allWorkersUnavailableOnlyFromCapacity,
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
  const expectedHostCount = getExpectedHostCount();

  const surfaces = Object.fromEntries(
    VOICE_SURFACES.map((surface) => [surface, buildSurfaceHealth(surface, workers, expectedHostCount)]),
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
  if (hosts.length < expectedHostCount) {
    warnings.push(`Only ${hosts.length}/${expectedHostCount} voice host(s) have reported in recently.`);
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

export async function getVoiceSurfaceSaturationHealth(surface: VoiceSurface): Promise<VoiceSurfaceSaturationHealth> {
  const expectedHostCount = getExpectedHostCount();
  if (surface !== "normal") {
    return {
      surface,
      status: "healthy",
      summary: `${surface} saturation monitoring is not enabled`,
      warnings: [],
      lookbackMinutes: SATURATION_LOOKBACK_MINUTES,
      sustainedHeartbeatThreshold: SATURATION_HEARTBEAT_THRESHOLD,
      sustainedHosts: [],
      hostCounts: {},
    };
  }

  const since = new Date(Date.now() - SATURATION_LOOKBACK_MINUTES * 60_000);
  const records = await db.voiceWorkerHeartbeat.findMany({
    where: {
      heartbeatAt: { gte: since },
      workerRole: "tracey-customer-agent",
    },
    orderBy: [{ heartbeatAt: "desc" }, { createdAt: "desc" }],
  });

  const hostCounts: Record<string, number> = {};
  const seenHost = new Set<string>();

  for (const record of records) {
    if (seenHost.has(record.hostId)) continue;
    const summary = readSummary(record.summary);
    const capacityState = readCapacityState(summary);
    if (capacityState !== "at_capacity") {
      seenHost.add(record.hostId);
      hostCounts[record.hostId] = hostCounts[record.hostId] || 0;
      continue;
    }

    hostCounts[record.hostId] = (hostCounts[record.hostId] || 0) + 1;
    if (hostCounts[record.hostId] >= SATURATION_HEARTBEAT_THRESHOLD) {
      seenHost.add(record.hostId);
    }
  }

  const sustainedHosts = Object.entries(hostCounts)
    .filter(([, count]) => count >= SATURATION_HEARTBEAT_THRESHOLD)
    .map(([hostId]) => hostId);
  const warnings: string[] = [];

  if (sustainedHosts.length >= expectedHostCount) {
    warnings.push(
      `Customer workers have stayed at configured call capacity across ${sustainedHosts.length}/${expectedHostCount} hosts for at least ${SATURATION_HEARTBEAT_THRESHOLD} heartbeats.`,
    );
  }

  return {
    surface,
    status: sustainedHosts.length >= expectedHostCount ? "degraded" : "healthy",
    summary:
      sustainedHosts.length >= expectedHostCount
        ? warnings[0]
        : "Customer voice workers are not showing sustained fleet-wide saturation",
    warnings,
    lookbackMinutes: SATURATION_LOOKBACK_MINUTES,
    sustainedHeartbeatThreshold: SATURATION_HEARTBEAT_THRESHOLD,
    sustainedHosts,
    hostCounts,
  };
}

export function isVoiceSurfaceRoutable(fleet: VoiceFleetHealth, surface: VoiceSurface) {
  const state = fleet.surfaces[surface];
  return state.status !== "unhealthy" && !state.capacityExhausted;
}
