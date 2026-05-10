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

import { getExpectedVoiceAgentRuntimeFingerprint, getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";

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
      LIVEKIT_URL: "https://live.earlymark.ai",
      LIVEKIT_API_KEY: "livekit-key",
      LIVEKIT_API_SECRET: "livekit-secret",
      CARTESIA_API_KEY: "cartesia-key",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
    };

    const salesFingerprint = getExpectedVoiceAgentRuntimeFingerprint({
      ...process.env,
      LIVEKIT_URL: "http://localhost:7880",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-sales-agent",
      VOICE_WORKER_SURFACES: "demo,inbound_demo",
    } as NodeJS.ProcessEnv);

    findFirstHeartbeat.mockResolvedValue({
      heartbeatAt: new Date(),
      createdAt: new Date(),
      hostId: "voice-host-a",
      workerRole: "tracey-sales-agent",
      surfaceSet: ["demo", "inbound_demo"],
      deployGitSha: "sha",
      runtimeFingerprint: salesFingerprint,
      summary: null,
    });
    findFirstLegacyHeartbeat.mockResolvedValue(null);
    getLatestVoiceWorkerSnapshots.mockResolvedValue([
      {
        hostId: "voice-host-a",
        workerRole: "tracey-sales-agent",
        surfaceSet: ["demo", "inbound_demo"],
        deployGitSha: "sha",
        runtimeFingerprint: salesFingerprint,
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

  it("treats a worker-scoped fingerprint match as healthy when the fleet is healthy", async () => {
    const drift = await getVoiceAgentRuntimeDrift();

    expect(drift.status).toBe("healthy");
    expect(drift.warnings).toEqual([]);
  });

  it("treats a runtime fingerprint mismatch as degraded when a worker drifts", async () => {
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

    const drift = await getVoiceAgentRuntimeDrift();

    expect(drift.status).toBe("degraded");
    expect(drift.warnings).toContain("LiveKit worker runtime fingerprint does not match the app's expected production env.");
  });

  it("accepts equivalent legacy fingerprints that only differ by canonical URL forms", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.earlymark.ai";
    process.env.APP_URL = "https://www.earlymark.ai";
    process.env.LIVEKIT_URL = "https://live.earlymark.ai";

    const legacyEquivalentFingerprint = getExpectedVoiceAgentRuntimeFingerprint({
      ...process.env,
      LIVEKIT_URL: "https://live.earlymark.ai",
      NEXT_PUBLIC_APP_URL: "https://earlymark.ai",
      APP_URL: "https://earlymark.ai",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-sales-agent",
      VOICE_WORKER_SURFACES: "demo,inbound_demo",
    } as NodeJS.ProcessEnv);

    getLatestVoiceWorkerSnapshots.mockResolvedValue([
      {
        hostId: "voice-host-a",
        workerRole: "tracey-sales-agent",
        surfaceSet: ["demo", "inbound_demo"],
        deployGitSha: "sha",
        runtimeFingerprint: legacyEquivalentFingerprint,
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

    const drift = await getVoiceAgentRuntimeDrift();

    expect(drift.status).toBe("healthy");
    expect(drift.warnings).toEqual([]);
  });

  it("accepts a legacy runtime fingerprint when the worker summary reconstructs the current expected config", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.earlymark.ai";
    process.env.APP_URL = "https://www.earlymark.ai";
    process.env.LIVEKIT_URL = "https://live.earlymark.ai";
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER = "+61485010634";
    process.env.EARLYMARK_INBOUND_PHONE_NUMBERS = "+61485010634";

    getLatestVoiceWorkerSnapshots.mockResolvedValue([
      {
        hostId: "voice-host-a",
        workerRole: "tracey-sales-agent",
        surfaceSet: ["demo", "inbound_demo"],
        deployGitSha: "sha",
        runtimeFingerprint: "va_ca9bc5aa",
        ready: true,
        activeCalls: 0,
        capacityState: "available",
        summary: {
          capacity: { maxConcurrentCalls: 1 },
          llmProvider: {
            earlymarkPrimary: "groq",
            customerPrimary: "groq",
          },
          llmModel: {
            earlymarkPrimary: "llama-3.3-70b-versatile",
            earlymarkFallback: "meta-llama/Meta-Llama-3.1-8B-Instruct",
            customerPrimary: "llama-3.3-70b-versatile",
            customerFallback: "meta-llama/Meta-Llama-3.1-8B-Instruct",
          },
          sttModel: "nova-3",
          ttsModel: "sonic-3",
          ttsVoiceId: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
          ttsLanguage: "en-AU",
          latencyEnabled: "true",
          openerBankEnabled: "true",
          guardEnabled: "true",
          targetCallTypes: "demo,inbound_demo,normal",
          speculativeHeadsEnabled: "true",
          speculativeHeadSurfaces: "demo,inbound_demo",
          knownInboundNumbers: ["+61485010634"],
          livekitSip: { livekitUrl: "http://127.0.0.1:7880" },
        },
        heartbeatAt: new Date().toISOString(),
        ageMs: 1_000,
        status: "healthy",
        warnings: [],
      },
    ]);

    const drift = await getVoiceAgentRuntimeDrift();

    expect(drift.status).toBe("healthy");
    expect(drift.warnings).toEqual([]);
  });
});
