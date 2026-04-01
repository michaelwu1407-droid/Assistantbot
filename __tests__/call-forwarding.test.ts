import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildCallForwardingCodes,
  buildCarrierSetupHint,
  buildCallForwardingSetupSmsBody,
} from "@/lib/call-forwarding";

describe("buildCallForwardingCodes", () => {
  it("converts +61 number to dialable format (no change)", () => {
    const codes = buildCallForwardingCodes("+61480123456");
    expect(codes.full).toBe("**21*61480123456#");
  });

  it("converts 04xx Australian mobile to 614xx format", () => {
    const codes = buildCallForwardingCodes("0480123456");
    expect(codes.full).toBe("**21*61480123456#");
    expect(codes.backup).toContain("61480123456");
  });

  it("passes through numbers already starting with 61", () => {
    const codes = buildCallForwardingCodes("61480123456");
    expect(codes.full).toBe("**21*61480123456#");
  });

  it("builds backup (no-answer) forwarding code with delay", () => {
    const codes = buildCallForwardingCodes("0480123456", 20);
    expect(codes.backup).toBe("**61*61480123456**20#");
  });

  it("default delay is 12 seconds", () => {
    const codes = buildCallForwardingCodes("0480123456");
    expect(codes.backup).toContain("**12#");
  });

  it("clamps delay minimum to 10 seconds", () => {
    const codes = buildCallForwardingCodes("0480123456", 5);
    expect(codes.backup).toContain("**10#");
  });

  it("clamps delay maximum to 45 seconds", () => {
    const codes = buildCallForwardingCodes("0480123456", 99);
    expect(codes.backup).toContain("**45#");
  });

  it("off code is always ##002#", () => {
    const codes = buildCallForwardingCodes("0480123456");
    expect(codes.off).toBe("##002#");
  });

  it("generates correct tel: href for full forwarding", () => {
    const codes = buildCallForwardingCodes("0480123456");
    expect(codes.fullHref).toBe("tel:**21*61480123456%23");
  });

  it("generates correct tel: href for off", () => {
    const codes = buildCallForwardingCodes("0480123456");
    expect(codes.offHref).toBe("tel:##002%23");
  });

  it("strips non-digit characters from phone number", () => {
    const codes = buildCallForwardingCodes("+61 480 123 456");
    expect(codes.full).toBe("**21*61480123456#");
  });
});

describe("buildCarrierSetupHint", () => {
  it("returns a Telstra-specific hint", () => {
    const hint = buildCarrierSetupHint("telstra", 15);
    expect(hint).toContain("Telstra");
    expect(hint).toContain("15 seconds");
  });

  it("returns a Vodafone-specific hint", () => {
    const hint = buildCarrierSetupHint("vodafone", 12);
    expect(hint).toContain("Vodafone");
    expect(hint).toContain("12 seconds");
  });

  it("returns an Optus-specific hint", () => {
    const hint = buildCarrierSetupHint("optus", 12);
    expect(hint).toContain("Optus");
  });

  it("returns a generic hint for other carriers", () => {
    const hint = buildCarrierSetupHint("other", 12);
    expect(hint).toContain("carrier");
  });

  it("clamps delay minimum to 10 in hints", () => {
    const hint = buildCarrierSetupHint("telstra", 1);
    expect(hint).toContain("10 seconds");
  });

  it("clamps delay maximum to 45 in hints", () => {
    const hint = buildCarrierSetupHint("telstra", 99);
    expect(hint).toContain("45 seconds");
  });
});

describe("buildCallForwardingSetupSmsBody", () => {
  const baseParams = {
    businessName: "Acme Plumbing",
    agentPhoneNumber: "0480123456",
    mode: "backup" as const,
    delaySec: 12,
    carrier: "telstra" as const,
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("includes the business name", () => {
    const body = buildCallForwardingSetupSmsBody(baseParams);
    expect(body).toContain("Acme Plumbing");
  });

  it("includes the agent phone number", () => {
    const body = buildCallForwardingSetupSmsBody(baseParams);
    expect(body).toContain("0480123456");
  });

  it("includes the backup forwarding code for backup mode", () => {
    const body = buildCallForwardingSetupSmsBody({ ...baseParams, mode: "backup" });
    expect(body).toContain("**61*");
  });

  it("includes the full forwarding code for full mode", () => {
    const body = buildCallForwardingSetupSmsBody({ ...baseParams, mode: "full" });
    expect(body).toContain("**21*");
  });

  it("includes the off code", () => {
    const body = buildCallForwardingSetupSmsBody(baseParams);
    expect(body).toContain("##002#");
  });

  it("includes the settings URL", () => {
    const body = buildCallForwardingSetupSmsBody(baseParams);
    expect(body).toContain("https://earlymark.ai/crm/settings");
  });

  it("falls back to earlymark.ai when NEXT_PUBLIC_APP_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const body = buildCallForwardingSetupSmsBody(baseParams);
    expect(body).toContain("https://earlymark.ai/crm/settings");
  });
});
