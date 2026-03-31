import { describe, expect, it } from "vitest";
import {
  calculateCostPerWonJob,
  detectTraceyWonDeal,
  parseCustomerUsageFilters,
} from "@/lib/admin/customer-usage";

describe("customer observability helpers", () => {
  it("defaults the unified admin filters correctly", () => {
    expect(parseCustomerUsageFilters({})).toEqual({
      tab: "overview",
      range: "30d",
      workspace: "",
      q: "",
      sort: "attention",
    });
  });

  it("parses supported tab, range, workspace, query, and sort values", () => {
    expect(
      parseCustomerUsageFilters({
        tab: "customers",
        range: "1d",
        workspace: "ws_123",
        q: "splash",
        sort: "jobsWon",
      }),
    ).toEqual({
      tab: "customers",
      range: "1d",
      workspace: "ws_123",
      q: "splash",
      sort: "jobsWon",
    });
  });

  it("excludes deals manually created directly into later stages without system metadata", () => {
    const createdAt = new Date("2026-03-01T00:00:00.000Z");
    const stageChangedAt = new Date("2026-03-01T00:00:20.000Z");

    expect(detectTraceyWonDeal({}, "WON", createdAt, stageChangedAt)).toBe(false);
  });

  it("includes later-stage deals when system source metadata exists", () => {
    const createdAt = new Date("2026-03-01T00:00:00.000Z");
    const stageChangedAt = new Date("2026-03-01T00:00:20.000Z");

    expect(
      detectTraceyWonDeal({ source: "hipages" }, "WON", createdAt, stageChangedAt),
    ).toBe(true);
  });

  it("calculates cost per won job only when there is a denominator", () => {
    expect(calculateCostPerWonJob(120, 4)).toBe(30);
    expect(calculateCostPerWonJob(120, 0)).toBeNull();
    expect(calculateCostPerWonJob(null, 4)).toBeNull();
  });
});
