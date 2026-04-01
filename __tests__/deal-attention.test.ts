import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock deal-utils so we can control overdue detection independently
const { getOverdueStyling } = vi.hoisted(() => ({
  getOverdueStyling: vi.fn(),
}));

vi.mock("@/lib/deal-utils", () => ({
  getOverdueStyling,
}));

import {
  getAttentionSignalsForDeal,
  countAttentionRequiredDeals,
  type AttentionDealInput,
} from "@/lib/deal-attention";

function makeHealthy(overrides: Partial<AttentionDealInput> = {}): AttentionDealInput {
  return {
    id: "deal-1",
    title: "Fix leaking tap",
    stage: "SCHEDULED",
    health: { status: "HEALTHY" },
    scheduledAt: null,
    actualOutcome: null,
    metadata: {},
    ...overrides,
  };
}

beforeEach(() => {
  // Default: not overdue
  getOverdueStyling.mockReturnValue({ badgeText: "", borderClass: "", badgeTitle: "", badgeClass: "", severity: "none" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getAttentionSignalsForDeal", () => {
  it("returns empty array for a healthy deal with no signals", () => {
    const signals = getAttentionSignalsForDeal(makeHealthy());
    expect(signals).toHaveLength(0);
  });

  it("returns overdue signal when getOverdueStyling returns badgeText", () => {
    getOverdueStyling.mockReturnValue({ badgeText: "Overdue", borderClass: "border-red-500", badgeTitle: "3 days", badgeClass: "bg-red-500", severity: "critical" });
    const signals = getAttentionSignalsForDeal(makeHealthy());
    expect(signals).toContainEqual({ key: "overdue", label: "Overdue" });
  });

  it("returns stale signal when health status is STALE", () => {
    const signals = getAttentionSignalsForDeal(makeHealthy({ health: { status: "STALE" } }));
    expect(signals).toContainEqual({ key: "stale", label: "Stale" });
  });

  it("returns rotting signal when health status is ROTTING", () => {
    const signals = getAttentionSignalsForDeal(makeHealthy({ health: { status: "ROTTING" } }));
    expect(signals).toContainEqual({ key: "rotting", label: "Rotting" });
  });

  it("returns rejected signal when completionRejectedAt is set", () => {
    const signals = getAttentionSignalsForDeal(
      makeHealthy({ metadata: { completionRejectedAt: "2026-01-01T00:00:00Z" } })
    );
    expect(signals).toContainEqual({ key: "rejected", label: "Rejected" });
  });

  it("returns rejected signal when completionRejectionReason is set", () => {
    const signals = getAttentionSignalsForDeal(
      makeHealthy({ metadata: { completionRejectionReason: "wrong address" } })
    );
    expect(signals).toContainEqual({ key: "rejected", label: "Rejected" });
  });

  it("returns parked signal when attentionRequiredTag is set", () => {
    const signals = getAttentionSignalsForDeal(
      makeHealthy({ metadata: { attentionRequiredTag: true } })
    );
    expect(signals).toContainEqual({ key: "parked", label: "Parked" });
  });

  it("returns parked signal when parkedWithoutDate is set", () => {
    const signals = getAttentionSignalsForDeal(
      makeHealthy({ metadata: { parkedWithoutDate: true } })
    );
    expect(signals).toContainEqual({ key: "parked", label: "Parked" });
  });

  it("can return multiple signals at once", () => {
    getOverdueStyling.mockReturnValue({ badgeText: "Overdue", borderClass: "", badgeTitle: "", badgeClass: "", severity: "critical" });
    const signals = getAttentionSignalsForDeal(
      makeHealthy({
        health: { status: "ROTTING" },
        metadata: { completionRejectedAt: "2026-01-01T00:00:00Z" },
      })
    );
    expect(signals.map(s => s.key)).toContain("overdue");
    expect(signals.map(s => s.key)).toContain("rotting");
    expect(signals.map(s => s.key)).toContain("rejected");
  });

  it("handles null health gracefully", () => {
    const signals = getAttentionSignalsForDeal(makeHealthy({ health: null }));
    expect(signals.map(s => s.key)).not.toContain("stale");
    expect(signals.map(s => s.key)).not.toContain("rotting");
  });

  it("handles null metadata gracefully", () => {
    const signals = getAttentionSignalsForDeal(makeHealthy({ metadata: null }));
    expect(signals.map(s => s.key)).not.toContain("rejected");
    expect(signals.map(s => s.key)).not.toContain("parked");
  });
});

describe("countAttentionRequiredDeals", () => {
  it("returns 0 for an empty array", () => {
    expect(countAttentionRequiredDeals([])).toBe(0);
  });

  it("counts only deals with at least one attention signal", () => {
    const deals: AttentionDealInput[] = [
      makeHealthy({ id: "1" }),                                      // healthy
      makeHealthy({ id: "2", health: { status: "STALE" } }),         // stale
      makeHealthy({ id: "3", health: { status: "ROTTING" } }),       // rotting
      makeHealthy({ id: "4" }),                                      // healthy
    ];
    expect(countAttentionRequiredDeals(deals)).toBe(2);
  });

  it("returns total count when all deals need attention", () => {
    const deals: AttentionDealInput[] = [
      makeHealthy({ id: "1", health: { status: "STALE" } }),
      makeHealthy({ id: "2", health: { status: "ROTTING" } }),
    ];
    expect(countAttentionRequiredDeals(deals)).toBe(2);
  });
});
