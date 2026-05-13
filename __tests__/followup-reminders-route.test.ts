import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  processFollowUpReminders: vi.fn(),
  processPostJobFollowUps: vi.fn(),
  isOpsAuthorized: vi.fn(),
}));

vi.mock("@/actions/followup-actions", () => ({
  processFollowUpReminders: hoisted.processFollowUpReminders,
  processPostJobFollowUps: hoisted.processPostJobFollowUps,
}));

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized: hoisted.isOpsAuthorized,
  getUnauthorizedJsonResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

import { GET } from "@/app/api/cron/followup-reminders/route";

describe("GET /api/cron/followup-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isOpsAuthorized.mockReturnValue(true);
    hoisted.processFollowUpReminders.mockResolvedValue({ reminders: 4 });
    hoisted.processPostJobFollowUps.mockResolvedValue({ sent: 2 });
  });

  it("rejects unauthorized callers", async () => {
    hoisted.isOpsAuthorized.mockReturnValue(false);

    const response = await GET(new NextRequest("https://earlymark.ai/api/cron/followup-reminders"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns both follow-up job results for authorized calls", async () => {
    const response = await GET(new NextRequest("https://earlymark.ai/api/cron/followup-reminders"));

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

    const response = await GET(new NextRequest("https://earlymark.ai/api/cron/followup-reminders"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Follow-up cron failed",
        details: "sms failed",
      }),
    );
  });
});
