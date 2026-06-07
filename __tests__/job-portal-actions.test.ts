import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    deal: { findUnique: vi.fn(), update: vi.fn() },
    activity: { findFirst: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
    webhookEvent: { create: vi.fn() },
    invoice: { findFirst: vi.fn(), update: vi.fn() },
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

import { getJobPortalStatus, acceptQuote, confirmPayment } from "@/actions/job-portal-actions";

const PAYLOAD = { dealId: "deal_1", contactId: "contact_1", workspaceId: "ws_1" };

const BASE_DEAL = {
  id: "deal_1",
  title: "Hot Water Fix",
  stage: "CONTACTED",
  jobStatus: null,
  scheduledAt: null,
  contactId: "contact_1",
  workspaceId: "ws_1",
  value: null,
  metadata: {},
  invoices: [],
  workspace: {
    name: "Earlymark Plumbing",
    twilioPhoneNumber: "+61485010634",
    workspaceTimezone: "Australia/Sydney",
  },
};

describe("getJobPortalStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.verifyPublicJobPortalToken.mockReturnValue(PAYLOAD);
    hoisted.db.deal.findUnique.mockResolvedValue({
      ...BASE_DEAL,
      jobStatus: "COMPLETED",
      scheduledAt: new Date("2026-04-06T01:30:00.000Z"),
    });
    hoisted.db.activity.findFirst.mockResolvedValue(null);
    hoisted.db.activity.create.mockResolvedValue({ id: "activity_1" });
    hoisted.db.webhookEvent.create.mockResolvedValue({});
    hoisted.buildPublicFeedbackUrl.mockReturnValue("https://earlymark.ai/feedback/token_123");
  });

  it("returns portal status, feedback handoff, and logs the first portal view", async () => {
    const result = await getJobPortalStatus("token_123");

    expect(result?.title).toBe("Hot Water Fix");
    expect(result?.isComplete).toBe(true);
    expect(result?.feedbackUrl).toContain("feedback");
    expect(hoisted.db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "Job portal viewed" }) })
    );
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

  it("surfaces isQuote=true and quoteValue for CONTACTED stage deals", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({ ...BASE_DEAL, value: 850 });

    const result = await getJobPortalStatus("token_123");

    expect(result?.isQuote).toBe(true);
    expect(result?.quoteValue).toBe(850);
    expect(result?.quoteAccepted).toBe(false);
  });

  it("surfaces quoteAccepted=true when metadata.quoteAcceptedAt is set", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      ...BASE_DEAL,
      metadata: { quoteAcceptedAt: "2026-05-27T10:00:00Z" },
    });

    const result = await getJobPortalStatus("token_123");

    expect(result?.quoteAccepted).toBe(true);
  });
});

describe("acceptQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.verifyPublicJobPortalToken.mockReturnValue(PAYLOAD);
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      stage: "CONTACTED",
      contactId: "contact_1",
      workspaceId: "ws_1",
      title: "Hot Water Fix",
      metadata: {},
    });
    hoisted.db.deal.update.mockResolvedValue({});
    hoisted.db.activity.create.mockResolvedValue({ id: "act_1" });
    hoisted.db.user.findFirst.mockResolvedValue({ id: "user_1" });
    hoisted.db.notification.create.mockResolvedValue({ id: "notif_1" });
  });

  it("marks quoteAcceptedAt, logs activity, and notifies owner", async () => {
    const result = await acceptQuote("token_123");

    expect(result).toEqual({ success: true });
    expect(hoisted.db.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal_1" },
        data: { metadata: expect.objectContaining({ quoteAcceptedAt: expect.any(String) }) },
      })
    );
    expect(hoisted.db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Quote accepted by customer", dealId: "deal_1" }),
      })
    );
    expect(hoisted.db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Quote accepted", userId: "user_1" }),
      })
    );
  });

  it("returns error for invalid token", async () => {
    hoisted.verifyPublicJobPortalToken.mockReturnValue(null);

    const result = await acceptQuote("bad_token");

    expect(result).toEqual({ success: false, error: "Invalid or expired link" });
    expect(hoisted.db.deal.findUnique).not.toHaveBeenCalled();
  });

  it("returns error when deal is not found", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue(null);

    const result = await acceptQuote("token_123");

    expect(result).toEqual({ success: false, error: "Not found" });
    expect(hoisted.db.deal.update).not.toHaveBeenCalled();
  });

  it("returns error when deal belongs to a different contact", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1", stage: "CONTACTED", contactId: "other_contact",
      workspaceId: "ws_1", title: "Fix", metadata: {},
    });

    const result = await acceptQuote("token_123");

    expect(result).toEqual({ success: false, error: "Not found" });
  });

  it("returns error when deal stage is not CONTACTED", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1", stage: "SCHEDULED", contactId: "contact_1",
      workspaceId: "ws_1", title: "Fix", metadata: {},
    });

    const result = await acceptQuote("token_123");

    expect(result).toEqual({ success: false, error: "This quote is no longer pending" });
    expect(hoisted.db.deal.update).not.toHaveBeenCalled();
  });

  it("succeeds even when no workspace owner is found", async () => {
    hoisted.db.user.findFirst.mockResolvedValue(null);

    const result = await acceptQuote("token_123");

    expect(result).toEqual({ success: true });
    expect(hoisted.db.notification.create).not.toHaveBeenCalled();
  });
});

describe("confirmPayment", () => {
  const INVOICE = {
    id: "inv_1",
    number: "INV-001",
    total: 750,
    dealId: "deal_1",
    deal: { title: "Hot Water Fix", contactId: "contact_1", workspaceId: "ws_1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.verifyPublicJobPortalToken.mockReturnValue(PAYLOAD);
    hoisted.db.deal.update.mockResolvedValue({});
    hoisted.db.invoice.findFirst.mockResolvedValue(INVOICE);
    hoisted.db.invoice.update.mockResolvedValue({});
    hoisted.db.activity.create.mockResolvedValue({ id: "act_1" });
    hoisted.db.user.findFirst.mockResolvedValue({ id: "user_1" });
    hoisted.db.notification.create.mockResolvedValue({ id: "notif_1" });
  });

  it("marks invoice PAID, moves deal to WON, logs Activity, and notifies owner", async () => {
    const result = await confirmPayment("token_123");

    expect(result).toEqual({ success: true });
    expect(hoisted.db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv_1" },
        data: expect.objectContaining({ status: "PAID" }),
      })
    );
    expect(hoisted.db.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stage: "WON" } })
    );
    expect(hoisted.db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Customer confirmed payment" }),
      })
    );
    expect(hoisted.db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Payment confirmed", type: "SUCCESS" }),
      })
    );
  });

  it("returns error for invalid token", async () => {
    hoisted.verifyPublicJobPortalToken.mockReturnValue(null);
    const result = await confirmPayment("bad_token");

    expect(result).toEqual({ success: false, error: "Invalid or expired link" });
  });

  it("returns error when no ISSUED invoice found", async () => {
    hoisted.db.invoice.findFirst.mockResolvedValue(null);
    const result = await confirmPayment("token_123");

    expect(result).toEqual({ success: false, error: "No outstanding invoice found" });
    expect(hoisted.db.invoice.update).not.toHaveBeenCalled();
  });

  it("succeeds without notification when no workspace owner found", async () => {
    hoisted.db.user.findFirst.mockResolvedValue(null);
    const result = await confirmPayment("token_123");

    expect(result).toEqual({ success: true });
    expect(hoisted.db.notification.create).not.toHaveBeenCalled();
  });
});
