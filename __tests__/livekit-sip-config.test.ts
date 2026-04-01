import { describe, it, expect, beforeEach, afterEach } from "vitest";

function clearEnv() {
  delete process.env.LIVEKIT_SIP_TERMINATION_URI;
  delete process.env.LIVEKIT_SIP_URI;
  delete process.env.LIVEKIT_URL;
}

beforeEach(clearEnv);
afterEach(clearEnv);

async function getModule() {
  return import("@/lib/livekit-sip-config");
}

describe("getLivekitSipTerminationUri", () => {
  it("returns custom URI from env when set", async () => {
    process.env.LIVEKIT_SIP_TERMINATION_URI = "custom.pstn.example.com";
    const { getLivekitSipTerminationUri } = await getModule();
    expect(getLivekitSipTerminationUri()).toBe("custom.pstn.example.com");
  });

  it("returns the default URI when env is not set", async () => {
    const { getLivekitSipTerminationUri } = await getModule();
    expect(getLivekitSipTerminationUri()).toBe("earlymark-outbound.pstn.sydney.twilio.com");
  });

  it("trims whitespace from env value", async () => {
    process.env.LIVEKIT_SIP_TERMINATION_URI = "  custom.pstn.example.com  ";
    const { getLivekitSipTerminationUri } = await getModule();
    expect(getLivekitSipTerminationUri()).toBe("custom.pstn.example.com");
  });
});

describe("getRecommendedTwilioOriginationUri", () => {
  it("returns null when LIVEKIT_SIP_URI is not set", async () => {
    const { getRecommendedTwilioOriginationUri } = await getModule();
    expect(getRecommendedTwilioOriginationUri()).toBeNull();
  });

  it("returns URI unchanged when it already contains ;edge=", async () => {
    process.env.LIVEKIT_SIP_URI = "sip:example.livekit.cloud;edge=sydney";
    const { getRecommendedTwilioOriginationUri } = await getModule();
    expect(getRecommendedTwilioOriginationUri()).toBe("sip:example.livekit.cloud;edge=sydney");
  });

  it("appends ;edge=sydney when missing from URI", async () => {
    process.env.LIVEKIT_SIP_URI = "sip:example.livekit.cloud";
    const { getRecommendedTwilioOriginationUri } = await getModule();
    expect(getRecommendedTwilioOriginationUri()).toBe("sip:example.livekit.cloud;edge=sydney");
  });

  it("is case-insensitive when checking for ;edge=", async () => {
    process.env.LIVEKIT_SIP_URI = "sip:example.livekit.cloud;Edge=sydney";
    const { getRecommendedTwilioOriginationUri } = await getModule();
    expect(getRecommendedTwilioOriginationUri()).toBe("sip:example.livekit.cloud;Edge=sydney");
  });
});

describe("getEarlymarkInboundSipUri", () => {
  it("returns static default SIP URI when no env vars are set and no number provided", async () => {
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri()).toBe("sip:live.earlymark.ai:5060");
  });

  it("includes calledNumber in static default when env vars are absent", async () => {
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri("+61480123456")).toBe("sip:+61480123456@live.earlymark.ai:5060");
  });

  it("uses LIVEKIT_SIP_URI when set and injects calledNumber for bare sip: URI", async () => {
    process.env.LIVEKIT_SIP_URI = "sip:lk.example.com";
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri("+61480123456")).toBe("sip:+61480123456@lk.example.com");
  });

  it("returns LIVEKIT_SIP_URI as-is when it already has @", async () => {
    process.env.LIVEKIT_SIP_URI = "sip:user@lk.example.com";
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri("+61480123456")).toBe("sip:user@lk.example.com");
  });

  it("returns LIVEKIT_SIP_URI with params when no calledNumber", async () => {
    process.env.LIVEKIT_SIP_URI = "sip:lk.example.com";
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri()).toBe("sip:lk.example.com");
  });

  it("derives SIP URI from LIVEKIT_URL when SIP_URI is absent", async () => {
    process.env.LIVEKIT_URL = "wss://lk.example.com";
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri("+61480123456")).toBe("sip:+61480123456@lk.example.com:5060");
  });

  it("returns only host-based SIP URI when LIVEKIT_URL set but no calledNumber", async () => {
    process.env.LIVEKIT_URL = "wss://lk.example.com";
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri()).toBe("sip:lk.example.com:5060");
  });

  it("strips ;params when injecting calledNumber into LIVEKIT_SIP_URI", async () => {
    process.env.LIVEKIT_SIP_URI = "sip:lk.example.com;edge=sydney";
    const { getEarlymarkInboundSipUri } = await getModule();
    expect(getEarlymarkInboundSipUri("+61480123456")).toBe("sip:+61480123456@lk.example.com");
  });
});
