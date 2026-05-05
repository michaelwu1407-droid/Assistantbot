import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLivekitSipTerminationUri } = vi.hoisted(() => ({
  getLivekitSipTerminationUri: vi.fn(),
}));

vi.mock("@/lib/livekit-sip-config", () => ({
  getLivekitSipTerminationUri,
}));

async function loadPost() {
  vi.resetModules();
  const mod = await import("@/app/api/create-sip-trunk/route");
  return mod.POST;
}

describe("POST /api/create-sip-trunk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    getLivekitSipTerminationUri.mockReturnValue("sip:termination@example.com");
    process.env.LIVEKIT_URL = "wss://live.earlymark.ai";
    process.env.LIVEKIT_API_KEY = "lk_key";
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "twilio_secret";
  });

  it("creates an outbound SIP trunk through LiveKit", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ sip_trunk_id: "trunk_123" }),
    } as unknown as Response);

    const POST = await loadPost();
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      trunkId: "trunk_123",
      sipServer: "sip:termination@example.com",
      result: { sip_trunk_id: "trunk_123" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://live.earlymark.ai/sip/trunk",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer lk_key",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("returns a failure payload when trunk creation throws", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network offline"));

    const POST = await loadPost();
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "network offline",
    });
  });
});
