import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { processBookingReminders } = vi.hoisted(() => ({
  processBookingReminders: vi.fn(),
}));

vi.mock("@/actions/automated-message-actions", () => ({
  processBookingReminders,
}));

import { GET } from "@/app/api/cron/booking-reminders/route";

describe("GET /api/cron/booking-reminders", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
    processBookingReminders.mockResolvedValue({
      sent: 3,
      errors: 1,
      skippedAlreadySent: 2,
    });
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("rejects unauthorized callers when the cron secret does not match", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/booking-reminders"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns reminder processing results for authorized calls", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/booking-reminders", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(processBookingReminders).toHaveBeenCalled();
    expect(await response.json()).toEqual(
      expect.objectContaining({
        ok: true,
        sent: 3,
        errors: 1,
        skippedAlreadySent: 2,
      }),
    );
  });

  it("returns 500 when reminder processing fails", async () => {
    processBookingReminders.mockRejectedValue(new Error("twilio offline"));

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/booking-reminders", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to process booking reminders",
    });
  });
});
