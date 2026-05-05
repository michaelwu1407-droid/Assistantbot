import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/voice-preview/route";

function makeRequest(body: unknown) {
  return new NextRequest("https://www.earlymark.ai/api/voice-preview", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/voice-preview", () => {
  const originalFetch = global.fetch;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.CARTESIA_API_KEY = "cartesia_test";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.CARTESIA_API_KEY;
  });

  it("requires CARTESIA_API_KEY", async () => {
    delete process.env.CARTESIA_API_KEY;

    const response = await POST(makeRequest({
      voiceId: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
      text: "Hello",
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "CARTESIA_API_KEY not configured" });
  });

  it("validates allowed voice IDs", async () => {
    const response = await POST(makeRequest({ voiceId: "bad-voice", text: "Hello" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid voice ID" });
  });

  it("validates preview text length", async () => {
    const response = await POST(
      makeRequest({
        voiceId: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
        text: "x".repeat(501),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Text is required and must be under 500 characters",
    });
  });

  it("returns a 502 when Cartesia rejects the request", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    });

    const response = await POST(
      makeRequest({
        voiceId: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
        text: "Hello there",
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "TTS generation failed: 429 rate limited",
    });
  });

  it("streams audio back when Cartesia succeeds", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    });

    const response = await POST(
      makeRequest({
        voiceId: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
        text: "Hello there",
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cartesia.ai/tts/bytes",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-API-Key": "cartesia_test",
          "Cartesia-Version": "2024-06-10",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Content-Length")).toBe("4");
  });
});
