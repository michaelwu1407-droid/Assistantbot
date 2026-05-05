import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startWorkerBackgroundLoops } from "@/livekit-agent/background-tasks";

describe("startWorkerBackgroundLoops", () => {
  const originalSetInterval = global.setInterval;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.setInterval = originalSetInterval;
  });

  it("keeps the heartbeat interval referenced while allowing the grounding refresh timer to unref", async () => {
    const timers = [
      { unref: vi.fn() },
      { unref: vi.fn() },
    ] as unknown as ReturnType<typeof setInterval>[];
    const callbacks: Array<() => void> = [];
    const setIntervalMock = vi.fn((callback: () => void) => {
      callbacks.push(callback);
      return timers.shift()!;
    });
    global.setInterval = setIntervalMock as unknown as typeof setInterval;

    const setWorkerBootReady = vi.fn();
    const writeWorkerHealthSnapshot = vi.fn().mockResolvedValue(undefined);
    const refreshVoiceGroundingIndex = vi.fn().mockResolvedValue(undefined);
    const postVoiceAgentStatus = vi.fn().mockResolvedValue(undefined);

    const result = startWorkerBackgroundLoops({
      logPrefix: "[test]",
      setWorkerBootReady,
      writeWorkerHealthSnapshot,
      refreshVoiceGroundingIndex,
      postVoiceAgentStatus,
      voiceGroundingCacheTtlMs: 300_000,
      voiceAgentHeartbeatMs: 60_000,
    });

    await Promise.resolve();

    expect(setWorkerBootReady).toHaveBeenCalledWith(true);
    expect(writeWorkerHealthSnapshot).toHaveBeenCalledTimes(1);
    expect(refreshVoiceGroundingIndex).toHaveBeenCalledWith(true);
    expect(postVoiceAgentStatus).toHaveBeenCalledTimes(1);
    expect(setIntervalMock).toHaveBeenNthCalledWith(1, expect.any(Function), 300_000);
    expect(setIntervalMock).toHaveBeenNthCalledWith(2, expect.any(Function), 60_000);
    expect((result.groundingRefreshTimer as { unref?: () => void }).unref).toHaveBeenCalledTimes(1);
    expect((result.heartbeatTimer as { unref?: () => void }).unref).not.toHaveBeenCalled();

    callbacks[0]?.();
    callbacks[1]?.();
    await Promise.resolve();

    expect(refreshVoiceGroundingIndex).toHaveBeenCalledTimes(2);
    expect(postVoiceAgentStatus).toHaveBeenCalledTimes(2);
  });
});
