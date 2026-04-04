import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    businessProfile: {
      findFirst: vi.fn(),
    },
    businessKnowledge: {
      findMany: vi.fn(),
    },
    deal: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db }));

import { saveTriageRecommendation, triageIncomingLead } from "@/lib/ai/triage";

describe("triage policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.businessProfile.findFirst.mockResolvedValue(null);
    db.businessKnowledge.findMany.mockResolvedValue([]);
    db.deal.findFirst.mockResolvedValue(null);
    db.deal.update.mockResolvedValue({ contactId: "contact_1" });
  });

  it("holds negative-scope leads for review instead of declining them", async () => {
    db.businessKnowledge.findMany
      .mockResolvedValueOnce([{ ruleContent: "roofing" }])
      .mockResolvedValueOnce([]);

    const result = await triageIncomingLead("ws_1", {
      title: "Need roofing repair",
      address: "12 Test St, Sydney NSW 2000",
    });

    expect(result.recommendation).toBe("HOLD_REVIEW");
    expect(result.flags).toContain("Needs review: roofing");
  });

  it("holds out-of-area leads for review instead of declining them", async () => {
    db.businessProfile.findFirst.mockResolvedValue({
      baseSuburb: "Sydney",
      serviceRadius: 20,
      serviceSuburbs: [],
    });
    db.deal.findFirst.mockResolvedValue({
      latitude: -33.8688,
      longitude: 151.2093,
    });
    db.businessKnowledge.findMany.mockResolvedValue([]);

    const result = await triageIncomingLead("ws_1", {
      title: "Blocked drain",
      address: "1 Faraway Rd, Newcastle NSW 2300",
      latitude: -32.9283,
      longitude: 151.7817,
    });

    expect(result.recommendation).toBe("HOLD_REVIEW");
    expect(result.flags[0]).toMatch(/Needs review:/);
  });

  it("logs a visible note when a lead is held for review", async () => {
    await saveTriageRecommendation("deal_1", {
      recommendation: "HOLD_REVIEW",
      flags: ["Needs review: Missing address", "Needs review: after-hours"],
    });

    expect(db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: {
        aiTriageRecommendation: "HOLD_REVIEW",
        agentFlags: ["Needs review: Missing address", "Needs review: after-hours"],
      },
      select: {
        contactId: true,
      },
    });
    expect(db.activity.create).toHaveBeenCalledWith({
      data: {
        type: "NOTE",
        title: "Lead held for review",
        content: "Needs review: Missing address\nNeeds review: after-hours",
        dealId: "deal_1",
        contactId: "contact_1",
      },
    });
  });
});
