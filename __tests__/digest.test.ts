import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { db, getDealHealth } = vi.hoisted(() => ({
  db: {
    deal: { findMany: vi.fn() },
    task: { findMany: vi.fn() },
  },
  getDealHealth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/pipeline", () => ({ getDealHealth }));

import { generateMorningDigest, generateEveningDigest } from "@/lib/digest";

function makeDeal(overrides: Record<string, unknown> = {}) {
  return {
    id: "deal-1",
    title: "Fix Leaking Tap",
    value: 500,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    contact: { id: "contact-1", name: "Jane Smith" },
    activities: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.deal.findMany.mockResolvedValue([]);
  db.task.findMany.mockResolvedValue([]);
  getDealHealth.mockReturnValue({ status: "FRESH", daysSinceActivity: 1 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("generateMorningDigest", () => {
  it("returns empty items and zero pipeline value for a workspace with no deals or tasks", async () => {
    const digest = await generateMorningDigest("ws-1");
    expect(digest.items).toHaveLength(0);
    expect(digest.totalPipelineValue).toBe(0);
  });

  it("adds a rotting_deal item with priority 1 for a ROTTING deal", async () => {
    db.deal.findMany.mockResolvedValue([makeDeal({ value: 1200 })]);
    getDealHealth.mockReturnValue({ status: "ROTTING", daysSinceActivity: 21 });

    const digest = await generateMorningDigest("ws-1");

    const rottingItems = digest.items.filter(i => i.type === "rotting_deal");
    expect(rottingItems).toHaveLength(1);
    expect(rottingItems[0].priority).toBe(1);
    expect(rottingItems[0].value).toBe(1200);
    expect(rottingItems[0].title).toContain("21d");
  });

  it("adds a stale_deal item with priority 2 for a STALE deal", async () => {
    db.deal.findMany.mockResolvedValue([makeDeal({ value: 800 })]);
    getDealHealth.mockReturnValue({ status: "STALE", daysSinceActivity: 9 });

    const digest = await generateMorningDigest("ws-1");

    const staleItems = digest.items.filter(i => i.type === "stale_deal");
    expect(staleItems).toHaveLength(1);
    expect(staleItems[0].priority).toBe(2);
    expect(staleItems[0].value).toBe(800);
  });

  it("does not add an item for a FRESH deal", async () => {
    db.deal.findMany.mockResolvedValue([makeDeal()]);
    getDealHealth.mockReturnValue({ status: "FRESH", daysSinceActivity: 2 });

    const digest = await generateMorningDigest("ws-1");
    expect(digest.items).toHaveLength(0);
  });

  it("accumulates total pipeline value across all active deals", async () => {
    db.deal.findMany.mockResolvedValue([
      makeDeal({ id: "d1", value: 400 }),
      makeDeal({ id: "d2", value: 600 }),
    ]);
    getDealHealth.mockReturnValue({ status: "FRESH", daysSinceActivity: 1 });

    const digest = await generateMorningDigest("ws-1");
    expect(digest.totalPipelineValue).toBe(1000);
  });

  it("adds overdue_task items with priority 1 for overdue tasks", async () => {
    db.task.findMany
      .mockResolvedValueOnce([
        {
          id: "t1",
          title: "Call back client",
          dueAt: new Date("2026-01-01T00:00:00Z"),
          deal: { id: "deal-1", title: "Fix Tap" },
          contact: null,
          dealId: "deal-1",
          contactId: null,
        },
      ])
      .mockResolvedValueOnce([]);

    const digest = await generateMorningDigest("ws-1");

    const overdueItems = digest.items.filter(i => i.type === "overdue_task");
    expect(overdueItems).toHaveLength(1);
    expect(overdueItems[0].priority).toBe(1);
    expect(overdueItems[0].title).toContain("Call back client");
    expect(overdueItems[0].description).toContain("Fix Tap");
  });

  it("adds follow_up items for tasks due today", async () => {
    db.task.findMany
      .mockResolvedValueOnce([]) // overdue
      .mockResolvedValueOnce([
        {
          id: "t2",
          title: "Send quote",
          dueAt: new Date(),
          deal: null,
          contact: { name: "Bob" },
          dealId: null,
          contactId: "c1",
        },
      ]);

    const digest = await generateMorningDigest("ws-1");

    const followUps = digest.items.filter(i => i.type === "follow_up");
    expect(followUps).toHaveLength(1);
    expect(followUps[0].description).toContain("Bob");
  });

  it("sorts items by priority ascending, then by value descending", async () => {
    db.deal.findMany.mockResolvedValue([
      makeDeal({ id: "d1", value: 500, title: "Low Value Stale" }),
      makeDeal({ id: "d2", value: 2000, title: "High Value Rotting" }),
    ]);
    getDealHealth
      .mockReturnValueOnce({ status: "STALE", daysSinceActivity: 9 })
      .mockReturnValueOnce({ status: "ROTTING", daysSinceActivity: 20 });

    const digest = await generateMorningDigest("ws-1");

    expect(digest.items[0].type).toBe("rotting_deal"); // priority 1 first
    expect(digest.items[1].type).toBe("stale_deal");   // priority 2 second
  });

  it("returns top 3 action titles", async () => {
    db.deal.findMany.mockResolvedValue([
      makeDeal({ id: "d1", value: 100 }),
      makeDeal({ id: "d2", value: 200 }),
      makeDeal({ id: "d3", value: 300 }),
      makeDeal({ id: "d4", value: 400 }),
    ]);
    getDealHealth.mockReturnValue({ status: "ROTTING", daysSinceActivity: 20 });

    const digest = await generateMorningDigest("ws-1");
    expect(digest.topActions).toHaveLength(3);
  });

  it("includes a date string in Australian locale format", async () => {
    const digest = await generateMorningDigest("ws-1");
    expect(digest.date).toMatch(/\d{4}/); // contains year
  });

  it("returns 'Morning' greeting before noon", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T08:00:00"));
    const digest = await generateMorningDigest("ws-1");
    expect(digest.greeting).toBe("Morning");
  });

  it("returns 'Afternoon' greeting between noon and 5pm", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T14:00:00"));
    const digest = await generateMorningDigest("ws-1");
    expect(digest.greeting).toBe("Afternoon");
  });

  it("returns 'Evening' greeting after 5pm", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T20:00:00"));
    const digest = await generateMorningDigest("ws-1");
    expect(digest.greeting).toBe("Evening");
  });

  it("handles deals with null value (counts as 0)", async () => {
    db.deal.findMany.mockResolvedValue([makeDeal({ value: null })]);
    getDealHealth.mockReturnValue({ status: "FRESH", daysSinceActivity: 1 });

    const digest = await generateMorningDigest("ws-1");
    expect(digest.totalPipelineValue).toBe(0);
  });

  it("handles deals with no contact gracefully", async () => {
    db.deal.findMany.mockResolvedValue([makeDeal({ contact: null })]);
    getDealHealth.mockReturnValue({ status: "ROTTING", daysSinceActivity: 20 });

    const digest = await generateMorningDigest("ws-1");
    expect(digest.items[0].description).toContain("Unknown");
    expect(digest.items[0].contactId).toBeUndefined();
  });
});

describe("generateEveningDigest", () => {
  it("returns the same structure as morning digest but with Evening greeting", async () => {
    const digest = await generateEveningDigest("ws-1");
    expect(digest.greeting).toBe("Evening");
    expect(digest.items).toBeDefined();
    expect(digest.totalPipelineValue).toBeDefined();
  });
});
