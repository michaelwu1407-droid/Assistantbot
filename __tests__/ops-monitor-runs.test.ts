import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    opsMonitorRun: {
      findUnique,
    },
  },
}));

import { getMonitorRunHealth } from "@/lib/ops-monitor-runs";

describe("getMonitorRunHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T06:30:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns degraded when the latest monitor run is fresh but reported degraded", async () => {
    findUnique.mockResolvedValue({
      monitorKey: "voice-agent-health",
      status: "degraded",
      summary: "Voice health reported degraded",
      details: null,
      checkedAt: new Date("2026-03-13T06:29:30.000Z"),
      lastSuccessAt: new Date("2026-03-13T06:29:30.000Z"),
      lastFailureAt: null,
    });

    const result = await getMonitorRunHealth("voice-agent-health", 7 * 60_000);

    expect(result.status).toBe("degraded");
    expect(result.summary).toBe("voice-agent-health is reporting on schedule but last reported degraded");
    expect(result.warnings).toContain("voice-agent-health last completed on schedule but reported status degraded.");
  });

  it("returns unhealthy when the latest monitor run is fresh but reported unhealthy", async () => {
    findUnique.mockResolvedValue({
      monitorKey: "voice-agent-health",
      status: "unhealthy",
      summary: "Voice health reported unhealthy",
      details: null,
      checkedAt: new Date("2026-03-13T06:29:40.000Z"),
      lastSuccessAt: new Date("2026-03-13T06:29:40.000Z"),
      lastFailureAt: new Date("2026-03-13T06:29:40.000Z"),
    });

    const result = await getMonitorRunHealth("voice-agent-health", 7 * 60_000);

    expect(result.status).toBe("unhealthy");
    expect(result.summary).toBe("voice-agent-health is reporting on schedule but last reported unhealthy");
    expect(result.warnings).toContain("voice-agent-health last completed on schedule but reported status unhealthy.");
  });
});
