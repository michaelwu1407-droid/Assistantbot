import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  deal: {
    findUnique: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
  },
  activity: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db }));

import { createXeroDraftInvoice } from "@/actions/accounting-actions";

describe("createXeroDraftInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.activity.create.mockResolvedValue({});
    db.workspace.findUnique.mockResolvedValue({ settings: {} });
  });

  it("logs a visible job note when Xero is not connected", async () => {
    db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Blocked Drain",
      value: 250,
      contactId: "contact_1",
      contact: { name: "Alex", email: "alex@example.com" },
      invoices: [{ number: "INV-1", lineItems: [{ desc: "Labour", price: 250 }] }],
      workspace: { id: "ws_1" },
    });

    const result = await createXeroDraftInvoice("deal_1");

    expect(result).toEqual({
      success: false,
      error: "Xero not connected. Please connect Xero in Settings.",
    });
    expect(db.activity.create).toHaveBeenCalledWith({
      data: {
        type: "NOTE",
        title: "Xero Draft Invoice Skipped",
        content: "Xero is not connected. Local invoice was created, but no Xero draft was pushed.",
        dealId: "deal_1",
        contactId: "contact_1",
      },
    });
  });
});
