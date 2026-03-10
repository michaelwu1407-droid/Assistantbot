type CapacityState = "available" | "at_capacity";

type WorkerRuntimeState = {
  bootReady: boolean;
  activeCalls: number;
};

const runtimeState: WorkerRuntimeState = {
  bootReady: false,
  activeCalls: 0,
};

function getConfiguredWorkerRole() {
  return (process.env.VOICE_WORKER_ROLE || "").trim();
}

export function getMaxConcurrentCalls(workerRole = getConfiguredWorkerRole()) {
  const explicit = Number(process.env.VOICE_MAX_ACTIVE_CALLS || "");
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, Math.trunc(explicit));
  }

  const roleSpecific = workerRole === "tracey-sales-agent"
    ? Number(process.env.VOICE_MAX_ACTIVE_CALLS_SALES || "")
    : workerRole === "tracey-customer-agent"
      ? Number(process.env.VOICE_MAX_ACTIVE_CALLS_CUSTOMER || "")
      : Number.NaN;

  if (Number.isFinite(roleSpecific) && roleSpecific > 0) {
    return Math.max(1, Math.trunc(roleSpecific));
  }

  return workerRole === "tracey-customer-agent" ? 6 : 1;
}

export function setWorkerBootReady(ready: boolean) {
  runtimeState.bootReady = ready;
}

export function markCallStarted() {
  runtimeState.activeCalls += 1;
}

export function markCallEnded() {
  runtimeState.activeCalls = Math.max(0, runtimeState.activeCalls - 1);
}

export function getActiveCallCount() {
  return runtimeState.activeCalls;
}

export function isWorkerAcceptingCalls() {
  return runtimeState.bootReady && runtimeState.activeCalls < getMaxConcurrentCalls();
}

export function getCapacityState(): CapacityState {
  return runtimeState.activeCalls >= getMaxConcurrentCalls() ? "at_capacity" : "available";
}

export function buildCapacitySummary() {
  return {
    bootReady: runtimeState.bootReady,
    activeCalls: runtimeState.activeCalls,
    maxConcurrentCalls: getMaxConcurrentCalls(),
    acceptingNewCalls: isWorkerAcceptingCalls(),
    capacityState: getCapacityState(),
  };
}
