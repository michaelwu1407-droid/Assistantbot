import { describe, expect, it } from "vitest";

import {
  buildDemoPrompt,
  buildInboundDemoPrompt,
  buildNormalPrompt,
} from "@/livekit-agent/voice-prompts";

const caller = {
  callType: "demo" as const,
  firstName: "Michael",
  lastName: "Wu",
  businessName: "Alexandria Automotive Services",
  email: "michael@example.com",
  phone: "+61434955958",
  calledPhone: "+61485010634",
};

describe("voice prompt regression guards", () => {
  it("keeps demo sales-focused without forcing redundant lead recapture", () => {
    const prompt = buildDemoPrompt(caller);

    expect(prompt).toContain("Use the known form details as baseline context.");
    expect(prompt).toContain("never miss a job again");
    expect(prompt).toContain("no more admin");
    expect(prompt).toContain("Do not aggressively re-capture details already present in the form.");
    expect(prompt).not.toContain("Capture lead details before the call ends");
  });

  it("makes inbound demo capture unknown caller details and offer a spoken demo", () => {
    const prompt = buildInboundDemoPrompt({
      ...caller,
      callType: "inbound_demo",
    });

    expect(prompt).toContain("Offer a spoken product demo on the call when the caller wants one.");
    expect(prompt).toContain("Capture unknown details early");
    expect(prompt).toContain("point them to earlymark.ai");
  });

  it("keeps normal prompts customer-facing and mode-aligned", () => {
    const prompt = buildNormalPrompt(
      {
        ...caller,
        callType: "normal",
      },
      {
        workspaceId: "ws_123",
        businessName: "Alexandria Automotive Services",
        tradeType: "Mechanic",
        website: "https://example.com",
        businessPhone: "+61400000000",
        publicPhone: "+61400000000",
        publicEmail: "hello@example.com",
        physicalAddress: "1 Test St",
        serviceArea: "Sydney",
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
      },
    );

    expect(prompt).toContain("Current customer-contact mode: Info only.");
    expect(prompt).toContain("This same mode applies across Tracey for users calls, texts, emails, and outbound follow-up.");
    expect(prompt).not.toContain("Earlymark AI");
  });
});
