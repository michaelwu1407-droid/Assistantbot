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

vi.mock("@/components/tradie/job-completion-modal", () => ({
  JobCompletionModal: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <p>Completion modal</p>
        <button onClick={() => onOpenChange(false)}>Close completion modal</button>
      </div>
    ) : null,
}));

import JobDetailView from "@/components/jobs/job-detail-view";

describe("JobDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", vi.fn());
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

  it("routes missing phone and address details back into CRM instead of dead-ending", () => {
    render(
      <JobDetailView
        job={{
          id: "deal_2",
          title: "Hot Water Service",
          client: {
            name: "Taylor Smith",
            phone: null,
            email: "taylor@example.com",
            address: null,
          },
          status: "SCHEDULED",
          value: 320,
          description: "Hot water fault",
          activities: [],
          invoices: [],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /add phone in crm/i })).toHaveAttribute("href", "/crm/deals/deal_2");
    expect(screen.getByRole("link", { name: /add address in crm/i })).toHaveAttribute("href", "/crm/deals/deal_2");
  });

  it("wires call and map actions when contact details exist", async () => {
    const user = userEvent.setup();

    render(
      <JobDetailView
        job={{
          id: "deal_3",
          title: "Blocked Drain",
          client: {
            name: "Alex Harper",
            phone: "0400000000",
            email: "alex@example.com",
            address: "1 Test St, Sydney",
          },
          status: "SCHEDULED",
          value: 250,
          description: "Drain issue",
          activities: [],
          invoices: [],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Call$/i }));
    expect(window.open).toHaveBeenCalledWith("tel:0400000000");

    await user.click(screen.getByRole("button", { name: /^Map$/i }));
    expect(window.open).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=1%20Test%20St%2C%20Sydney&travelmode=driving",
      "_blank",
    );
  });

  it("uses user-facing status labels and hides completion for non-field stages", () => {
    render(
      <JobDetailView
        job={{
          id: "deal_4",
          title: "Quote request",
          client: {
            name: "Morgan",
            phone: "0400000000",
            email: "morgan@example.com",
            address: "2 Quote St",
          },
          status: "INVOICED",
          value: 250,
          description: "Quoted job",
          activities: [],
          invoices: [],
        }}
      />,
    );

    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark Job Complete/i })).not.toBeInTheDocument();
  });

  it("routes scheduled jobs into the real field workflow instead of allowing instant completion", () => {
    render(
      <JobDetailView
        job={{
          id: "deal_5",
          title: "Blocked Drain",
          client: {
            name: "Alex Harper",
            phone: "0400000000",
            email: "alex@example.com",
            address: "1 Test St",
          },
          status: "SCHEDULED",
          value: 250,
          description: "Drain issue",
          activities: [],
          invoices: [],
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: /Mark Job Complete/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Finish this job from the field workflow/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Field Workflow/i })).toHaveAttribute("href", "/tradie/jobs/deal_5");
  });

  it("opens the shared completion modal when an on-site job is finished", async () => {
    const user = userEvent.setup();

    render(
      <JobDetailView
        job={{
          id: "deal_6",
          title: "Blocked Drain",
          client: {
            name: "Alex Harper",
            phone: "0400000000",
            email: "alex@example.com",
            address: "1 Test St",
          },
          status: "ON_SITE",
          value: 250,
          description: "Drain issue",
          activities: [],
          invoices: [],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Mark Job Complete/i }));
    expect(screen.getByText("Completion modal")).toBeInTheDocument();
  });
});
