import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/actions/tradie-actions", () => ({
  updateJobStatus: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/jobs/job-media", () => ({
  JobMedia: () => <div>Media</div>,
}));

vi.mock("@/components/invoicing/invoice-generator", () => ({
  InvoiceGenerator: ({ invoiceNumber }: { invoiceNumber: string }) => <button>Invoice {invoiceNumber}</button>,
}));

import JobDetailView from "@/components/jobs/job-detail-view";

describe("JobDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends users to the full CRM billing panel instead of showing a dead generate-invoice button", async () => {
    const user = userEvent.setup();

    render(
      <JobDetailView
        job={{
          id: "deal_1",
          title: "Blocked Drain",
          client: {
            name: "Alex Harper",
            phone: "0400000000",
            email: "alex@example.com",
            address: "1 Test St",
          },
          status: "SCHEDULED",
          value: 200,
          description: "Drain issue",
          activities: [],
          invoices: [],
        }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Billing/i }));

    expect(screen.getByText(/No invoices generated yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Create and issue invoices from the full CRM billing panel so totals, status, and customer sends stay in sync/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Full Billing/i })).toHaveAttribute("href", "/crm/deals/deal_1");
    expect(screen.queryByRole("button", { name: /Generate Invoice/i })).not.toBeInTheDocument();
  });
});
