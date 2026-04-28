type BackgroundTaskOptions = {
  logPrefix?: string;
  setWorkerBootReady: (ready: boolean) => void;
  writeWorkerHealthSnapshot: () => Promise<void>;
  refreshVoiceGroundingIndex: (force?: boolean) => Promise<void>;
  postVoiceAgentStatus: () => Promise<void>;
  voiceGroundingCacheTtlMs: number;
  voiceAgentHeartbeatMs: number;
};

export function startWorkerBackgroundLoops({
  logPrefix = "[agent]",
  setWorkerBootReady,
  writeWorkerHealthSnapshot,
  refreshVoiceGroundingIndex,
  postVoiceAgentStatus,
  voiceGroundingCacheTtlMs,
  voiceAgentHeartbeatMs,
}: BackgroundTaskOptions) {
  setWorkerBootReady(true);

  void writeWorkerHealthSnapshot().catch((error) => {
    console.warn(`${logPrefix} Failed to write initial worker health snapshot:`, error);
  });

  void refreshVoiceGroundingIndex(true).catch((error) => {
    console.warn(`${logPrefix} Initial voice grounding cache warm failed:`, error);
  });

  const groundingRefreshTimer = setInterval(() => {
    void refreshVoiceGroundingIndex(true).catch((error) => {
      console.warn(`${logPrefix} Voice grounding cache refresh failed:`, error);
    });
  }, voiceGroundingCacheTtlMs);
  groundingRefreshTimer.unref?.();

  void postVoiceAgentStatus().catch((error) => {
    console.error(`${logPrefix} Failed to post worker-status heartbeat:`, error);
  });

  const heartbeatTimer = setInterval(() => {
    void postVoiceAgentStatus().catch((error) => {
      console.error(`${logPrefix} Failed to post worker-status heartbeat:`, error);
    });
  }, voiceAgentHeartbeatMs);

  // Keep the Node event loop pinned so heartbeats continue even when the LiveKit
  // worker is otherwise idle between calls. If this timer is unref'd, the worker
  // can look healthy at boot and then silently stop refreshing its heartbeat.

  return {
    groundingRefreshTimer,
    heartbeatTimer,
  };
}
