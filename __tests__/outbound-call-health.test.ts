import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  findMany: vi.fn(),
  isDatabaseConfigured: true,
}));

vi.mock("@/lib/db", () => ({
  db: {
    actionExecution: {
      findMany: hoisted.findMany,
    },
  },
  get isDatabaseConfigured() {
    return hoisted.isDatabaseConfigured;
  },
}));

import { getOutboundCallHealth } from "@/lib/outbound-call-health";

describe("getOutboundCallHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T11:00:00.000Z"));
    vi.clearAllMocks();
    hoisted.isDatabaseConfigured = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports unhealthy when recent failures have no matching successes", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        idempotencyKey: "key_2",
        status: "FAILED",
        error: "Worker timeout",
        createdAt: new Date("2026-04-29T10:58:00.000Z"),
        updatedAt: new Date("2026-04-29T10:58:10.000Z"),
      },
      {
        idempotencyKey: "key_1",
        status: "FAILED",
        error: "No trunk",
        createdAt: new Date("2026-04-29T10:50:00.000Z"),
        updatedAt: new Date("2026-04-29T10:50:02.000Z"),
      },
    ]);

    const result = await getOutboundCallHealth();

    expect(result.status).toBe("unhealthy");
    expect(result.failedAttempts).toBe(2);
    expect(result.completedAttempts).toBe(0);
    expect(result.summary).toMatch(/failed and none succeeded/i);
  });

  it("reports unhealthy when queued calls are stuck in progress", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        idempotencyKey: "key_1",
        status: "IN_PROGRESS",
        error: null,
        createdAt: new Date("2026-04-29T10:40:00.000Z"),
        updatedAt: new Date("2026-04-29T10:40:00.000Z"),
      },
    ]);

    const result = await getOutboundCallHealth();

    expect(result.status).toBe("unhealthy");
    expect(result.staleInProgressAttempts).toBe(1);
    expect(result.summary).toMatch(/stuck in progress/i);
  });

  it("reports degraded when recent failures are mixed with successes", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        idempotencyKey: "key_2",
        status: "FAILED",
        error: "Worker timeout",
        createdAt: new Date("2026-04-29T10:58:00.000Z"),
        updatedAt: new Date("2026-04-29T10:58:10.000Z"),
      },
      {
        idempotencyKey: "key_1",
        status: "COMPLETED",
        error: null,
        createdAt: new Date("2026-04-29T10:55:00.000Z"),
        updatedAt: new Date("2026-04-29T10:55:04.000Z"),
      },
    ]);

    const result = await getOutboundCallHealth();

    expect(result.status).toBe("degraded");
    expect(result.failedAttempts).toBe(1);
    expect(result.completedAttempts).toBe(1);
    expect(result.summary).toMatch(/failed, but at least one succeeded/i);
  });
});
