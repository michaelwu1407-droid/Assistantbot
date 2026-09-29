import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  initiateDemoCall: vi.fn(),
  persistDemoLeadAttempt: vi.fn(),
  markDemoLeadInitiated: vi.fn(),
  markDemoLeadFailed: vi.fn(),
  dispatchDemoCallFailureAlert: vi.fn(),
  sendDemoLeadNotificationEmail: vi.fn(),
  headers: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/demo-call", () => ({ initiateDemoCall: hoisted.initiateDemoCall }));
vi.mock("@/lib/demo-lead-store", () => ({
  persistDemoLeadAttempt: hoisted.persistDemoLeadAttempt,
  markDemoLeadInitiated: hoisted.markDemoLeadInitiated,
  markDemoLeadFailed: hoisted.markDemoLeadFailed,
}));
vi.mock("@/lib/demo-call-failure-alert", () => ({
  dispatchDemoCallFailureAlert: hoisted.dispatchDemoCallFailureAlert,
}));
vi.mock("@/lib/demo-lead-email", () => ({
  sendDemoLeadNotificationEmail: hoisted.sendDemoLeadNotificationEmail,
}));
vi.mock("next/headers", () => ({ headers: hoisted.headers }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: hoisted.rateLimit }));

import { requestDemoCall } from "@/actions/demo-call-action";

const validForm = {
  firstName: "Michael",
  lastName: "Wu",
  phone: "+61434955958",
  email: "michael@example.com",
  businessName: "Alexandria Auto",
};

/** Refuse whichever bucket the key names; allow the rest. */
function throttleOn(kind: "phone" | "ip") {
  hoisted.rateLimit.mockImplementation(async (key: string) =>
    key.startsWith(`demo-call:${kind}:`)
      ? { allowed: false, retryAfterMs: 60_000 }
      : { allowed: true },
  );
}

describe("demo call throttling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.headers.mockResolvedValue({
      get: (key: string) => {
        if (key === "x-forwarded-for") return "203.0.113.5, 10.0.0.1";
        if (key === "user-agent") return "vitest";
        return null;
      },
    });
    hoisted.rateLimit.mockResolvedValue({ allowed: true });
    hoisted.persistDemoLeadAttempt.mockResolvedValue("lead_123");
    hoisted.initiateDemoCall.mockResolvedValue({
      roomName: "room_1",
      resolvedTrunkId: "trunk_1",
      callerNumber: "+61400000000",
      warnings: [],
    });
    hoisted.markDemoLeadInitiated.mockResolvedValue(undefined);
    hoisted.sendDemoLeadNotificationEmail.mockResolvedValue(undefined);
  });

  it("caps repeat calls to the same number", async () => {
    throttleOn("phone");
    const result = await requestDemoCall(validForm);

    expect(result.success).toBe(false);
    expect(hoisted.initiateDemoCall).not.toHaveBeenCalled();
  });

  it("caps bulk submissions from one IP", async () => {
    throttleOn("ip");
    const result = await requestDemoCall(validForm);

    expect(result.success).toBe(false);
    expect(hoisted.initiateDemoCall).not.toHaveBeenCalled();
  });

  // A refused submission must not reach the database either, or a flood still
  // costs us a table full of junk leads.
  it("does not persist a lead for a refused submission", async () => {
    throttleOn("phone");
    await requestDemoCall(validForm);

    expect(hoisted.persistDemoLeadAttempt).not.toHaveBeenCalled();
  });

  it("buckets the number in a normalised form so 04… and +614… share a limit", async () => {
    await requestDemoCall({ ...validForm, phone: "0434955958" });

    const phoneKeys = hoisted.rateLimit.mock.calls
      .map(([key]) => String(key))
      .filter((key) => key.startsWith("demo-call:phone:"));
    expect(phoneKeys).toEqual(["demo-call:phone:+61434955958"]);
  });

  it("places the call when both limits allow it", async () => {
    const result = await requestDemoCall(validForm);

    expect(result.success).toBe(true);
    expect(hoisted.initiateDemoCall).toHaveBeenCalledTimes(1);
  });
});
