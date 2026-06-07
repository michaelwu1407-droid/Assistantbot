import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    deal: { findMany: vi.fn() },
    automatedMessageRule: { findFirst: vi.fn() },
    activity: { findFirst: vi.fn(), create: vi.fn() },
  },
  runIdempotent: vi.fn(),
  sendSMS: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/idempotency", () => ({ runIdempotent: hoisted.runIdempotent }));
vi.mock("@/actions/messaging-actions", () => ({ sendSMS: hoisted.sendSMS }));
vi.mock("@/actions/notification-actions", () => ({ createNotification: vi.fn(), shouldSendNotificationEmail: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/messaging/safe-recipient", () => ({ assertSafeRecipient: vi.fn((_: string, value: string) => value) }));
vi.mock("@/lib/cost-ceiling", () => ({ withCostCeiling: vi.fn(async (_a: string, _b: number, fn: () => Promise<unknown>) => fn()) }));

import { processPostJobFollowUps } from "@/actions/followup-actions";

const completedAt = new Date("2026-05-17T08:00:00.000Z");
const sampleDeal = {
  id: "deal_1",
  title: "Fix sink",
  contactId: "contact_1",
  workspaceId: "ws_1",
  stageChangedAt: completedAt,
  contact: { name: "Michael", phone: "+61434955958" },
  workspace: { name: "Friendly Plumbing" },
};

describe("processPostJobFollowUps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.db.deal.findMany.mockResolvedValue([sampleDeal]);
    hoisted.db.automatedMessageRule.findFirst.mockResolvedValue({
      enabled: true,
      messageTemplate: "Hi {{clientName}}, thanks for {{jobTitle}}.",
    });
    hoisted.sendSMS.mockResolvedValue({ success: true });
    hoisted.runIdempotent.mockImplementation(async ({ resultFactory }) => {
      const result = await resultFactory();
      return { idempotencyKey: "k", created: true, result };
    });
  });

  it("routes the send through runIdempotent with a stable per-deal key", async () => {
    await processPostJobFollowUps();

    expect(hoisted.runIdempotent).toHaveBeenCalledTimes(1);
    const args = hoisted.runIdempotent.mock.calls[0][0];
    expect(args.actionType).toBe("POST_JOB_FOLLOWUP");
    expect(args.parts).toEqual(["deal_1"]);
    expect(args.bucketAt).toBe(completedAt);
  });

  it("counts a duplicate claim as skipped without sending again", async () => {
    hoisted.runIdempotent.mockResolvedValue({
      idempotencyKey: "k",
      created: false,
      result: { success: true },
    });

    const result = await processPostJobFollowUps();

    expect(hoisted.sendSMS).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("does not write an activity row when sendSMS fails", async () => {
    hoisted.sendSMS.mockResolvedValue({ success: false, error: "Twilio down" });

    const result = await processPostJobFollowUps();

    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("caps the deal scan with a take limit so a backlog can't OOM the cron", async () => {
    await processPostJobFollowUps();

    const findManyCall = hoisted.db.deal.findMany.mock.calls[0][0];
    expect(typeof findManyCall.take).toBe("number");
    expect(findManyCall.take).toBeGreaterThan(0);
  });
});
