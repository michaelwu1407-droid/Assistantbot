import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchContacts, db } = vi.hoisted(() => ({
  searchContacts: vi.fn(),
  db: {
    activity: { findMany: vi.fn() },
    chatMessage: { findMany: vi.fn() },
    deal: { findMany: vi.fn() },
  },
}));

vi.mock("@/actions/contact-actions", () => ({
  searchContacts,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

import { runGetClientContext, runGetSchedule } from "@/actions/agent-tools";

describe("agent tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.activity.findMany.mockResolvedValue([]);
    db.chatMessage.findMany.mockResolvedValue([]);
    db.deal.findMany.mockResolvedValue([]);
  });

  it("prefers the exact live contact match over similarly prefixed names", async () => {
    searchContacts
      .mockResolvedValueOnce([
        {
          id: "contact_noise",
          name: "ZZZ AUTO livefull_after_fastpath Charlie Dental",
          email: "noise@example.com",
          phone: "0290011001",
          company: null,
          address: null,
        },
        {
          id: "contact_exact",
          name: "ZZZ AUTO LIVE Alex Harper",
          email: "alex@example.com",
          phone: "0400000000",
          company: null,
          address: "1 Test St",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "contact_exact",
          name: "ZZZ AUTO LIVE Alex Harper",
          email: "alex@example.com",
          phone: "0400000000",
          company: null,
          address: "1 Test St",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "contact_exact",
          name: "ZZZ AUTO LIVE Alex Harper",
          email: "alex@example.com",
          phone: "0400000000",
          company: null,
          address: "1 Test St",
        },
      ]);

    const result = await runGetClientContext("ws_1", { clientName: "ZZZ AUTO LIVE Alex Harper" });

    expect(result.client?.id).toBe("contact_exact");
    expect(result.client?.name).toBe("ZZZ AUTO LIVE Alex Harper");
  });

  it("returns ambiguous matches when multiple equally strong contacts exist", async () => {
    searchContacts
      .mockResolvedValueOnce([
        {
          id: "contact_1",
          name: "Alex Harper",
          email: "alex.one@example.com",
          phone: "0400000001",
          company: "Alpha Plumbing",
          address: null,
        },
        {
          id: "contact_2",
          name: "Alex Harper",
          email: "alex.two@example.com",
          phone: "0400000002",
          company: "Beta Electrical",
          address: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "contact_1",
          name: "Alex Harper",
          email: "alex.one@example.com",
          phone: "0400000001",
          company: "Alpha Plumbing",
          address: null,
        },
        {
          id: "contact_2",
          name: "Alex Harper",
          email: "alex.two@example.com",
          phone: "0400000002",
          company: "Beta Electrical",
          address: null,
        },
      ]);

    const result = await runGetClientContext("ws_1", { clientName: "Alex Harper" });

    expect(result.client).toBeNull();
    expect(result.ambiguousMatches).toHaveLength(2);
    expect(result.ambiguousMatches?.[0]).toMatchObject({
      name: "Alex Harper",
      phone: "0400000001",
      company: "Alpha Plumbing",
    });
  });

  it("treats date-only schedule ranges as workspace-local calendar days", async () => {
    db.deal.findMany.mockResolvedValueOnce([
      {
        id: "deal_1",
        title: "Sydney Morning Job",
        address: "123 Test Street",
        scheduledAt: new Date("2026-04-13T00:30:00.000Z"),
        jobStatus: null,
        value: 321,
        contact: { name: "Alex Customer" },
      },
    ]);

    const result = await runGetSchedule("ws_1", {
      startDate: "2026-04-13",
      endDate: "2026-04-13",
      workspaceTimezone: "Australia/Sydney",
    });

    expect(db.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledAt: {
            gte: new Date("2026-04-12T14:00:00.000Z"),
            lte: new Date("2026-04-13T13:59:00.000Z"),
          },
        }),
      }),
    );
    expect(result.jobs[0]).toMatchObject({
      scheduledAt: "2026-04-13T00:30:00.000Z",
      scheduledAtLocal: "Apr 13, 2026 10:30 AM",
    });
    expect(result.timezone).toBe("Australia/Sydney");
  });
});
