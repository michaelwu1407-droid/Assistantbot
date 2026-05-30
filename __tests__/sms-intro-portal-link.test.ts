import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
  messagesCreate: vi.fn(),
  getWorkspaceTwilioClient: vi.fn(),
  buildPublicJobPortalUrl: vi.fn(),
  assertSafeRecipient: vi.fn((_, v: string) => v),
  withCostCeiling: vi.fn((_label: string, _cost: number, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/twilio", () => ({
  getWorkspaceTwilioClient: hoisted.getWorkspaceTwilioClient,
}));
vi.mock("@/lib/public-job-portal", () => ({
  buildPublicJobPortalUrl: hoisted.buildPublicJobPortalUrl,
}));
vi.mock("@/lib/messaging/safe-recipient", () => ({
  assertSafeRecipient: hoisted.assertSafeRecipient,
}));
vi.mock("@/lib/cost-ceiling", () => ({
  withCostCeiling: hoisted.withCostCeiling,
}));

import { sendIntroSms } from "@/lib/sms";

describe("sendIntroSms (pub-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.db.workspace.findUnique.mockResolvedValue({
      name: "Acme Plumbing",
      twilioPhoneNumber: "+61400111222",
      twilioSubaccountId: "AC_sub",
      twilioSubaccountAuthToken: "auth_tok",
      ownerId: "owner_1",
    });
    hoisted.db.user.findUnique.mockResolvedValue({ name: "Bob Smith" });
    hoisted.db.activity.create.mockResolvedValue({});
    hoisted.buildPublicJobPortalUrl.mockReturnValue(
      "https://earlymark.ai/portal/tok_abc123",
    );
    const twilioMock = {
      messages: { create: hoisted.messagesCreate },
    };
    hoisted.getWorkspaceTwilioClient.mockReturnValue(twilioMock);
    hoisted.messagesCreate.mockResolvedValue({ sid: "SM_001" });
  });

  it("includes the portal tracking URL in the intro SMS body (pub-06)", async () => {
    await sendIntroSms({
      to: "+61411000001",
      workspaceId: "ws_1",
      dealId: "deal_1",
      contactId: "contact_1",
    });

    expect(hoisted.buildPublicJobPortalUrl).toHaveBeenCalledWith({
      dealId: "deal_1",
      contactId: "contact_1",
      workspaceId: "ws_1",
    });
    expect(hoisted.messagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("https://earlymark.ai/portal/tok_abc123"),
        to: "+61411000001",
        from: "+61400111222",
      }),
    );
  });

  it("includes 'Track your job here' copy in the intro SMS body", async () => {
    await sendIntroSms({
      to: "+61411000001",
      workspaceId: "ws_1",
      dealId: "deal_1",
      contactId: "contact_1",
    });

    const body: string = hoisted.messagesCreate.mock.calls[0][0].body;
    expect(body).toContain("Track your job here:");
  });

  it("records the portal link send as an activity", async () => {
    await sendIntroSms({
      to: "+61411000001",
      workspaceId: "ws_1",
      dealId: "deal_1",
      contactId: "contact_1",
    });

    expect(hoisted.db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactId: "contact_1",
          dealId: "deal_1",
          description: "Automated introductory message with portal link",
        }),
      }),
    );
  });
});
