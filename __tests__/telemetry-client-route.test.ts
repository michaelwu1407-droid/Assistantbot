import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { recordLatencyMetric } = vi.hoisted(() => ({
  recordLatencyMetric: vi.fn(),
}));

vi.mock("@/lib/telemetry/latency", () => ({
  recordLatencyMetric,
}));

import { POST } from "@/app/api/internal/telemetry/client/route";

describe("POST /api/internal/telemetry/client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid metrics", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/telemetry/client", {
        method: "POST",
        body: JSON.stringify({ metric: "chat.server.ms", duration: 20 }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid metric" });
  });

  it("records valid client latency metrics", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/telemetry/client", {
        method: "POST",
        body: JSON.stringify({ metric: "chat.client.first_paint", duration: 123.6 }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(recordLatencyMetric).toHaveBeenCalledWith("chat.client.first_paint", 124);
  });

  it("returns bad request when the JSON payload is malformed", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/telemetry/client", {
        method: "POST",
        body: "{not json",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Bad request" });
  });
});
