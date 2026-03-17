import { beforeEach, describe, expect, it, vi } from "vitest";

const { twilioMasterClient, twilioFactory, bundleCloneCreate, bundleFetch } = vi.hoisted(() => {
  const bundleFetch = vi.fn();
  const bundleCloneCreate = vi.fn();
  const twilioMasterClient = {
    numbers: {
      v2: {
        bundleClone: () => ({
          create: bundleCloneCreate,
        }),
      },
    },
  };
  const twilioFactory = vi.fn(() => ({
    numbers: {
      v2: {
        regulatoryCompliance: {
          bundles: () => ({
            fetch: bundleFetch,
          }),
        },
      },
    },
  }));
  return { twilioMasterClient, twilioFactory, bundleCloneCreate, bundleFetch };
});

vi.mock("@/lib/twilio", () => ({
  twilioMasterClient,
}));

vi.mock("twilio", () => ({
  default: twilioFactory,
}));

const originalEnv = { ...process.env };

describe("resolveAuMobileBusinessBundleSidForAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.TWILIO_ACCOUNT_SID = "AC_MASTER";
    process.env.TWILIO_AUTH_TOKEN = "master_token";
    process.env.TWILIO_AU_MOBILE_BUSINESS_BUNDLE_SID = "BU_SOURCE";
  });

  it("uses clone.sid when clone.bundleSid is missing", async () => {
    vi.resetModules();
    bundleCloneCreate.mockResolvedValue({ sid: "BU_CLONED" });
    bundleFetch.mockResolvedValue({ status: "approved" });

    const { resolveAuMobileBusinessBundleSidForAccount } = await import("@/lib/twilio-regulatory");
    const sid = await resolveAuMobileBusinessBundleSidForAccount({
      targetAccountSid: "AC_SUB",
      subaccountAuthToken: "sub_token",
      friendlyName: "test",
    });

    expect(sid).toBe("BU_CLONED");
    expect(twilioFactory).toHaveBeenCalledWith("AC_SUB", "sub_token");
    expect(bundleFetch).toHaveBeenCalled();
  });
});

