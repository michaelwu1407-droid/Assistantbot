import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    deal: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));

import { GET } from "@/app/api/cron/recurring-jobs/route";

const CRON_SECRET = "test-cron-secret";

function makeRequest() {
  return new NextRequest("https://app.example.com/api/cron/recurring-jobs", {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
}

const ONE_WEEK_AGO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
const JUST_NOW = new Date(Date.now() - 60 * 1000); // 1 min ago

describe("GET /api/cron/recurring-jobs (cron-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    hoisted.db.deal.create.mockResolvedValue({ id: "deal_clone_1" });
    hoisted.db.deal.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when CRON_SECRET does not match", async () => {
    const response = await GET(
      new NextRequest("https://app.example.com/api/cron/recurring-jobs", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(hoisted.db.deal.findMany).not.toHaveBeenCalled();
  });

  it("clones a weekly recurring deal and sets recurrenceLastClonedAt", async () => {
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_1",
        title: "Weekly Lawn Mow",
        value: 120,
        stage: "SCHEDULED",
        address: "1 Main St",
        latitude: -33.8,
        longitude: 151.2,
        workspaceId: "ws_1",
        contactId: "contact_1",
        assignedToId: null,
        scheduledAt: ONE_WEEK_AGO,
        metadata: { recurrence: { unit: "week", interval: 1 } },
      },
    ]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cloned).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.errors).toHaveLength(0);
    expect(hoisted.db.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Weekly Lawn Mow",
          workspaceId: "ws_1",
          contactId: "contact_1",
        }),
      }),
    );
    expect(hoisted.db.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal_1" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            recurrenceLastClonedAt: expect.any(String),
          }),
        }),
      }),
    );
  });

  it("skips a deal that was already cloned recently (idempotency under restart — cron-05)", async () => {
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_2",
        title: "Weekly Lawn Mow",
        value: 120,
        stage: "SCHEDULED",
        address: "1 Main St",
        latitude: -33.8,
        longitude: 151.2,
        workspaceId: "ws_1",
        contactId: "contact_1",
        assignedToId: null,
        scheduledAt: ONE_WEEK_AGO,
        // recurrenceLastClonedAt set just now — not yet elapsed a full week
        metadata: {
          recurrence: { unit: "week", interval: 1 },
          recurrenceLastClonedAt: JUST_NOW.toISOString(),
        },
      },
    ]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cloned).toBe(0);
    expect(hoisted.db.deal.create).not.toHaveBeenCalled();
  });

  it("skips deals whose recurrence end date has passed", async () => {
    const pastEndDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_3",
        title: "Expired Monthly Service",
        value: 200,
        stage: "SCHEDULED",
        address: "2 Oak Ave",
        latitude: -33.9,
        longitude: 151.0,
        workspaceId: "ws_1",
        contactId: "contact_2",
        assignedToId: null,
        scheduledAt: ONE_WEEK_AGO,
        metadata: { recurrence: { unit: "month", interval: 1, endDate: pastEndDate } },
      },
    ]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.skipped).toBe(1);
    expect(hoisted.db.deal.create).not.toHaveBeenCalled();
  });

  it("records errors without crashing when a DB clone fails", async () => {
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_4",
        title: "Failing Job",
        value: 50,
        stage: "SCHEDULED",
        address: null,
        latitude: null,
        longitude: null,
        workspaceId: "ws_1",
        contactId: "contact_3",
        assignedToId: null,
        scheduledAt: ONE_WEEK_AGO,
        metadata: { recurrence: { unit: "week", interval: 1 } },
      },
    ]);
    hoisted.db.deal.create.mockRejectedValue(new Error("DB timeout"));

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("DB timeout");
    expect(body.cloned).toBe(0);
  });
});
