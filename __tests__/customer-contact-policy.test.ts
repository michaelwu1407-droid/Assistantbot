import { describe, expect, it } from "vitest";

import {
  enforceCustomerFacingResponsePolicy,
  getCustomerContactCapabilityPolicy,
} from "@/livekit-agent/customer-contact-policy";

describe("customer contact policy", () => {
  it("allows supported commitments in execute mode", () => {
    expect(getCustomerContactCapabilityPolicy("EXECUTION")).toMatchObject({
      mode: "execute",
      allowFirmQuotes: true,
      allowFirmBookings: true,
      allowOutboundContact: true,
    });
  });

  it("rewrites forbidden booking and timing promises in review/approve mode", () => {
    const outcome = enforceCustomerFacingResponsePolicy({
      modeRaw: "DRAFT",
      channel: "voice",
      text: "You're booked for tomorrow at 9am and we'll text you shortly to confirm.",
    });

    expect(outcome.allowed).toBe(false);
    expect(outcome.violations).toEqual(expect.arrayContaining(["firm_booking", "outbound_commitment", "timing_promise"]));
    expect(outcome.finalText).toContain("team will confirm");
  });

  it("rewrites quotes in info only mode", () => {
    const outcome = enforceCustomerFacingResponsePolicy({
      modeRaw: "INFO_ONLY",
      channel: "sms",
      text: "The price will be $280 and we can lock that in today.",
    });

    expect(outcome.allowed).toBe(false);
    expect(outcome.violations).toContain("firm_quote");
    expect(outcome.finalText).toContain("team");
  });
});
