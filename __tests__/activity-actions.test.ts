import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  activity: {
    findMany: vi.fn(),
  },
  voiceCall: {
    findMany: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
  },
  webhookEvent: {
    findMany: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
  },
  deal: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMocks,
}));

import { getActivities } from "@/actions/activity-actions";

describe("getActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.activity.findMany.mockResolvedValue([]);
    dbMocks.voiceCall.findMany.mockResolvedValue([]);
    dbMocks.workspace.findUnique.mockResolvedValue(null);
    dbMocks.webhookEvent.findMany.mockResolvedValue([]);
    dbMocks.contact.findFirst.mockResolvedValue(null);
    dbMocks.deal.findUnique.mockResolvedValue(null);
  });

  it("merges persisted voice calls into workspace activity history and sorts by newest first", async () => {
    dbMocks.activity.findMany.mockResolvedValue([
      {
        id: "activity_1",
        type: "NOTE",
        title: "Job note",
        description: "Older note",
        content: "Customer asked for a quote.",
        createdAt: new Date("2026-03-16T09:00:00.000Z"),
        dealId: "deal_1",
        contactId: "contact_1",
        contact: { name: "Alex", phone: "0400 000 000", email: "alex@example.com" },
        deal: null,
      },
    ]);
    dbMocks.voiceCall.findMany.mockResolvedValue([
      {
        id: "voice_1",
        callType: "normal",
        callerName: "Alex",
        businessName: null,
        callerPhone: "0400 000 000",
        transcriptText: "Hi Tracey, can you help me book in next Tuesday morning?",
        summary: "Customer asked to book a job next Tuesday morning.",
        startedAt: new Date("2026-03-16T10:00:00.000Z"),
        endedAt: new Date("2026-03-16T10:03:00.000Z"),
        contactId: "contact_1",
        contact: { name: "Alex", phone: "0400 000 000", email: "alex@example.com" },
      },
    ]);

    const result = await getActivities({
      workspaceId: "ws_123",
      typeIn: ["CALL", "NOTE"],
      limit: 10,
    });

    expect(dbMocks.voiceCall.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws_123" },
      }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "voice-call:voice_1",
      type: "call",
      title: "Customer call",
      contactId: "contact_1",
      contactName: "Alex",
      channel: "call",
      direction: "inbound",
      durationLabel: "3m",
    });
    expect(result[0]?.content).toContain("book in next Tuesday morning");
    expect(result[0]?.transcript).toContain("book in next Tuesday morning");
    expect(result[1]).toMatchObject({
      id: "activity_1",
      type: "note",
      title: "Job note",
    });
  });

  it("uses the deal's contact context so voice correspondence appears on deal history views", async () => {
    dbMocks.deal.findUnique.mockResolvedValue({
      contactId: "contact_42",
      workspaceId: "ws_123",
    });
    dbMocks.voiceCall.findMany.mockResolvedValue([
      {
        id: "voice_2",
        callType: "inbound_demo",
        callerName: null,
        businessName: "Alexandria Automotive Services",
        callerPhone: "0434 955 958",
        transcriptText: null,
        summary: "Caller asked what Earlymark AI can do for a workshop.",
        startedAt: new Date("2026-03-16T11:00:00.000Z"),
        endedAt: null,
        contactId: "contact_42",
        contact: {
          name: "Michael",
          phone: "0434 955 958",
          email: "michael@example.com",
        },
      },
    ]);

    const result = await getActivities({
      dealId: "deal_42",
      limit: 5,
      typeIn: ["CALL"],
    });

    expect(dbMocks.deal.findUnique).toHaveBeenCalledWith({
      where: { id: "deal_42" },
      select: { contactId: true, workspaceId: true },
    });
    expect(dbMocks.voiceCall.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contactId: "contact_42" },
      }),
    );
    expect(result[0]).toMatchObject({
      title: "Earlymark inbound call",
      contactId: "contact_42",
      contactName: "Michael",
      description: "Caller asked what Earlymark AI can do for a workshop.",
      channel: "call",
      summary: "Caller asked what Earlymark AI can do for a workshop.",
    });
  });
});
