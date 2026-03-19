import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  db,
  requireAuMobileBusinessBundleSid,
  findSourceBundleAddressSid,
  getExpectedSmsWebhookUrl,
  getExpectedVoiceGatewayUrl,
  buildManagedVoiceNumberFriendlyName,
  twilioMasterClient,
} = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
  requireAuMobileBusinessBundleSid: vi.fn(),
  findSourceBundleAddressSid: vi.fn(),
  getExpectedSmsWebhookUrl: vi.fn(),
  getExpectedVoiceGatewayUrl: vi.fn(),
  buildManagedVoiceNumberFriendlyName: vi.fn(),
  twilioMasterClient: {} as Record<string, unknown>,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/twilio", () => ({
  twilioMasterClient,
}));

vi.mock("@/lib/twilio-regulatory", () => ({
  describeTwilioProvisioningError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
    detailedError: error instanceof Error ? error.message : "Unknown error",
    code: undefined,
    status: undefined,
  }),
  requireAuMobileBusinessBundleSid,
  findSourceBundleAddressSid,
}));

vi.mock("@/lib/earlymark-inbound-config", () => ({
  getExpectedSmsWebhookUrl,
  getExpectedVoiceGatewayUrl,
}));

vi.mock("@/lib/voice-number-metadata", () => ({
  buildManagedVoiceNumberFriendlyName,
}));

import { initializeTradieComms } from "@/lib/comms";

describe("initializeTradieComms", () => {
  const mobileList = vi.fn();
  const incomingUpdate = vi.fn();
  const incomingRemove = vi.fn();
  const incomingCreate = vi.fn();
  const incomingPhoneNumbers = Object.assign(
    vi.fn(() => ({
      update: incomingUpdate,
      remove: incomingRemove,
    })),
    {
      create: incomingCreate,
    },
  );
  const originationCreate = vi.fn();
  const trunkRemove = vi.fn();
  const trunkCreate = vi.fn();
  const trunks = Object.assign(
    vi.fn(() => ({
      originationUrls: {
        create: originationCreate,
      },
      remove: trunkRemove,
    })),
    {
      create: trunkCreate,
    },
  );
  const usageTriggerCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = "AC_master";
    process.env.TWILIO_AUTH_TOKEN = "master_auth";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LIVEKIT_SIP_URI = "sip:earlymark@sip.livekit.cloud";

    Object.assign(twilioMasterClient, {
      availablePhoneNumbers: vi.fn(() => ({
        mobile: { list: mobileList },
      })),
      incomingPhoneNumbers,
      trunking: { v1: { trunks } },
      usage: { triggers: { create: usageTriggerCreate } },
    });

    db.workspace.update.mockResolvedValue({});
    db.activity.create.mockResolvedValue({});

    buildManagedVoiceNumberFriendlyName.mockReturnValue("Managed Friendly Name");
    getExpectedVoiceGatewayUrl.mockReturnValue("https://app.example.com/api/webhooks/twilio-voice-gateway");
    getExpectedSmsWebhookUrl.mockReturnValue("https://app.example.com/api/twilio/webhook");
    requireAuMobileBusinessBundleSid.mockReturnValue("BU_source");
    findSourceBundleAddressSid.mockResolvedValue("AD_from_bundle");

    mobileList.mockResolvedValue([{ phoneNumber: "+61485010634" }]);
    incomingCreate.mockResolvedValue({ sid: "PN_123", phoneNumber: "+61485010634" });
    incomingUpdate.mockResolvedValue({});
    incomingRemove.mockResolvedValue(true);
    trunkCreate.mockResolvedValue({ sid: "TK_123" });
    originationCreate.mockResolvedValue({});
    trunkRemove.mockResolvedValue(true);
    usageTriggerCreate.mockResolvedValue({});
  });

  it("purchases number in main account with source bundle and address", async () => {
    const result = await initializeTradieComms(
      "ws_123",
      "Alexandria Automotive Services",
      "+61434955958",
    );

    expect(requireAuMobileBusinessBundleSid).toHaveBeenCalled();
    expect(findSourceBundleAddressSid).toHaveBeenCalled();
    expect(incomingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        bundleSid: "BU_source",
        addressSid: "AD_from_bundle",
        phoneNumber: "+61485010634",
      }),
    );
    expect(db.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws_123" },
        data: expect.objectContaining({
          twilioPhoneNumber: "+61485010634",
        }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      phoneNumber: "+61485010634",
      bundleSid: "BU_source",
    });
  });
});
