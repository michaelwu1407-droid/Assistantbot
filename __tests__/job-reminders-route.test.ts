import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { checkAndSendReminders } = vi.hoisted(() => ({
  checkAndSendReminders: vi.fn(),
}));

vi.mock("@/actions/reminder-actions", () => ({
  checkAndSendReminders,
}));

import { GET } from "@/app/api/cron/job-reminders/route";

describe("GET /api/cron/job-reminders", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
    checkAndSendReminders.mockResolvedValue({
      sent: 5,
      summary: { upcoming: 3, overdue: 2 },
    });
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("rejects unauthorized callers", async () => {
    const response = await GET(new NextRequest("https://earlymark.ai/api/cron/job-reminders"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns reminder summary data when authorized", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/job-reminders", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: true,
        message: "Reminders checked",
        result: {
          sent: 5,
          summary: { upcoming: 3, overdue: 2 },
        },
        summary: { upcoming: 3, overdue: 2 },
      }),
    );
  });

  it("returns 500 with error details when reminder checks fail", async () => {
    checkAndSendReminders.mockRejectedValue(new Error("db offline"));

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/job-reminders", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Failed to check reminders",
        details: "db offline",
      }),
    );
  });
});
