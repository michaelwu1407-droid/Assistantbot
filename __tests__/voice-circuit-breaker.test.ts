import { describe, expect, it } from "vitest";
import {
  VOICE_DISABLED_SPEND_CAP,
  hasSpendCapPauseExpired,
  isVoiceUsable,
  utcDayKey,
} from "@/lib/voice-circuit-breaker";
import { canAutoCallLead } from "@/lib/auto-call-eligibility";

const spendCapPause = (disabledAt: Date | string | null) => ({
  voiceEnabled: false,
  voiceDisabledReason: VOICE_DISABLED_SPEND_CAP,
  voiceDisabledAt: disabledAt,
});

describe("utcDayKey", () => {
  it("buckets by UTC day, matching Twilio's daily billing boundary", () => {
    expect(utcDayKey(new Date("2026-09-28T23:59:59Z"))).toBe("2026-09-28");
    expect(utcDayKey(new Date("2026-09-29T00:00:00Z"))).toBe("2026-09-29");
  });
});

describe("hasSpendCapPauseExpired", () => {
  it("is false while voice is still enabled", () => {
    expect(hasSpendCapPauseExpired({ voiceEnabled: true })).toBe(false);
  });

  it("is false within the same UTC billing day", () => {
    const expired = hasSpendCapPauseExpired(
      spendCapPause(new Date("2026-09-29T01:00:00Z")),
      new Date("2026-09-29T23:00:00Z"),
    );
    expect(expired).toBe(false);
  });

  it("is true once the UTC billing day has rolled over", () => {
    const expired = hasSpendCapPauseExpired(
      spendCapPause(new Date("2026-09-28T23:00:00Z")),
      new Date("2026-09-29T00:30:00Z"),
    );
    expect(expired).toBe(true);
  });

  it("accepts an ISO string timestamp", () => {
    const expired = hasSpendCapPauseExpired(
      spendCapPause("2026-09-28T10:00:00Z"),
      new Date("2026-09-29T10:00:00Z"),
    );
    expect(expired).toBe(true);
  });

  // The whole point of the reason column: an automatic pause expires, a
  // deliberate one must not be silently undone.
  it("never expires a pause set for any other reason", () => {
    const expired = hasSpendCapPauseExpired(
      {
        voiceEnabled: false,
        voiceDisabledReason: "support_suspended_account",
        voiceDisabledAt: new Date("2026-09-01T00:00:00Z"),
      },
      new Date("2026-09-29T00:00:00Z"),
    );
    expect(expired).toBe(false);
  });

  it("never expires a legacy pause with no recorded reason", () => {
    const expired = hasSpendCapPauseExpired(
      {
        voiceEnabled: false,
        voiceDisabledReason: null,
        voiceDisabledAt: new Date("2026-09-01T00:00:00Z"),
      },
      new Date("2026-09-29T00:00:00Z"),
    );
    expect(expired).toBe(false);
  });

  it("never expires a pause with no timestamp", () => {
    expect(hasSpendCapPauseExpired(spendCapPause(null))).toBe(false);
  });

  it("never expires a pause with an unparseable timestamp", () => {
    expect(hasSpendCapPauseExpired(spendCapPause("not-a-date"))).toBe(false);
  });
});

describe("isVoiceUsable", () => {
  it("treats an absent voiceEnabled field as usable", () => {
    expect(isVoiceUsable({})).toBe(true);
  });

  it("blocks a same-day spend-cap pause", () => {
    const usable = isVoiceUsable(
      spendCapPause(new Date("2026-09-29T01:00:00Z")),
      new Date("2026-09-29T20:00:00Z"),
    );
    expect(usable).toBe(false);
  });

  it("allows an expired spend-cap pause", () => {
    const usable = isVoiceUsable(
      spendCapPause(new Date("2026-09-28T01:00:00Z")),
      new Date("2026-09-29T00:01:00Z"),
    );
    expect(usable).toBe(true);
  });
});

describe("canAutoCallLead with an expiring spend-cap pause", () => {
  const base = {
    autoCallLeads: true,
    agentMode: "EXECUTION",
    twilioPhoneNumber: "+61200000000",
  };

  it("still blocks while the pause is live", () => {
    const result = canAutoCallLead(
      { ...base, ...spendCapPause(new Date("2026-09-29T01:00:00Z")) },
      new Date("2026-09-29T09:00:00Z"),
    );
    expect(result).toEqual({ allowed: false, reason: "voice_disabled" });
  });

  it("allows the call once the billing day has rolled over", () => {
    const result = canAutoCallLead(
      { ...base, ...spendCapPause(new Date("2026-09-28T01:00:00Z")) },
      new Date("2026-09-29T09:00:00Z"),
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it("keeps blocking a deliberate disable regardless of age", () => {
    const result = canAutoCallLead(
      {
        ...base,
        voiceEnabled: false,
        voiceDisabledReason: "support_suspended_account",
        voiceDisabledAt: new Date("2026-08-01T00:00:00Z"),
      },
      new Date("2026-09-29T09:00:00Z"),
    );
    expect(result).toEqual({ allowed: false, reason: "voice_disabled" });
  });

  it("is unchanged for callers that never select the new fields", () => {
    expect(canAutoCallLead({ ...base, voiceEnabled: false })).toEqual({
      allowed: false,
      reason: "voice_disabled",
    });
  });
});
