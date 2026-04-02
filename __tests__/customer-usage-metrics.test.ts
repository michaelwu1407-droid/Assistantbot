import { describe, expect, it } from "vitest";
import {
  buildAttentionState,
  calculateCostPerWonJob,
  describeExactMarginCoverageGap,
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

  it("describes the exact margin coverage gap precisely", () => {
    expect(
      describeExactMarginCoverageGap({
        subscriptionRevenue: 299,
        subscriptionRevenueCurrency: "AUD",
        twilioMonthSpend: null,
        twilioMonthSpendCurrency: null,
        stripeCoverage: "live",
        twilioCoverage: "degraded",
      }),
    ).toBe("Awaiting exact Twilio coverage");

    expect(
      describeExactMarginCoverageGap({
        subscriptionRevenue: 299,
        subscriptionRevenueCurrency: "AUD",
        twilioMonthSpend: 50,
        twilioMonthSpendCurrency: "USD",
        stripeCoverage: "live",
        twilioCoverage: "live",
      }),
    ).toBe("Exact margin unavailable: currency mismatch (AUD vs USD)");
  });

  it("does not warn inactive or voice-off workspaces by default", () => {
    expect(
      buildAttentionState({
        rowVoiceEnabled: false,
        subscriptionStatus: "inactive",
        lastActivityAt: null,
        stripeCoverage: "missing",
        twilioCoverage: "missing",
        incidents: 0,
        provisioningIssue: null,
        passiveWorkspaceHealth: {
          workspaceId: "ws_1",
          workspaceName: "Quiet Workspace",
          isActiveWorkspace: false,
          contributesToGlobalRollup: false,
          overallStatus: "degraded",
          overallClassification: "unknown",
          summary: "No recent real traffic proving one or more channels are working.",
          warnings: [],
          voice: {
            status: "healthy",
            classification: "not_configured",
            summary: "Voice is not configured.",
            warnings: [],
            configured: false,
            lastSuccessAt: null,
            lastFailureAt: null,
            recentSuccessCount: 0,
            recentFailureCount: 0,
          },
          sms: {
            status: "healthy",
            classification: "not_configured",
            summary: "SMS is not configured.",
            warnings: [],
            configured: false,
            lastSuccessAt: null,
            lastFailureAt: null,
            recentSuccessCount: 0,
            recentFailureCount: 0,
          },
          email: {
            status: "degraded",
            classification: "unknown",
            summary: "No recent successful inbound emails were observed.",
            warnings: [],
            configured: true,
            lastSuccessAt: null,
            lastFailureAt: null,
            recentSuccessCount: 0,
            recentFailureCount: 0,
          },
        },
      }),
    ).toEqual({
      level: "none",
      reasons: [],
    });
  });
});
