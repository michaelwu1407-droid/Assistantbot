import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  isEarlymarkInboundRoomName: vi.fn(),
  getVoiceWorkerHealthPath: vi.fn(),
  getVoiceWorkerHealthStaleMs: vi.fn(),
  resolveWorkerHttpHost: vi.fn(),
  resolveWorkerHttpPort: vi.fn(),
  getActiveCallCount: vi.fn(),
  getMaxConcurrentCalls: vi.fn(),
  isWorkerAcceptingCalls: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    readFileSync: mocks.readFileSync,
  },
  readFileSync: mocks.readFileSync,
}));

vi.mock("@/livekit-agent/room-routing", () => ({
  isEarlymarkInboundRoomName: mocks.isEarlymarkInboundRoomName,
}));

vi.mock("@/livekit-agent/runtime-config", () => ({
  getVoiceWorkerHealthPath: mocks.getVoiceWorkerHealthPath,
  getVoiceWorkerHealthStaleMs: mocks.getVoiceWorkerHealthStaleMs,
  resolveWorkerHttpHost: mocks.resolveWorkerHttpHost,
  resolveWorkerHttpPort: mocks.resolveWorkerHttpPort,
}));

vi.mock("@/livekit-agent/runtime-state", () => ({
  getActiveCallCount: mocks.getActiveCallCount,
  getMaxConcurrentCalls: mocks.getMaxConcurrentCalls,
  isWorkerAcceptingCalls: mocks.isWorkerAcceptingCalls,
}));

vi.mock("@livekit/agents", () => ({
  WorkerOptions: class {},
  cli: { runApp: vi.fn() },
}));

import { buildRequestFunc } from "@/livekit-agent/worker-entry";

describe("buildRequestFunc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVoiceWorkerHealthPath.mockReturnValue("/tmp/voice-worker-health.json");
    mocks.getVoiceWorkerHealthStaleMs.mockReturnValue(180_000);
    mocks.resolveWorkerHttpHost.mockReturnValue("127.0.0.1");
    mocks.resolveWorkerHttpPort.mockReturnValue(8081);
    mocks.isEarlymarkInboundRoomName.mockReturnValue(false);
    mocks.isWorkerAcceptingCalls.mockReturnValue(false);
    mocks.getActiveCallCount.mockReturnValue(0);
    mocks.getMaxConcurrentCalls.mockReturnValue(1);
  });

  it("accepts matching work when the child worker snapshot says it is ready", async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    const reject = vi.fn().mockResolvedValue(undefined);
    mocks.isEarlymarkInboundRoomName.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        acceptingNewCalls: true,
        activeCalls: 0,
        maxConcurrentCalls: 1,
      }),
    );

    const requestFunc = buildRequestFunc(["inbound_demo"]);
    await requestFunc({
      room: { name: "earlymark-inbound-_+61434955958_probe" },
      publisher: { attributes: {} },
      accept,
      reject,
    } as never);

    expect(accept).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });

  it("rejects matching work when the child worker snapshot says it is unavailable", async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    const reject = vi.fn().mockResolvedValue(undefined);
    mocks.isEarlymarkInboundRoomName.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        acceptingNewCalls: false,
        activeCalls: 1,
        maxConcurrentCalls: 1,
      }),
    );

    const requestFunc = buildRequestFunc(["inbound_demo"]);
    await requestFunc({
      room: { name: "earlymark-inbound-_+61434955958_probe" },
      publisher: { attributes: {} },
      accept,
      reject,
    } as never);

    expect(accept).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalledTimes(1);
  });

  it("falls back to in-memory readiness when no fresh worker snapshot exists", async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    const reject = vi.fn().mockResolvedValue(undefined);
    mocks.readFileSync.mockImplementation(() => {
      throw new Error("missing");
    });
    mocks.isWorkerAcceptingCalls.mockReturnValue(true);

    const requestFunc = buildRequestFunc(["normal"]);
    await requestFunc({
      room: { name: "workspace-room" },
      publisher: { attributes: {} },
      accept,
      reject,
    } as never);

    expect(accept).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
  });
});
