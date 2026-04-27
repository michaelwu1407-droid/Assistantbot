import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  initiateDemoCall: vi.fn(),
  persistDemoLeadAttempt: vi.fn(),
  markDemoLeadInitiated: vi.fn(),
  markDemoLeadFailed: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/demo-call", () => ({
  initiateDemoCall: hoisted.initiateDemoCall,
}));

vi.mock("@/lib/demo-lead-store", () => ({
  persistDemoLeadAttempt: hoisted.persistDemoLeadAttempt,
  markDemoLeadInitiated: hoisted.markDemoLeadInitiated,
  markDemoLeadFailed: hoisted.markDemoLeadFailed,
}));

vi.mock("next/headers", () => ({
  headers: hoisted.headers,
}));

import { requestDemoCall } from "@/actions/demo-call-action";

const validForm = {
  firstName: "Michael",
  lastName: "Wu",
  phone: "+61434955958",
  email: "michael@example.com",
  businessName: "Alexandria Auto",
};

describe("requestDemoCall server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.headers.mockResolvedValue({
      get: (key: string) => {
        if (key === "x-forwarded-for") return "203.0.113.5, 10.0.0.1";
        if (key === "user-agent") return "vitest";
        return null;
      },
    });
    hoisted.persistDemoLeadAttempt.mockResolvedValue("lead_123");
    hoisted.markDemoLeadInitiated.mockResolvedValue(undefined);
    hoisted.markDemoLeadFailed.mockResolvedValue(undefined);
  });

  it("rejects missing required fields with field-specific errors", async () => {
    const result = await requestDemoCall({ ...validForm, firstName: "" });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        field: "firstName",
        leadId: null,
      }),
    );
    expect(hoisted.persistDemoLeadAttempt).not.toHaveBeenCalled();
    expect(hoisted.initiateDemoCall).not.toHaveBeenCalled();
  });

  it("persists the lead before initiating the call and marks it INITIATED on success", async () => {
    hoisted.initiateDemoCall.mockResolvedValue({
      roomName: "demo-1",
      normalizedPhone: "+61434955958",
      resolvedTrunkId: "ST_real",
      callerNumber: "+61485010634",
      warnings: [],
    });

    const result = await requestDemoCall(validForm);

    expect(hoisted.persistDemoLeadAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Michael",
        lastName: "Wu",
        phone: "+61434955958",
        email: "michael@example.com",
        businessName: "Alexandria Auto",
        source: "homepage_form",
        ipAddress: "203.0.113.5",
        userAgent: "vitest",
      }),
    );
    const persistOrder = hoisted.persistDemoLeadAttempt.mock.invocationCallOrder[0];
    const initiateOrder = hoisted.initiateDemoCall.mock.invocationCallOrder[0];
    expect(persistOrder).toBeLessThan(initiateOrder);
    expect(hoisted.markDemoLeadInitiated).toHaveBeenCalledWith(
      "lead_123",
      expect.objectContaining({ roomName: "demo-1", resolvedTrunkId: "ST_real" }),
    );
    expect(result).toEqual({
      success: true,
      message: "Tracey is calling you now!",
      leadId: "lead_123",
    });
  });

  it("marks the lead FAILED and returns a friendly error when the call throws", async () => {
    hoisted.initiateDemoCall.mockRejectedValue(new Error("LiveKit unreachable"));

    const result = await requestDemoCall(validForm);

    expect(hoisted.markDemoLeadFailed).toHaveBeenCalledWith(
      "lead_123",
      expect.any(Error),
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        leadId: "lead_123",
      }),
    );
    if (!result.success) {
      expect(result.error).toMatch(/try again/i);
    }
  });

  it("surfaces phone validation errors verbatim so the user can fix the input", async () => {
    hoisted.initiateDemoCall.mockRejectedValue(
      new Error("Phone number 12345 is not a valid international number. Include country code (e.g. +61 for Australia)."),
    );

    const result = await requestDemoCall({ ...validForm, phone: "12345" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/valid international number/i);
    }
  });

  it("never throws when lead persistence fails", async () => {
    hoisted.persistDemoLeadAttempt.mockResolvedValue(null);
    hoisted.initiateDemoCall.mockResolvedValue({
      roomName: "demo-2",
      normalizedPhone: "+61434955958",
      resolvedTrunkId: "ST_real",
      callerNumber: "+61485010634",
      warnings: [],
    });

    const result = await requestDemoCall(validForm);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.leadId).toBeNull();
    }
    expect(hoisted.markDemoLeadInitiated).toHaveBeenCalledWith(null, expect.any(Object));
  });
});
