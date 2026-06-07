import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { generateQuotePDF, toastSuccess, toastError } = vi.hoisted(() => ({
  generateQuotePDF: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/tradie-actions", () => ({
  generateQuotePDF,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { InvoiceGenerator } from "@/components/invoicing/invoice-generator";

describe("InvoiceGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads an invoice preview and allows emailing it to the client", async () => {
    const user = userEvent.setup();
    generateQuotePDF.mockResolvedValue({
      success: true,
      html: "<html><body><h1>Invoice INV-001</h1></body></html>",
    });

    render(<InvoiceGenerator invoiceId="invoice_1" invoiceNumber="INV-001" />);

    await user.click(screen.getByRole("button", { name: /view \/ print/i }));

    await waitFor(() => {
      expect(generateQuotePDF).toHaveBeenCalledWith("invoice_1");
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Invoice INV-001")).toBeInTheDocument();
    expect(screen.getByTitle("Invoice Preview")).toHaveAttribute(
      "srcdoc",
      "<html><body><h1>Invoice INV-001</h1></body></html>",
    );

    await user.click(screen.getByRole("button", { name: /email client/i }));

    expect(toastSuccess).toHaveBeenCalledWith("Email sent to client (Mock)");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes the dialog and reports an error when preview generation fails", async () => {
    const user = userEvent.setup();
    generateQuotePDF.mockResolvedValue({
      success: false,
    });

    render(<InvoiceGenerator invoiceId="invoice_1" invoiceNumber="INV-001" />);

    await user.click(screen.getByRole("button", { name: /view \/ print/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to load invoice preview");
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
