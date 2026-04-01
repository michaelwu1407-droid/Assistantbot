import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { initializeTradieComms, initializeSimpleComms } = vi.hoisted(() => ({
  initializeTradieComms: vi.fn(),
  initializeSimpleComms: vi.fn(),
}));

vi.mock("@/lib/comms", () => ({ initializeTradieComms }));
vi.mock("@/lib/comms-simple", () => ({ initializeSimpleComms }));

import { provisionTradieCommsWithFallback } from "@/lib/comms-provision";

const SUCCESS_RESULT = { success: true, phoneNumber: "+61480000001" };
const FAILURE_EARLY = { success: false, stageReached: "subaccount-create", error: "Subaccount failed" };
const FAILURE_LATE = { success: false, stageReached: "number-purchase", error: "Number purchase failed" };
const SIMPLE_SUCCESS = { success: true, phoneNumber: "+61480000002" };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK = "false";
});

afterEach(() => {
  delete process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK;
});

describe("provisionTradieCommsWithFallback", () => {
  it("returns full result with mode=full when full provisioning succeeds", async () => {
    initializeTradieComms.mockResolvedValue(SUCCESS_RESULT);
    const result = await provisionTradieCommsWithFallback("ws-1", "Acme", "+61400000001");
    expect(result).toMatchObject({ ...SUCCESS_RESULT, mode: "full" });
    expect(initializeSimpleComms).not.toHaveBeenCalled();
  });

  it("returns full failure with mode=full when full fails and fallback is disabled", async () => {
    initializeTradieComms.mockResolvedValue(FAILURE_EARLY);
    const result = await provisionTradieCommsWithFallback("ws-1", "Acme", "+61400000001");
    expect(result).toMatchObject({ ...FAILURE_EARLY, mode: "full" });
    expect(initializeSimpleComms).not.toHaveBeenCalled();
  });

  it("falls back to simple when full fails at early stage and fallback is enabled", async () => {
    process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK = "true";
    initializeTradieComms.mockResolvedValue(FAILURE_EARLY);
    initializeSimpleComms.mockResolvedValue(SIMPLE_SUCCESS);

    const result = await provisionTradieCommsWithFallback("ws-1", "Acme", "+61400000001");
    expect(result).toMatchObject({ ...SIMPLE_SUCCESS, mode: "simple" });
    expect(initializeSimpleComms).toHaveBeenCalledWith("ws-1", "Acme", "+61400000001");
  });

  it("does NOT fall back when full fails at a late stage (number already purchased)", async () => {
    process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK = "true";
    initializeTradieComms.mockResolvedValue(FAILURE_LATE);

    const result = await provisionTradieCommsWithFallback("ws-1", "Acme", "+61400000001");
    expect(result).toMatchObject({ ...FAILURE_LATE, mode: "full" });
    expect(initializeSimpleComms).not.toHaveBeenCalled();
  });

  it("does NOT fall back when full fails with no stageReached but fallback is disabled", async () => {
    process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK = "false";
    initializeTradieComms.mockResolvedValue({ success: false, error: "Unknown" });

    const result = await provisionTradieCommsWithFallback("ws-1", "Acme", "+61400000001");
    expect(result.mode).toBe("full");
    expect(initializeSimpleComms).not.toHaveBeenCalled();
  });

  it("falls back when full fails with no stageReached and fallback is enabled", async () => {
    process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK = "true";
    initializeTradieComms.mockResolvedValue({ success: false, error: "Unknown" });
    initializeSimpleComms.mockResolvedValue(SIMPLE_SUCCESS);

    const result = await provisionTradieCommsWithFallback("ws-1", "Acme", "+61400000001");
    expect(result).toMatchObject({ ...SIMPLE_SUCCESS, mode: "simple" });
  });

  it("handles TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK case-insensitively", async () => {
    process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK = "  TRUE  ";
    initializeTradieComms.mockResolvedValue(FAILURE_EARLY);
    initializeSimpleComms.mockResolvedValue(SIMPLE_SUCCESS);

    const result = await provisionTradieCommsWithFallback("ws-1", "Acme", "+61400000001");
    expect(result.mode).toBe("simple");
  });

  it("passes workspace ID and owner details to both provisioners", async () => {
    process.env.TWILIO_ENABLE_SIMPLE_PROVISIONING_FALLBACK = "true";
    initializeTradieComms.mockResolvedValue(FAILURE_EARLY);
    initializeSimpleComms.mockResolvedValue(SIMPLE_SUCCESS);

    await provisionTradieCommsWithFallback("ws-abc", "Top Trades", "+61411222333");

    expect(initializeTradieComms).toHaveBeenCalledWith("ws-abc", "Top Trades", "+61411222333");
    expect(initializeSimpleComms).toHaveBeenCalledWith("ws-abc", "Top Trades", "+61411222333");
  });
});
