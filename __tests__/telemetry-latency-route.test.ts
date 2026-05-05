import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getLatencySnapshot: vi.fn(),
  getLatencyWaterfall: vi.fn(),
  resetLatencyTelemetry: vi.fn(),
}));

vi.mock("@/lib/telemetry/latency", () => ({
  getLatencySnapshot: hoisted.getLatencySnapshot,
  getLatencyWaterfall: hoisted.getLatencyWaterfall,
  resetLatencyTelemetry: hoisted.resetLatencyTelemetry,
}));

describe("/api/internal/telemetry/latency", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalTelemetryKey = env.TELEMETRY_ADMIN_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getLatencySnapshot.mockResolvedValue({ total: 3 });
    hoisted.getLatencyWaterfall.mockResolvedValue({ topTools: [] });
    hoisted.resetLatencyTelemetry.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalNodeEnv;

    if (originalTelemetryKey === undefined) delete env.TELEMETRY_ADMIN_KEY;
    else env.TELEMETRY_ADMIN_KEY = originalTelemetryKey;
  });

  async function loadRoute() {
    vi.resetModules();
    return import("@/app/api/internal/telemetry/latency/route");
  }

  it("returns a latency snapshot in non-production without auth", async () => {
    env.NODE_ENV = "development";

    const { GET } = await loadRoute();
    const response = await GET(new Request("https://earlymark.ai/api/internal/telemetry/latency"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ total: 3 });
  });

  it("rejects unauthorized production callers", async () => {
    env.NODE_ENV = "production";
    env.TELEMETRY_ADMIN_KEY = "secret";

    const { GET } = await loadRoute();
    const response = await GET(new Request("https://earlymark.ai/api/internal/telemetry/latency"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns waterfall data when requested", async () => {
    env.NODE_ENV = "production";
    env.TELEMETRY_ADMIN_KEY = "secret";

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://earlymark.ai/api/internal/telemetry/latency?view=waterfall&top_tools=7", {
        headers: { "x-telemetry-key": "secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ topTools: [] });
    expect(hoisted.getLatencyWaterfall).toHaveBeenCalledWith(7);
  });

  it("resets telemetry on authorized delete", async () => {
    env.NODE_ENV = "production";
    env.TELEMETRY_ADMIN_KEY = "secret";

    const { DELETE } = await loadRoute();
    const response = await DELETE(
      new Request("https://earlymark.ai/api/internal/telemetry/latency", {
        method: "DELETE",
        headers: { "x-telemetry-key": "secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(hoisted.resetLatencyTelemetry).toHaveBeenCalled();
  });
});
