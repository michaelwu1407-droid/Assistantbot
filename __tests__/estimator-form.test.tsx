import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { generateQuote, toastError } = vi.hoisted(() => ({
  generateQuote: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/actions/tradie-actions", () => ({
  generateQuote,
}));

vi.mock("@/components/tradie/material-picker", () => ({
  MaterialPicker: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="mock-select" data-value={value}>
      <select
        aria-label="Select Deal"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        <option value="">Choose a deal...</option>
        {React.Children.map(children, (child) => child)}
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children, disabled }: { value: string; children: React.ReactNode; disabled?: boolean }) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
  },
}));

import { EstimatorForm } from "@/components/tradie/estimator-form";

describe("EstimatorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the GST-inclusive total and the draft-invoice helper copy", () => {
    render(
      <EstimatorForm
        workspaceId="ws_1"
        deals={[{ id: "deal_1", title: "Blocked Drain" } as never]}
      />,
    );

    expect(screen.getByText("Pocket Estimator")).toBeInTheDocument();
    expect(screen.getByText("GST (10%)")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(
      screen.getByText(/Generates a draft invoice with GST included, then links it back to the selected job/i),
    ).toBeInTheDocument();
  });

  it("surfaces a returned quote-generation error instead of silently logging it", async () => {
    const user = userEvent.setup();
    generateQuote.mockResolvedValue({ success: false, error: "Pricing unavailable" });

    render(
      <EstimatorForm
        workspaceId="ws_1"
        deals={[{ id: "deal_1", title: "Blocked Drain" } as never]}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Select Deal"), "deal_1");

    const descriptionInput = screen.getByPlaceholderText(/Description \(e\.g\. Labor\)/i);
    const priceInput = screen.getByPlaceholderText("0.00");

    await user.type(descriptionInput, "Labour");
    await user.type(priceInput, "150");
    await user.click(screen.getByRole("button", { name: /Generate Quote/i }));

    await waitFor(() => expect(generateQuote).toHaveBeenCalledWith("deal_1", [{ desc: "Labour", price: 150 }]));
    expect(toastError).toHaveBeenCalledWith("Pricing unavailable");
  });

  it("shows the next-step guidance after a successful quote", async () => {
    const user = userEvent.setup();
    generateQuote.mockResolvedValue({ success: true, total: 165, invoiceNumber: "INV-101" });

    render(
      <EstimatorForm
        workspaceId="ws_1"
        deals={[{ id: "deal_1", title: "Blocked Drain" } as never]}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Select Deal"), "deal_1");

    const descriptionInput = screen.getByPlaceholderText(/Description \(e\.g\. Labor\)/i);
    const priceInput = screen.getByPlaceholderText("0.00");

    await user.type(descriptionInput, "Labour");
    await user.type(priceInput, "150");
    await user.click(screen.getByRole("button", { name: /Generate Quote/i }));

    await waitFor(() => expect(screen.getByText("Quote Generated!")).toBeInTheDocument());
    expect(screen.getByText(/Invoice #INV-101/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Next step: issue the draft invoice from the job billing panel when you're ready to send it/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Billing Panel/i })).toHaveAttribute("href", "/crm/deals/deal_1");
  });
});
