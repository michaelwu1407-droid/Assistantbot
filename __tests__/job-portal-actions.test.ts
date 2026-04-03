import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    deal: {
      findUnique: vi.fn(),
    },
    activity: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  verifyPublicJobPortalToken: vi.fn(),
  buildPublicFeedbackUrl: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/public-job-portal", () => ({
  verifyPublicJobPortalToken: hoisted.verifyPublicJobPortalToken,
}));
vi.mock("@/lib/public-feedback", () => ({
  buildPublicFeedbackUrl: hoisted.buildPublicFeedbackUrl,
}));

import { getJobPortalStatus } from "@/actions/job-portal-actions";

describe("getJobPortalStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.verifyPublicJobPortalToken.mockReturnValue({
      dealId: "deal_1",
      contactId: "contact_1",
      workspaceId: "ws_1",
    });
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Hot Water Fix",
      jobStatus: "COMPLETED",
      scheduledAt: new Date("2026-04-06T01:30:00.000Z"),
      contactId: "contact_1",
      workspaceId: "ws_1",
      workspace: {
        name: "Earlymark Plumbing",
        twilioPhoneNumber: "+61485010634",
        workspaceTimezone: "Australia/Sydney",
      },
    });
    hoisted.db.activity.findFirst.mockResolvedValue(null);
    hoisted.db.activity.create.mockResolvedValue({ id: "activity_1" });
    hoisted.buildPublicFeedbackUrl.mockReturnValue("https://earlymark.ai/feedback/token_123");
  });

  it("returns portal status, feedback handoff, and logs the first portal view", async () => {
    const result = await getJobPortalStatus("token_123");

    expect(result).toEqual({
      jobStatus: "COMPLETED",
      scheduledAt: expect.any(String),
      title: "Hot Water Fix",
      businessName: "Earlymark Plumbing",
      businessPhone: "+61485010634",
      isComplete: true,
      isCancelled: false,
      feedbackUrl: "https://earlymark.ai/feedback/token_123",
    });
    expect(hoisted.db.activity.findFirst).toHaveBeenCalledWith({
      where: {
        dealId: "deal_1",
        title: "Job portal viewed",
        createdAt: {
          gte: expect.any(Date),
        },
      },
      select: { id: true },
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Job portal viewed",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    });
  });

  it("skips duplicate portal-view logging within the recent window", async () => {
    hoisted.db.activity.findFirst.mockResolvedValue({ id: "activity_existing" });

    await getJobPortalStatus("token_123");

    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
  });

  it("returns null when the signed token is invalid", async () => {
    hoisted.verifyPublicJobPortalToken.mockReturnValue(null);

    const result = await getJobPortalStatus("bad_token");

    expect(result).toBeNull();
    expect(hoisted.db.deal.findUnique).not.toHaveBeenCalled();
  });
});
