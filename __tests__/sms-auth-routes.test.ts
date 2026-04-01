import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

declare global {
  var verificationCodes:
    | Array<{ phone: string; code: string; timestamp: number; expires: number }>
    | undefined;
}

describe("SMS auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    globalThis.verificationCodes = [];
  });

  afterEach(() => {
    delete globalThis.verificationCodes;
  });

  it("returns 500 when MessageBird is not configured", async () => {
    const { POST } = await import("@/app/api/auth/send-sms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/auth/send-sms", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: "+61400000000" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "MessageBird not configured" });
  });

  it("sends a verification SMS and stores the generated code", async () => {
    vi.stubEnv("MESSAGEBIRD_API_KEY", "mb_live_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { POST } = await import("@/app/api/auth/send-sms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/auth/send-sms", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: "+61412345678" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://rest.messagebird.com/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "AccessKey mb_live_key",
        }),
      }),
    );
    expect(globalThis.verificationCodes).toHaveLength(1);
    expect(globalThis.verificationCodes?.[0]).toMatchObject({
      phone: "+61412345678",
      code: "100000",
    });
  });

  it("returns 500 when the sms provider request fails", async () => {
    vi.stubEnv("MESSAGEBIRD_API_KEY", "mb_live_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const { POST } = await import("@/app/api/auth/send-sms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/auth/send-sms", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: "+61412345678" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to send verification code" });
  });

  it("rejects invalid or expired verification codes", async () => {
    globalThis.verificationCodes = [
      {
        phone: "+61412345678",
        code: "123456",
        timestamp: Date.now() - 20_000,
        expires: Date.now() - 1,
      },
    ];
    const { POST } = await import("@/app/api/auth/verify-sms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/auth/verify-sms", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: "+61412345678", code: "123456" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid or expired verification code" });
  });

  it("verifies valid codes and removes them after use", async () => {
    globalThis.verificationCodes = [
      {
        phone: "+61412345678",
        code: "123456",
        timestamp: Date.now() - 20_000,
        expires: Date.now() + 60_000,
      },
    ];
    const { POST } = await import("@/app/api/auth/verify-sms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/auth/verify-sms", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: "+61412345678", code: "123456" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Phone number verified successfully",
    });
    expect(globalThis.verificationCodes).toEqual([]);
  });
});
