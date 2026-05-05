import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, fuzzySearch } = vi.hoisted(() => ({
  db: {
    contact: { findMany: vi.fn() },
    deal: { findMany: vi.fn() },
    task: { findMany: vi.fn() },
    activity: { findMany: vi.fn() },
    voiceCall: { findMany: vi.fn() },
  },
  fuzzySearch: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/search", () => ({ fuzzySearch }));

import { globalSearch } from "@/actions/search-actions";

describe("search-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));
  });

  it("returns no results for short or blank queries", async () => {
    await expect(globalSearch("ws_1", " ")).resolves.toEqual([]);
    await expect(globalSearch("ws_1", "a")).resolves.toEqual([]);

    expect(db.contact.findMany).not.toHaveBeenCalled();
    expect(fuzzySearch).not.toHaveBeenCalled();
  });

  it("queries all candidate sources and maps fuzzy-ranked results", async () => {
    db.contact.findMany.mockResolvedValue([
      {
        id: "contact_1",
        name: "Alex Smith",
        email: "alex@example.com",
        company: "Acme Plumbing",
        phone: "0400000000",
      },
    ]);
    db.deal.findMany.mockResolvedValue([
      {
        id: "deal_1",
        title: "Kitchen plumbing",
        value: 1250,
        stage: "NEGOTIATION",
        address: "1 George St",
        contact: { name: "Alex Smith", company: "Acme Plumbing" },
      },
    ]);
    db.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        title: "Call Alex",
        description: "Discuss quote",
        dueAt: new Date("2026-04-05T00:00:00.000Z"),
        dealId: "deal_1",
        contactId: "contact_1",
      },
    ]);
    db.activity.findMany.mockResolvedValue([
      {
        id: "activity_1",
        title: "Quoted job",
        content: "Sent quote yesterday",
        description: "Quote follow-up",
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        dealId: "deal_1",
        contactId: "contact_1",
        contact: { name: "Alex Smith" },
      },
    ]);
    db.voiceCall.findMany.mockResolvedValue([
      {
        id: "call_1",
        callId: "CA123",
        callType: "inbound",
        callerName: "Alex Smith",
        businessName: null,
        callerPhone: "0400000000",
        transcriptText: "Need help with kitchen plumbing and quote.",
        contactId: "contact_1",
        startedAt: new Date("2026-04-02T09:00:00.000Z"),
      },
    ]);
    fuzzySearch.mockImplementation((candidates) => [
      { item: candidates[1], score: 0.94 },
      { item: candidates[0], score: 0.89 },
      { item: candidates[4], score: 0.73 },
    ]);

    const results = await globalSearch("ws_1", "alex");

    expect(db.contact.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws_1",
        OR: [
          { name: { contains: "alex", mode: "insensitive" } },
          { email: { contains: "alex", mode: "insensitive" } },
          { company: { contains: "alex", mode: "insensitive" } },
          { phone: { contains: "alex", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, company: true, phone: true },
      take: 8,
    });
    expect(db.voiceCall.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws_1",
        OR: [
          { callerName: { contains: "alex", mode: "insensitive" } },
          { businessName: { contains: "alex", mode: "insensitive" } },
          { callerPhone: { contains: "alex", mode: "insensitive" } },
          { transcriptText: { contains: "alex", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        callId: true,
        callType: true,
        callerName: true,
        businessName: true,
        callerPhone: true,
        transcriptText: true,
        contactId: true,
        startedAt: true,
      },
      take: 6,
      orderBy: { startedAt: "desc" },
    });
    expect(fuzzySearch).toHaveBeenCalledWith(expect.any(Array), "alex", 0.35);
    expect(results).toEqual([
      {
        id: "deal_1",
        type: "deal",
        title: "Kitchen plumbing",
        subtitle: "Scheduled • $1,250",
        url: "/crm/deals/deal_1",
        score: 0.94,
      },
      {
        id: "contact_1",
        type: "contact",
        title: "Alex Smith",
        subtitle: "Acme Plumbing",
        url: "/crm/contacts/contact_1",
        score: 0.89,
      },
      {
        id: "call_1",
        type: "call",
        title: "Alex Smith (inbound)",
        subtitle: "Need help with kitchen plumbing and quote.",
        url: "/crm/contacts/contact_1",
        score: 0.73,
      },
    ]);
  });
});
