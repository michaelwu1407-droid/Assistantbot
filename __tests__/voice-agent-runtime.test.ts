import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getLatestVoiceWorkerSnapshots,
  getVoiceFleetHealth,
} = vi.hoisted(() => ({
  getLatestVoiceWorkerSnapshots: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
}));

const {
  findFirstHeartbeat,
  findFirstLegacyHeartbeat,
} = vi.hoisted(() => ({
  findFirstHeartbeat: vi.fn(),
  findFirstLegacyHeartbeat: vi.fn(),
}));

vi.mock("@/lib/voice-fleet", () => ({
  getLatestVoiceWorkerSnapshots,
  getVoiceFleetHealth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    voiceWorkerHeartbeat: {
      findFirst: findFirstHeartbeat,
    },
    webhookEvent: {
      findFirst: findFirstLegacyHeartbeat,
    },
  },
}));

import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";

const originalEnv = { ...process.env };

function createFleetHealth() {
  return {
    status: "healthy" as const,
    summary: "fleet ready",
    warnings: [],
    checkedAt: new Date().toISOString(),
    latestHeartbeatAt: new Date().toISOString(),
    hosts: [],
    surfaces: {
      demo: {
        surface: "demo" as const,
        status: "healthy" as const,
        summary: "demo ready",
        warnings: [],
        supportingHosts: ["voice-host-a"],
        atCapacityHosts: [],
        expectedHostCount: 1,
        capacityExhausted: false,
        workers: [],
      },
      inbound_demo: {
        surface: "inbound_demo" as const,
        status: "healthy" as const,
        summary: "inbound ready",
        warnings: [],
        supportingHosts: ["voice-host-a"],
        atCapacityHosts: [],
        expectedHostCount: 1,
        capacityExhausted: false,
        workers: [],
      },
      normal: {
        surface: "normal" as const,
        status: "healthy" as const,
        summary: "normal ready",
        warnings: [],
        supportingHosts: ["voice-host-a"],
        atCapacityHosts: [],
        expectedHostCount: 1,
        capacityExhausted: false,
        workers: [],
      },
    },
  };
}

describe("getVoiceAgentRuntimeDrift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      LIVEKIT_URL: "wss://livekit.example.com",
      LIVEKIT_API_KEY: "livekit-key",
      LIVEKIT_API_SECRET: "livekit-secret",
      CARTESIA_API_KEY: "cartesia-key",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
    };

    findFirstHeartbeat.mockResolvedValue({
      heartbeatAt: new Date(),
      createdAt: new Date(),
      hostId: "voice-host-a",
      workerRole: "tracey-sales-agent",
      surfaceSet: ["demo", "inbound_demo"],
      deployGitSha: "sha",
      runtimeFingerprint: "va_different",
      summary: null,
    });
    findFirstLegacyHeartbeat.mockResolvedValue(null);
    getLatestVoiceWorkerSnapshots.mockResolvedValue([
      {
        hostId: "voice-host-a",
        workerRole: "tracey-sales-agent",
        surfaceSet: ["demo", "inbound_demo"],
        deployGitSha: "sha",
        runtimeFingerprint: "va_different",
        ready: true,
        activeCalls: 0,
        capacityState: "available",
        summary: null,
        heartbeatAt: new Date().toISOString(),
        ageMs: 1_000,
        status: "healthy",
        warnings: [],
      },
    ]);
    getVoiceFleetHealth.mockResolvedValue(createFleetHealth());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("treats a runtime fingerprint mismatch as degraded when the fleet is healthy", async () => {
    const drift = await getVoiceAgentRuntimeDrift();

    expect(drift.status).toBe("degraded");
    expect(drift.warnings).toContain("LiveKit worker runtime fingerprint does not match the app's expected production env.");
  });
});
