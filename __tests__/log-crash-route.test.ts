import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: hoisted.getAuthUser,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

import { POST } from "@/app/api/log-crash/route";

function jsonRequest(body: unknown): Request {
  return new Request("https://earlymark.ai/api/log-crash", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/log-crash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUser.mockResolvedValue({ id: "user_1", email: "owner@example.com" });
  });

  it("rejects unauthenticated callers with 401 and does not log", async () => {
    hoisted.getAuthUser.mockResolvedValue(null);

    const res = await POST(jsonRequest({ message: "boom", stack: "stack" }));

    expect(res.status).toBe(401);
    expect(hoisted.loggerError).not.toHaveBeenCalled();
  });

  it("logs the crash with the authenticated user id when authorised", async () => {
    const res = await POST(jsonRequest({ message: "TypeError x", stack: "at foo" }));

    expect(res.status).toBe(200);
    expect(hoisted.loggerError).toHaveBeenCalledTimes(1);
    const call = hoisted.loggerError.mock.calls[0];
    expect(call[0]).toBe("Client-side crash reported");
    expect(call[1]).toMatchObject({
      component: "client-error-boundary",
      userId: "user_1",
      stack: "at foo",
    });
    expect(call[2]).toBeInstanceOf(Error);
    expect((call[2] as Error).message).toBe("TypeError x");
  });

  it("clamps oversized payloads instead of trusting them verbatim", async () => {
    const giantMessage = "x".repeat(50_000);
    const giantStack = "y".repeat(50_000);

    const res = await POST(jsonRequest({ message: giantMessage, stack: giantStack }));

    expect(res.status).toBe(200);
    const call = hoisted.loggerError.mock.calls[0];
    expect((call[2] as Error).message.length).toBeLessThanOrEqual(2_000);
    expect((call[1].stack as string).length).toBeLessThanOrEqual(10_000);
  });

  it("returns 400 for invalid JSON bodies", async () => {
    const badReq = new Request("https://earlymark.ai/api/log-crash", {
      method: "POST",
      body: "{not json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(badReq);

    expect(res.status).toBe(400);
    expect(hoisted.loggerError).not.toHaveBeenCalled();
  });
});
