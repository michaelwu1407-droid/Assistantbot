import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  db,
  requireAuMobileBusinessBundleSid,
  findSourceBundleAddressSid,
  getExpectedSmsWebhookUrl,
  getExpectedVoiceGatewayUrl,
  buildManagedVoiceNumberFriendlyName,
  twilioMasterClient,
  createTwilioSubaccount,
  getSubaccountClient,
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
  createTwilioSubaccount: vi.fn(),
  getSubaccountClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/twilio", () => ({
  twilioMasterClient,
  createTwilioSubaccount,
  getSubaccountClient,
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
  const subAddressCreate = vi.fn();
  const subIncomingUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = "AC_master";
    process.env.TWILIO_AUTH_TOKEN = "master_auth";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LIVEKIT_SIP_URI = "sip:earlymark@sip.livekit.cloud";

    db.workspace.findUnique.mockResolvedValue({
      twilioSubaccountId: "AC_sub",
      twilioSubaccountAuthToken: "auth-token",
    });
    db.workspace.update.mockResolvedValue({});
    db.activity.create.mockResolvedValue({});

    const subTrunks = Object.assign(vi.fn(() => ({ originationUrls: { create: originationCreate }, remove: trunkRemove })), { create: trunkCreate });
    const subIncomingPhoneNumbers = vi.fn(() => ({ update: subIncomingUpdate, remove: incomingRemove }));
    Object.assign(subIncomingPhoneNumbers, { create: vi.fn() });

    const subClient = {
      addresses: { create: subAddressCreate },
      trunking: { v1: { trunks: subTrunks } },
      incomingPhoneNumbers: subIncomingPhoneNumbers,
      usage: { triggers: { create: usageTriggerCreate } },
    };
    getSubaccountClient.mockReturnValue(subClient);

    Object.assign(twilioMasterClient, {
      availablePhoneNumbers: vi.fn(() => ({ mobile: { list: mobileList } })),
      incomingPhoneNumbers,
      usage: { triggers: { create: vi.fn() } },
    });

    buildManagedVoiceNumberFriendlyName.mockReturnValue("Managed Friendly Name");
    getExpectedVoiceGatewayUrl.mockReturnValue("https://app.example.com/api/webhooks/twilio-voice-gateway");
    getExpectedSmsWebhookUrl.mockReturnValue("https://app.example.com/api/twilio/webhook");
    requireAuMobileBusinessBundleSid.mockReturnValue("BU_source");
    findSourceBundleAddressSid.mockResolvedValue("AD_from_bundle");

    mobileList.mockResolvedValue([{ phoneNumber: "+61485010634" }]);
    incomingCreate.mockResolvedValue({ sid: "PN_123", phoneNumber: "+61485010634" });
    incomingUpdate.mockResolvedValue({});
    subIncomingUpdate.mockResolvedValue({});
    incomingRemove.mockResolvedValue(true);
    trunkCreate.mockResolvedValue({ sid: "TK_123" });
    originationCreate.mockResolvedValue({});
    trunkRemove.mockResolvedValue(true);
    subAddressCreate.mockResolvedValue({ sid: "AD_sub" });
    usageTriggerCreate.mockResolvedValue({});
  });

  it("purchases in main account, transfers to subaccount, configures trunk in subaccount", async () => {
    const result = await initializeTradieComms(
      "ws_123",
      "Alexandria Automotive Services",
      "+61434955958",
    );

    expect(getSubaccountClient).toHaveBeenCalledWith("AC_sub", "auth-token");
    expect(requireAuMobileBusinessBundleSid).toHaveBeenCalled();
    expect(findSourceBundleAddressSid).toHaveBeenCalled();
    expect(incomingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        bundleSid: "BU_source",
        addressSid: "AD_from_bundle",
        phoneNumber: "+61485010634",
      }),
    );
    expect(incomingUpdate).toHaveBeenCalledWith(expect.objectContaining({ accountSid: "AC_sub" }));
    expect(subAddressCreate).toHaveBeenCalled();
    expect(trunkCreate).toHaveBeenCalled();
    expect(db.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws_123" },
        data: expect.objectContaining({
          twilioSubaccountId: "AC_sub",
          twilioPhoneNumber: "+61485010634",
        }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      phoneNumber: "+61485010634",
      bundleSid: "BU_source",
      subaccountSid: "AC_sub",
    });
  });
});
