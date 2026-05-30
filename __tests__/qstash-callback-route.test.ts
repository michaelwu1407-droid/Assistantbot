import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { scheduleLeadCallback, verify } = vi.hoisted(() => ({
  scheduleLeadCallback: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@/lib/lead-callback", () => ({ scheduleLeadCallback }));
vi.mock("@upstash/qstash", () => ({
  Receiver: class {
    verify = verify;
  },
}));

import { POST } from "@/app/api/qstash/callback/route";

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://app.example.com/api/qstash/callback", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  workspaceId: "ws_1",
  contactId: "contact_1",
  contactPhone: "+61400000000",
  contactName: "Alex",
  dealId: "deal_1",
  reason: "webform_lead:website",
  triggerSource: "webform",
  callbackKind: "automatic",
};

describe("POST /api/qstash/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduleLeadCallback.mockResolvedValue({ dispatched: "immediate" });
    verify.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("dispatches the callback immediately (delay already elapsed) in dev without verification", async () => {
    const response = await POST(buildRequest(validPayload));

    expect(response.status).toBe(200);
    expect(scheduleLeadCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        dealId: "deal_1",
        contactPhone: "+61400000000",
        delaySec: 0,
        callbackKind: "automatic",
      }),
    );
  });

  it("rejects payloads missing required fields", async () => {
    const response = await POST(buildRequest({ workspaceId: "ws_1" }));

    expect(response.status).toBe(400);
    expect(scheduleLeadCallback).not.toHaveBeenCalled();
  });

  it("rejects unsigned requests in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "sig_current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "sig_next");

    const response = await POST(buildRequest(validPayload));

    expect(response.status).toBe(401);
    expect(scheduleLeadCallback).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid signature in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "sig_current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "sig_next");
    verify.mockResolvedValue(false);

    const response = await POST(buildRequest(validPayload, { "upstash-signature": "bad" }));

    expect(response.status).toBe(401);
    expect(scheduleLeadCallback).not.toHaveBeenCalled();
  });

  it("dispatches a correctly signed production request", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "sig_current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "sig_next");
    verify.mockResolvedValue(true);

    const response = await POST(buildRequest(validPayload, { "upstash-signature": "good" }));

    expect(response.status).toBe(200);
    expect(verify).toHaveBeenCalledWith({ signature: "good", body: expect.any(String) });
    expect(scheduleLeadCallback).toHaveBeenCalledTimes(1);
  });
});
