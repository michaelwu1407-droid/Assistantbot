import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  processFollowUpReminders: vi.fn(),
  processPostJobFollowUps: vi.fn(),
}));

vi.mock("@/actions/followup-actions", () => ({
  processFollowUpReminders: hoisted.processFollowUpReminders,
  processPostJobFollowUps: hoisted.processPostJobFollowUps,
}));

import { GET } from "@/app/api/cron/followup-reminders/route";

describe("GET /api/cron/followup-reminders", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
    hoisted.processFollowUpReminders.mockResolvedValue({ reminders: 4 });
    hoisted.processPostJobFollowUps.mockResolvedValue({ sent: 2 });
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("rejects unauthorized callers", async () => {
    const response = await GET(new NextRequest("https://earlymark.ai/api/cron/followup-reminders"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns both follow-up job results for authorized calls", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/followup-reminders", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: true,
        followUpReminders: { reminders: 4 },
        postJobFollowUps: { sent: 2 },
      }),
    );
  });

  it("returns 500 with details when the cron run fails", async () => {
    hoisted.processPostJobFollowUps.mockRejectedValue(new Error("sms failed"));

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/followup-reminders", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Follow-up cron failed",
        details: "sms failed",
      }),
    );
  });
});
