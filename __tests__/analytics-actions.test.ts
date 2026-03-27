import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";

const dbMocks = vi.hoisted(() => ({
  deal: { findMany: vi.fn() },
  contact: { count: vi.fn(), findMany: vi.fn() },
  customerFeedback: { aggregate: vi.fn(), findMany: vi.fn() },
  user: { count: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  db: dbMocks,
}));

import { getReportsData } from "@/actions/analytics-actions";

describe("getReportsData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T10:00:00.000Z"));
    vi.clearAllMocks();

    dbMocks.contact.count
      .mockResolvedValueOnce(14);
    dbMocks.contact.findMany.mockResolvedValue([
      { id: "contact-1" },
      { id: "contact-2" },
      { id: "contact-3" },
    ]);
    dbMocks.customerFeedback.aggregate.mockResolvedValue({
      _avg: { score: 4.25 },
    });
    dbMocks.customerFeedback.findMany
      .mockResolvedValueOnce([
        { contactId: "contact-1", score: 4, createdAt: new Date("2026-02-20T10:00:00.000Z") },
        { contactId: "contact-2", score: 5, createdAt: new Date("2026-03-05T10:00:00.000Z") },
        { contactId: "contact-3", score: 4, createdAt: new Date("2026-03-10T10:00:00.000Z") },
      ])
      .mockResolvedValueOnce([
        {
          id: "fb-1",
          score: 4,
          comment: "Friendly service",
          createdAt: new Date("2026-03-10T10:00:00.000Z"),
          contact: { name: "John Smith" },
          deal: { title: "Tyre replacement" },
        },
        {
          id: "fb-2",
          score: 5,
          comment: null,
          createdAt: new Date("2026-03-05T10:00:00.000Z"),
          contact: { name: "Jane Roe" },
          deal: { title: "Brake check" },
        },
      ]);
    dbMocks.user.count.mockResolvedValue(2);
    dbMocks.deal.findMany.mockResolvedValue([
      {
        id: "deal-current-1",
        stage: "WON",
        value: 400,
        contactId: "contact-1",
        invoicedAmount: 450,
        stageChangedAt: new Date("2026-03-10T10:00:00.000Z"),
        createdAt: new Date("2026-03-01T09:00:00.000Z"),
        metadata: { source: "website" },
        assignedTo: { id: "user-1", name: "Alice" },
      },
      {
        id: "deal-current-2",
        stage: "WON",
        value: 550,
        contactId: "contact-2",
        invoicedAmount: null,
        stageChangedAt: new Date("2026-03-05T10:00:00.000Z"),
        createdAt: new Date("2026-02-26T09:00:00.000Z"),
        metadata: { leadSource: "hipages" },
        assignedTo: { id: "user-2", name: "Bob" },
      },
      {
        id: "deal-previous",
        stage: "WON",
        value: 300,
        contactId: "contact-4",
        invoicedAmount: 300,
        stageChangedAt: new Date("2026-02-02T10:00:00.000Z"),
        createdAt: new Date("2026-01-25T09:00:00.000Z"),
        metadata: { source: "phone" },
        assignedTo: { id: "user-1", name: "Alice" },
      },
      {
        id: "deal-pipeline",
        stage: "CONTACTED",
        value: 100,
        contactId: "contact-5",
        invoicedAmount: null,
        stageChangedAt: new Date("2026-03-12T10:00:00.000Z"),
        createdAt: new Date("2026-03-12T09:00:00.000Z"),
        metadata: {},
        assignedTo: null,
      },
      {
        id: "deal-manual-scheduled",
        stage: "SCHEDULED",
        value: 200,
        contactId: "contact-6",
        invoicedAmount: null,
        stageChangedAt: new Date("2026-03-11T10:00:20.000Z"),
        createdAt: new Date("2026-03-11T10:00:00.000Z"),
        metadata: {},
        assignedTo: null,
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the selected day range and compares revenue to the previous equal-length window", async () => {
    const result = await getReportsData("ws_123", "30d");
    const now = new Date("2026-03-17T10:00:00.000Z");
    const rangeStart = startOfDay(subDays(now, 29));
    const comparisonDays = differenceInCalendarDays(now, rangeStart) + 1;
    const previousRangeStart = startOfDay(subDays(rangeStart, comparisonDays));

    expect(dbMocks.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "ws_123",
          OR: [
            { createdAt: { gte: previousRangeStart } },
            { stageChangedAt: { gte: previousRangeStart } },
          ],
        }),
      }),
    );
    expect(result.revenue.total).toBe(1000);
    expect(result.revenue.growth).toBeCloseTo(((1000 - 300) / 300) * 100, 5);
    expect(result.deals.total).toBe(4);
    expect(result.jobs.completed).toBe(2);
    expect(result.customers.inRange).toBe(5);
    expect(result.customers.satisfaction).toBe(4.3);
    expect(result.customers.ratingCount).toBe(3);
  });

  it("excludes manual jobs created directly at a scheduled stage from jobs won with Tracey", async () => {
    const result = await getReportsData("ws_123", "30d");

    expect(result.jobs.wonWithTracey).toBe(2);
    expect(result.team.performance).toEqual([
      { name: "Bob", jobs: 1, revenue: 550 },
      { name: "Alice", jobs: 1, revenue: 450 },
    ]);
  });
});
