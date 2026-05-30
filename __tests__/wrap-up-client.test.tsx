import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WrapUpClient } from "@/app/crm/wrap-up/wrap-up-client";
import type { DealView } from "@/actions/deal-actions";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function makeDeal(overrides: Partial<DealView> = {}): DealView {
  return {
    id: "deal_1",
    title: "Fix drain",
    stage: "completed",
    value: 0,
    invoicedAmount: 0,
    scheduledAt: null,
    contactName: "Jane Smith",
    contactId: "contact_1",
    workspaceId: "ws_1",
    health: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as DealView;
}

const TZ = "Australia/Sydney";

describe("WrapUpClient", () => {
  it("renders the Tonight's Wrap heading", () => {
    render(<WrapUpClient doneToday={[]} unpaidDeals={[]} staleQuotes={[]} timezone={TZ} />);
    expect(screen.getByText("Tonight's Wrap")).toBeInTheDocument();
  });

  it("shows quiet-day message when all lists are empty", () => {
    render(<WrapUpClient doneToday={[]} unpaidDeals={[]} staleQuotes={[]} timezone={TZ} />);
    expect(screen.getByText(/enjoy the rest of the evening/i)).toBeInTheDocument();
  });

  it("shows jobs done count and collected amount", () => {
    const deals = [
      makeDeal({ id: "d1", value: 300 }),
      makeDeal({ id: "d2", value: 450 }),
    ];
    render(<WrapUpClient doneToday={deals} unpaidDeals={[]} staleQuotes={[]} timezone={TZ} />);
    expect(screen.getByText(/2 jobs done today/i)).toBeInTheDocument();
    expect(screen.getByText("$750.00 collected")).toBeInTheDocument();
  });

  it("uses invoicedAmount over value when available", () => {
    render(
      <WrapUpClient
        doneToday={[makeDeal({ value: 200, invoicedAmount: 350 })]}
        unpaidDeals={[]}
        staleQuotes={[]}
        timezone={TZ}
      />
    );
    expect(screen.getByText("$350.00 collected")).toBeInTheDocument();
  });

  it("shows unpaid invoice count and outstanding total", () => {
    render(
      <WrapUpClient
        doneToday={[]}
        unpaidDeals={[makeDeal({ id: "u1", value: 600 }), makeDeal({ id: "u2", value: 400 })]}
        staleQuotes={[]}
        timezone={TZ}
      />
    );
    expect(screen.getByText(/2 invoices unpaid/i)).toBeInTheDocument();
    expect(screen.getByText("$1,000.00 outstanding")).toBeInTheDocument();
  });

  it("shows stale quote count and chase message", () => {
    render(
      <WrapUpClient
        doneToday={[]}
        unpaidDeals={[]}
        staleQuotes={[makeDeal()]}
        timezone={TZ}
      />
    );
    expect(screen.getByText(/1 quote needs chasing/i)).toBeInTheDocument();
    expect(screen.getByText(/no replies in 3\+ days/i)).toBeInTheDocument();
  });

  it("shows View unpaid invoices button when unpaid exist", () => {
    render(
      <WrapUpClient
        doneToday={[]}
        unpaidDeals={[makeDeal({ value: 500 })]}
        staleQuotes={[]}
        timezone={TZ}
      />
    );
    expect(screen.getByRole("link", { name: /view unpaid invoices/i })).toBeInTheDocument();
  });

  it("shows Chase stale quotes button when stale quotes exist", () => {
    render(
      <WrapUpClient
        doneToday={[]}
        unpaidDeals={[]}
        staleQuotes={[makeDeal()]}
        timezone={TZ}
      />
    );
    expect(screen.getByRole("link", { name: /chase stale quotes/i })).toBeInTheDocument();
  });

  it("hides action buttons when all lists are empty", () => {
    render(<WrapUpClient doneToday={[]} unpaidDeals={[]} staleQuotes={[]} timezone={TZ} />);
    expect(screen.queryByText(/view unpaid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chase stale/i)).not.toBeInTheDocument();
  });

  it("shows no jobs completed copy when doneToday is empty", () => {
    render(<WrapUpClient doneToday={[]} unpaidDeals={[makeDeal({ value: 100 })]} staleQuotes={[]} timezone={TZ} />);
    expect(screen.getByText(/no jobs completed today/i)).toBeInTheDocument();
  });
});
