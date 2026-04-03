import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  generateQuote,
  getDealInvoices,
  getInvoiceSyncStatus,
  issueInvoice,
  markInvoicePaid,
  voidInvoice,
  reverseInvoiceStatus,
  updateInvoiceLineItems,
  emailInvoice,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  generateQuote: vi.fn(),
  getDealInvoices: vi.fn(),
  getInvoiceSyncStatus: vi.fn(),
  issueInvoice: vi.fn(),
  markInvoicePaid: vi.fn(),
  voidInvoice: vi.fn(),
  reverseInvoiceStatus: vi.fn(),
  updateInvoiceLineItems: vi.fn(),
  emailInvoice: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/tradie-actions", () => ({
  generateQuote,
  getDealInvoices,
  getInvoiceSyncStatus,
  issueInvoice,
  markInvoicePaid,
  voidInvoice,
  reverseInvoiceStatus,
  updateInvoiceLineItems,
  emailInvoice,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { JobBillingTab } from "@/components/tradie/job-billing-tab";

describe("JobBillingTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDealInvoices.mockResolvedValue([]);
    getInvoiceSyncStatus.mockResolvedValue(null);
    generateQuote.mockResolvedValue({ success: true, invoiceNumber: "INV-1", total: 110 });
    issueInvoice.mockResolvedValue({ success: true });
    markInvoicePaid.mockResolvedValue({ success: true });
    voidInvoice.mockResolvedValue({ success: true });
    reverseInvoiceStatus.mockResolvedValue({ success: true });
    updateInvoiceLineItems.mockResolvedValue({ success: true });
    emailInvoice.mockResolvedValue({ success: true });
  });

  it("surfaces returned invoice-creation errors instead of pretending success", async () => {
    const user = userEvent.setup();
    generateQuote.mockResolvedValue({ success: false, error: "Deal not found" });

    render(<JobBillingTab dealId="deal_1" />);

    await user.type(screen.getByPlaceholderText("Item (e.g. Extra materials)"), "Extra labour");
    await user.type(screen.getByPlaceholderText("0"), "100");
    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    await waitFor(() =>
      expect(generateQuote).toHaveBeenCalledWith("deal_1", [{ desc: "Extra labour", price: 100 }]),
    );
    expect(toastError).toHaveBeenCalledWith("Deal not found");
    expect(toastSuccess).not.toHaveBeenCalledWith("Invoice created");
  });

  it("refreshes the invoice list after a successful create", async () => {
    const user = userEvent.setup();

    render(<JobBillingTab dealId="deal_1" />);

    await waitFor(() => expect(getDealInvoices).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText("Item (e.g. Extra materials)"), "Replacement part");
    await user.type(screen.getByPlaceholderText("0"), "75");
    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    await waitFor(() =>
      expect(generateQuote).toHaveBeenCalledWith("deal_1", [{ desc: "Replacement part", price: 75 }]),
    );
    await waitFor(() => expect(getDealInvoices).toHaveBeenCalledTimes(2));
    expect(toastSuccess).toHaveBeenCalledWith("Invoice created");
  });
});
