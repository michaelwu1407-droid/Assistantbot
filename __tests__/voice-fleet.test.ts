import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    voiceWorkerHeartbeat: {
      findMany,
    },
  },
}));

import { getVoiceFleetHealth } from "@/lib/voice-fleet";

const originalEnv = { ...process.env };

function createHeartbeatRecord(workerRole: string) {
  return {
    hostId: "voice-host-a",
    workerRole,
    surfaceSet: workerRole === "tracey-sales-agent" ? ["demo", "inbound_demo"] : ["normal"],
    deployGitSha: "sha",
    runtimeFingerprint: "va_test",
    ready: true,
    activeCalls: 0,
    summary: {
      capacity: {
        capacityState: "available",
      },
    },
    heartbeatAt: new Date(),
    createdAt: new Date(),
  };
}

describe("getVoiceFleetHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    findMany.mockResolvedValue([
      createHeartbeatRecord("tracey-sales-agent"),
      createHeartbeatRecord("tracey-customer-agent"),
    ]);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("treats a single configured host as degraded by default until a second host exists", async () => {
    const fleet = await getVoiceFleetHealth();

    expect(fleet.status).toBe("degraded");
    expect(fleet.hosts).toHaveLength(1);
    expect(fleet.surfaces.demo.expectedHostCount).toBe(2);
    expect(fleet.warnings).toContain("Only 1/2 voice host(s) have reported in recently.");
  });

  it("degrades when two hosts are explicitly expected", async () => {
    process.env.VOICE_EXPECTED_HOST_COUNT = "2";

    const fleet = await getVoiceFleetHealth();

    expect(fleet.status).toBe("degraded");
    expect(fleet.surfaces.demo.expectedHostCount).toBe(2);
    expect(fleet.warnings).toContain("Only 1/2 voice host(s) have reported in recently.");
  });
});
