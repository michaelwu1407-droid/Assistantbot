import { describe, expect, it } from "vitest";

import {
  buildDemoPrompt,
  buildInboundDemoPrompt,
  buildNormalPrompt,
  type PromptCallerContext,
} from "@/livekit-agent/voice-prompts";

const caller: PromptCallerContext = {
  callType: "normal",
  firstName: "Sam",
  lastName: "Taylor",
  businessName: "Northside Plumbing",
  email: "sam@example.com",
  phone: "+61411112222",
  calledPhone: "+61730000000",
};

describe("voice prompts", () => {
  it("keeps demo sales-focused without forcing redundant lead recapture", () => {
    const prompt = buildDemoPrompt({ ...caller, callType: "demo" });

    expect(prompt).toContain("Use the known form details as baseline context.");
    expect(prompt).toContain("never miss a job again");
    expect(prompt).toContain("no more admin");
    expect(prompt).toContain("Do not aggressively re-capture details already present in the form.");
    expect(prompt).not.toContain("Capture lead details before the call ends");
  });

  it("makes inbound demo capture unknown caller details and offer a spoken demo", () => {
    const prompt = buildInboundDemoPrompt({ ...caller, callType: "inbound_demo" });

    expect(prompt).toContain("Offer a spoken product demo on the call when the caller wants one.");
    expect(prompt).toContain("Capture unknown details early");
    expect(prompt).toContain("point them to earlymark.ai");
  });

  it("keeps normal prompts customer-facing and mode-aligned", () => {
    const prompt = buildNormalPrompt(caller, {
      workspaceId: "ws_123",
      businessName: "Northside Plumbing",
      tradeType: "Plumber",
      website: "https://example.com",
      businessPhone: "+61730000000",
      publicPhone: "+61730000000",
      publicEmail: "hello@example.com",
      physicalAddress: "1 Test St",
      serviceArea: "Brisbane",
      serviceRadiusKm: 25,
      standardWorkHours: "08:00-17:00",
      emergencyService: false,
      emergencySurcharge: null,
      aiPreferences: [],
      customerContactMode: "info_only",
      customerContactModeLabel: "Info only",
      serviceRules: [],
      pricingItems: [],
      noGoRules: [],
      flagOnlyRules: [],
      emergencyBypass: true,
      ownerPhone: "+61411111111",
    });

    expect(prompt).toContain("Current customer-contact mode: Info only.");
    expect(prompt).toContain("This same mode applies across Tracey for users calls, texts, emails, and outbound follow-up.");
    expect(prompt).not.toContain("Earlymark AI");
  });

  it("keeps the normal customer-call prompt language-locked to the caller", () => {
    const prompt = buildNormalPrompt(caller);

    expect(prompt).toContain("LANGUAGE");
    expect(prompt).toContain("Reply in the same language as the caller.");
    expect(prompt).toContain("If language detection is unclear, use Australian English.");
  });

  it("keeps the outbound demo prompt language-locked to the caller", () => {
    const prompt = buildDemoPrompt({ ...caller, callType: "demo" });

    expect(prompt).toContain("LANGUAGE");
    expect(prompt).toContain("Reply in the same language as the caller.");
    expect(prompt).toContain("Do not switch back to English unless the caller does.");
  });

  it("keeps the inbound demo prompt language-locked to the caller", () => {
    const prompt = buildInboundDemoPrompt({ ...caller, callType: "inbound_demo" });

    expect(prompt).toContain("LANGUAGE");
    expect(prompt).toContain("Reply in the same language as the caller.");
    expect(prompt).toContain("Keep non-English replies simple and professional.");
  });
});
