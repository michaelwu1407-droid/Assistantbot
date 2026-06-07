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
    await user.click(screen.getByRole("button", { name: "Create Draft Invoice" }));

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
    await user.click(screen.getByRole("button", { name: "Create Draft Invoice" }));

    await waitFor(() =>
      expect(generateQuote).toHaveBeenCalledWith("deal_1", [{ desc: "Replacement part", price: 75 }]),
    );
    await waitFor(() => expect(getDealInvoices).toHaveBeenCalledTimes(2));
    expect(toastSuccess).toHaveBeenCalledWith("Draft invoice created");
  });

  it("shows the next best action for a draft invoice", async () => {
    getDealInvoices.mockResolvedValue([
      {
        id: "inv_1",
        number: "INV-001",
        status: "DRAFT",
        total: 220,
        createdAt: "2026-04-09T10:00:00.000Z",
        issuedAt: null,
        paidAt: null,
        lineItems: [{ desc: "Labour", price: 220 }],
      },
    ]);

    render(<JobBillingTab dealId="deal_1" />);

    expect(await screen.findByText("Send the quote, or mark it as issued when it becomes the invoice.")).toBeInTheDocument();
    const nextActionCard = screen.getByText("Next best action").parentElement;
    expect(nextActionCard).toHaveTextContent("You can still edit the line items first. Use Email quote for the estimate, or Mark issued once the final invoice is ready.");
    expect(screen.getByRole("button", { name: /Email quote/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Email customer/i })).not.toBeInTheDocument();
  });

  it("shows the next best action for an issued invoice", async () => {
    getDealInvoices.mockResolvedValue([
      {
        id: "inv_2",
        number: "INV-002",
        status: "ISSUED",
        total: 220,
        createdAt: "2026-04-09T10:00:00.000Z",
        issuedAt: "2026-04-09T10:05:00.000Z",
        paidAt: null,
        lineItems: [{ desc: "Labour", price: 220 }],
      },
    ]);

    render(<JobBillingTab dealId="deal_1" />);

    expect(await screen.findByText("Email the invoice if needed, then mark it as paid once payment lands.")).toBeInTheDocument();
    const nextActionCard = screen.getByText("Next best action").parentElement;
    expect(nextActionCard).toHaveTextContent("This invoice is already marked as issued. Use Email invoice to send or resend it, then Mark Paid once payment lands.");
    expect(screen.getByRole("button", { name: /Email invoice/i })).toBeInTheDocument();
  });
});
