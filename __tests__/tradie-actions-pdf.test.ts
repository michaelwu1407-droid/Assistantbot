import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  invoice: { findUnique: vi.fn() },
}));

const accessMocks = vi.hoisted(() => ({
  requireDealInCurrentWorkspace: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: dbMocks,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/actions/messaging-actions", () => ({
  sendSMS: vi.fn(),
}));

vi.mock("@/actions/notification-actions", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    logError: vi.fn(),
    trackEvent: vi.fn(),
  },
}));

vi.mock("@/lib/pricing-learning", () => ({
  maybeCreatePricingSuggestionFromConfirmedJob: vi.fn(),
}));

vi.mock("@/actions/task-actions", () => ({
  createTask: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireDealInCurrentWorkspace: accessMocks.requireDealInCurrentWorkspace,
}));

vi.mock("@/lib/workspace-calendar", () => ({
  syncGoogleCalendarEventForDeal: vi.fn(),
  removeGoogleCalendarEventForDeal: vi.fn(),
}));

import { generateQuotePDF } from "@/actions/tradie-actions";

describe("generateQuotePDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMocks.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { workspaceId: "ws_123" },
      deal: { id: "deal_123", workspaceId: "ws_123" },
    });
  });

  it("enforces workspace access and escapes printable HTML output", async () => {
    dbMocks.invoice.findUnique.mockResolvedValue({
      id: "inv_123",
      number: "INV-123",
      status: "ISSUED",
      subtotal: 100,
      tax: 10,
      total: 110,
      lineItems: [{ desc: "<Tap Replacement>", price: 110 }],
      issuedAt: new Date("2026-03-17T00:00:00.000Z"),
      createdAt: new Date("2026-03-17T00:00:00.000Z"),
      dealId: "deal_123",
      deal: {
        title: 'Fix "<urgent>" leak',
        contact: {
          name: "Alex & Co",
          email: "alex@example.com",
          phone: "0400 000 000",
          address: "1 <Main> Street",
        },
      },
    });

    const result = await generateQuotePDF("inv_123");

    expect(accessMocks.requireDealInCurrentWorkspace).toHaveBeenCalledWith("deal_123");
    expect(result.success).toBe(true);
    expect(result.data?.lineItems).toEqual([{ desc: "<Tap Replacement>", price: 110 }]);
    expect(result.html).toContain("&lt;Tap Replacement&gt;");
    expect(result.html).toContain("Alex &amp; Co");
    expect(result.html).toContain("Fix &quot;&lt;urgent&gt;&quot; leak");
    expect(result.html).not.toContain("<Tap Replacement>");
  });
});
