import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { processBookingReminders, isOpsAuthorized } = vi.hoisted(() => ({
  processBookingReminders: vi.fn(),
  isOpsAuthorized: vi.fn(),
}));

vi.mock("@/actions/automated-message-actions", () => ({
  processBookingReminders,
}));

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized,
  getUnauthorizedJsonResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

import { GET } from "@/app/api/cron/booking-reminders/route";

describe("GET /api/cron/booking-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
    processBookingReminders.mockResolvedValue({
      sent: 3,
      errors: 1,
      skippedAlreadySent: 2,
    });
  });

  it("rejects unauthorized callers when the cron secret does not match", async () => {
    isOpsAuthorized.mockReturnValue(false);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/booking-reminders"),
    );

    expect(response.status).toBe(403);
    expect(processBookingReminders).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns reminder processing results for authorized calls", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/booking-reminders"),
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

    const response = await GET(new NextRequest("https://earlymark.ai/api/cron/booking-reminders"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to process booking reminders",
    });
  });
});
