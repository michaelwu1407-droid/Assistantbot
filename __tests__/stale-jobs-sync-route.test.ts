import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  scanAndUpdateStaleJobs: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/actions/stale-job-actions", () => ({
  scanAndUpdateStaleJobs: hoisted.scanAndUpdateStaleJobs,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

import { GET, POST } from "@/app/api/stale-jobs/sync/route";

describe("/api/stale-jobs/sync", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
    hoisted.scanAndUpdateStaleJobs.mockResolvedValue({
      success: true,
      data: { updatedCount: 2, overdueCount: 3 },
    });
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("rejects unauthorized GET callers", async () => {
    const response = await GET(new NextRequest("https://earlymark.ai/api/stale-jobs/sync"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("passes workspaceId from GET querystring", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/stale-jobs/sync?workspaceId=ws_1", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.scanAndUpdateStaleJobs).toHaveBeenCalledWith("ws_1", { system: true });
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { updatedCount: 2, overdueCount: 3 },
      message: "Scanned and updated 2 stale jobs",
    });
  });

  it("passes workspaceId from POST body and surfaces business failures", async () => {
    hoisted.scanAndUpdateStaleJobs.mockResolvedValueOnce({
      success: false,
      error: "Forbidden workspace access",
    });

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/stale-jobs/sync", {
        method: "POST",
        headers: { authorization: "Bearer secret", "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "ws_other" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(hoisted.scanAndUpdateStaleJobs).toHaveBeenCalledWith("ws_other", { system: true });
    await expect(response.json()).resolves.toEqual({ error: "Forbidden workspace access" });
  });

  it("logs and returns 500 on unexpected errors", async () => {
    hoisted.scanAndUpdateStaleJobs.mockRejectedValueOnce(new Error("db offline"));

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/stale-jobs/sync", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
    expect(hoisted.loggerError).toHaveBeenCalled();
  });
});
