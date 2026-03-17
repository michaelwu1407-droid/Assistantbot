import type { RuntimeStatus, VoiceFleetHealth } from "@/lib/voice-fleet";

export type AppReleaseInfo = {
  runtime: "web";
  gitSha: string | null;
  shortGitSha: string | null;
  deploymentId: string | null;
  provider: "vercel" | "env" | "unknown";
  nodeEnv: string | null;
};

export type WorkerReleaseHostTruth = {
  hostId: string;
  status: RuntimeStatus;
  summary: string;
  workerRoles: string[];
  deployGitShas: string[];
  allWorkersHealthy: boolean;
  allWorkersAligned: boolean;
  warnings: string[];
};

export type WorkerReleaseTruth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  expectedWorkerSha: string | null;
  scopedHostId: string | null;
  liveDeployGitShas: string[];
  alignedHostIds: string[];
  mismatchedHostIds: string[];
  hosts: WorkerReleaseHostTruth[];
};

function trimOrNull(value?: string | null) {
  const trimmed = (value || "").trim();
  return trimmed || null;
}

function shortSha(value: string | null) {
  return value ? value.slice(0, 8) : null;
}

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

export function getCurrentAppReleaseInfo(env: NodeJS.ProcessEnv = process.env): AppReleaseInfo {
  const gitSha =
    trimOrNull(env.VERCEL_GIT_COMMIT_SHA) ||
    trimOrNull(env.DEPLOY_GIT_SHA) ||
    trimOrNull(env.GITHUB_SHA) ||
    trimOrNull(env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
  const deploymentId =
    trimOrNull(env.VERCEL_DEPLOYMENT_ID) ||
    trimOrNull(env.DEPLOYMENT_ID);
  const provider: AppReleaseInfo["provider"] =
    env.VERCEL === "1" || deploymentId
      ? "vercel"
      : gitSha
        ? "env"
        : "unknown";

  return {
    runtime: "web",
    gitSha,
    shortGitSha: shortSha(gitSha),
    deploymentId,
    provider,
    nodeEnv: trimOrNull(env.NODE_ENV),
  };
}

export function buildWorkerReleaseTruth(
  fleet: VoiceFleetHealth,
  options?: {
    expectedWorkerSha?: string | null;
    hostId?: string | null;
  },
): WorkerReleaseTruth {
  const expectedWorkerSha = trimOrNull(options?.expectedWorkerSha || null);
  const scopedHostId = trimOrNull(options?.hostId || null);
  const relevantHosts = scopedHostId
    ? fleet.hosts.filter((host) => host.hostId === scopedHostId)
    : fleet.hosts;

  if (relevantHosts.length === 0) {
    return {
      status: "unhealthy",
      summary: scopedHostId
        ? `No voice worker heartbeat is available for host ${scopedHostId}.`
        : "No voice worker heartbeats are available for release verification.",
      warnings: ["Voice workers have not reported a releasable deploy SHA yet."],
      expectedWorkerSha,
      scopedHostId,
      liveDeployGitShas: [],
      alignedHostIds: [],
      mismatchedHostIds: scopedHostId ? [scopedHostId] : [],
      hosts: [],
    };
  }

  const hosts = relevantHosts.map<WorkerReleaseHostTruth>((host) => {
    const deployGitShas = Array.from(
      new Set(
        host.workers
          .map((worker) => trimOrNull(worker.deployGitSha))
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const warnings: string[] = [];
    const workerRoles = Array.from(new Set(host.workers.map((worker) => worker.workerRole)));
    const allWorkersHealthy = host.workers.length > 0 && host.workers.every((worker) => worker.status === "healthy");
    const allWorkersAligned =
      !expectedWorkerSha ||
      (host.workers.length > 0 &&
        host.workers.every((worker) => trimOrNull(worker.deployGitSha) === expectedWorkerSha));

    if (host.workers.some((worker) => !trimOrNull(worker.deployGitSha))) {
      warnings.push("At least one worker on this host is missing a deploy SHA.");
    }
    if (!allWorkersHealthy) {
      warnings.push("At least one worker on this host is not healthy.");
    }
    if (expectedWorkerSha && !allWorkersAligned) {
      warnings.push(`At least one worker on this host is not running expected SHA ${expectedWorkerSha}.`);
    }
    if (!expectedWorkerSha && deployGitShas.length > 1) {
      warnings.push("Workers on this host are reporting multiple live deploy SHAs.");
    }

    const status: RuntimeStatus =
      expectedWorkerSha && !allWorkersAligned
        ? "unhealthy"
        : !allWorkersHealthy
          ? "degraded"
          : deployGitShas.length > 1
            ? "degraded"
            : "healthy";

    return {
      hostId: host.hostId,
      status,
      summary:
        status === "healthy"
          ? `Host ${host.hostId} is on a consistent healthy worker release.`
          : warnings[0] || `Host ${host.hostId} is not on a stable worker release.`,
      workerRoles,
      deployGitShas,
      allWorkersHealthy,
      allWorkersAligned,
      warnings,
    };
  });

  const liveDeployGitShas = Array.from(new Set(hosts.flatMap((host) => host.deployGitShas)));
  const alignedHostIds = hosts.filter((host) => host.allWorkersAligned).map((host) => host.hostId);
  const mismatchedHostIds = hosts.filter((host) => !host.allWorkersAligned).map((host) => host.hostId);
  const overallStatus = hosts.reduce<RuntimeStatus>((current, host) => maxStatus(current, host.status), "healthy");
  const warnings = Array.from(new Set(hosts.flatMap((host) => host.warnings)));

  return {
    status: overallStatus,
    summary:
      overallStatus === "healthy"
        ? expectedWorkerSha
          ? `All scoped workers are running expected SHA ${expectedWorkerSha}.`
          : "All scoped workers report a consistent healthy live release."
        : warnings[0] || "Worker release verification is degraded.",
    warnings,
    expectedWorkerSha,
    scopedHostId,
    liveDeployGitShas,
    alignedHostIds,
    mismatchedHostIds,
    hosts,
  };
}
