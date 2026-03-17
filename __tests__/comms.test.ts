import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  db,
  createTwilioSubaccount,
  getSubaccountClient,
  resolveAuMobileBusinessBundleSidForAccount,
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
  createTwilioSubaccount: vi.fn(),
  getSubaccountClient: vi.fn(),
  resolveAuMobileBusinessBundleSidForAccount: vi.fn(),
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
  resolveAuMobileBusinessBundleSidForAccount,
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
  const subClient = {
    availablePhoneNumbers: vi.fn(() => ({
      mobile: {
        list: mobileList,
      },
    })),
    incomingPhoneNumbers,
    trunking: {
      v1: {
        trunks,
      },
    },
    usage: {
      triggers: {
        create: usageTriggerCreate,
      },
    },
    addresses: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = "AC_master";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.LIVEKIT_SIP_URI = "sip:earlymark@sip.livekit.cloud";

    db.workspace.findUnique.mockResolvedValue({
      twilioSubaccountId: "AC_sub",
      twilioSubaccountAuthToken: "auth-token",
      twilioRegulatoryAddressSid: null,
      ownerId: "user_123",
      location: "123 Test St, Alexandria NSW 2015",
      settings: {},
    });
    db.workspace.update.mockResolvedValue({});
    db.activity.create.mockResolvedValue({});
    db.user.findUnique.mockResolvedValue({
      businessProfile: {
        physicalAddress: "123 Test St, Alexandria NSW 2015",
      },
    });

    buildManagedVoiceNumberFriendlyName.mockReturnValue("Managed Friendly Name");
    getExpectedVoiceGatewayUrl.mockReturnValue("https://app.example.com/api/webhooks/twilio-voice-gateway");
    getExpectedSmsWebhookUrl.mockReturnValue("https://app.example.com/api/twilio/webhook");
    resolveAuMobileBusinessBundleSidForAccount.mockResolvedValue("BU_sub");
    getSubaccountClient.mockReturnValue(subClient);
    mobileList.mockResolvedValue([{ phoneNumber: "+61485010634" }]);
    incomingCreate.mockResolvedValue({ sid: "PN_123", phoneNumber: "+61485010634" });
    incomingUpdate.mockResolvedValue({});
    incomingRemove.mockResolvedValue(true);
    trunkCreate.mockResolvedValue({ sid: "TK_123" });
    originationCreate.mockResolvedValue({});
    trunkRemove.mockResolvedValue(true);
    usageTriggerCreate.mockResolvedValue({});
    subClient.addresses.create.mockResolvedValue({ sid: "AD_123" });
  });

  it("reuses a persisted workspace subaccount instead of creating a new one", async () => {
    const result = await initializeTradieComms(
      "ws_123",
      "Alexandria Automotive Services",
      "+61434955958",
    );

    expect(createTwilioSubaccount).not.toHaveBeenCalled();
    expect(getSubaccountClient).toHaveBeenCalledWith("AC_sub", "auth-token");
    expect(resolveAuMobileBusinessBundleSidForAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        targetAccountSid: "AC_sub",
      }),
    );
    expect(db.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws_123" },
        data: expect.objectContaining({
          twilioSubaccountId: "AC_sub",
          twilioSubaccountAuthToken: "auth-token",
          twilioPhoneNumber: "+61485010634",
        }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      phoneNumber: "+61485010634",
      bundleSid: "BU_sub",
      subaccountSid: "AC_sub",
    });
  });
});
