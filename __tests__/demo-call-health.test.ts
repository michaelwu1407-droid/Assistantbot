import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  findMany: vi.fn(),
  isDatabaseConfigured: true,
}));

vi.mock("@/lib/db", () => ({
  db: {
    demoLead: {
      findMany: hoisted.findMany,
    },
  },
  get isDatabaseConfigured() {
    return hoisted.isDatabaseConfigured;
  },
}));

import { getDemoCallHealth } from "@/lib/demo-call-health";

describe("getDemoCallHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T10:30:00.000Z"));
    vi.clearAllMocks();
    hoisted.isDatabaseConfigured = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports unhealthy when recent system failures have no matching successes", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        id: "lead_2",
        source: "homepage_form",
        callStatus: "FAILED",
        callError: "LiveKit unreachable",
        createdAt: new Date("2026-04-28T10:28:00.000Z"),
        updatedAt: new Date("2026-04-28T10:28:10.000Z"),
      },
      {
        id: "lead_1",
        source: "contact_form",
        callStatus: "FAILED",
        callError: "No valid LiveKit outbound SIP trunk could be resolved for demo calls.",
        createdAt: new Date("2026-04-28T10:20:00.000Z"),
        updatedAt: new Date("2026-04-28T10:20:05.000Z"),
      },
    ]);

    const result = await getDemoCallHealth({ lookbackMinutes: 180 });

    expect(result.status).toBe("unhealthy");
    expect(result.systemFailures).toBe(2);
    expect(result.initiatedAttempts).toBe(0);
    expect(result.summary).toMatch(/failed and none succeeded/i);
    expect(result.recentFailures).toHaveLength(2);
  });

  it("reports degraded when recent system failures are mixed with successes", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        id: "lead_3",
        source: "homepage_form",
        callStatus: "FAILED",
        callError: "LiveKit unreachable",
        createdAt: new Date("2026-04-28T10:28:00.000Z"),
        updatedAt: new Date("2026-04-28T10:28:10.000Z"),
      },
      {
        id: "lead_2",
        source: "homepage_form",
        callStatus: "INITIATED",
        callError: null,
        createdAt: new Date("2026-04-28T10:25:00.000Z"),
        updatedAt: new Date("2026-04-28T10:25:02.000Z"),
      },
    ]);

    const result = await getDemoCallHealth({ lookbackMinutes: 180 });

    expect(result.status).toBe("degraded");
    expect(result.systemFailures).toBe(1);
    expect(result.initiatedAttempts).toBe(1);
    expect(result.summary).toMatch(/failed, but at least one succeeded/i);
  });

  it("does not count validation-only failures as system outages", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        id: "lead_1",
        source: "homepage_form",
        callStatus: "FAILED",
        callError: "Phone number 12345 is not a valid international number. Include country code (e.g. +61 for Australia).",
        createdAt: new Date("2026-04-28T10:20:00.000Z"),
        updatedAt: new Date("2026-04-28T10:20:02.000Z"),
      },
    ]);

    const result = await getDemoCallHealth({ lookbackMinutes: 180 });

    expect(result.status).toBe("healthy");
    expect(result.validationFailures).toBe(1);
    expect(result.systemFailures).toBe(0);
    expect(result.summary).toMatch(/invalid phone input/i);
  });
});
