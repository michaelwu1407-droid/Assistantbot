import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CashflowWidget } from "@/components/dashboard/cashflow-widget";
import type { DealView } from "@/actions/deal-actions";

function makeDeal(overrides: Partial<DealView> = {}): DealView {
  return {
    id: "deal_1",
    title: "Test job",
    stage: "scheduled",
    value: 0,
    invoicedAmount: 0,
    scheduledAt: null,
    contactName: "Test Contact",
    contactId: "contact_1",
    workspaceId: "ws_1",
    health: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as DealView;
}

function nextDays(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

describe("CashflowWidget", () => {
  it("renders nothing when both totals are zero", () => {
    const { container } = render(<CashflowWidget deals={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when all deals have zero value", () => {
    const { container } = render(
      <CashflowWidget deals={[makeDeal({ stage: "ready_to_invoice", value: 0 })]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows unpaid total for ready_to_invoice deals", () => {
    render(
      <CashflowWidget
        deals={[makeDeal({ stage: "ready_to_invoice", value: 1500, invoicedAmount: 0 })]}
      />
    );
    expect(screen.getByText(/invoiced & unpaid/i)).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
  });

  it("uses invoicedAmount over deal value when invoicedAmount > 0", () => {
    render(
      <CashflowWidget
        deals={[makeDeal({ stage: "ready_to_invoice", value: 1000, invoicedAmount: 1250 })]}
      />
    );
    expect(screen.getByText("$1,250.00")).toBeInTheDocument();
  });

  it("sums multiple ready_to_invoice deals", () => {
    render(
      <CashflowWidget
        deals={[
          makeDeal({ id: "d1", stage: "ready_to_invoice", value: 500 }),
          makeDeal({ id: "d2", stage: "ready_to_invoice", value: 750 }),
        ]}
      />
    );
    expect(screen.getByText("$1,250.00")).toBeInTheDocument();
  });

  it("shows expected-this-week for scheduled deals within 7 days", () => {
    render(
      <CashflowWidget
        deals={[makeDeal({ stage: "scheduled", value: 800, scheduledAt: nextDays(3) })]}
      />
    );
    expect(screen.getByText(/expected this week/i)).toBeInTheDocument();
    expect(screen.getByText("$800.00")).toBeInTheDocument();
  });

  it("excludes scheduled deals beyond 7 days", () => {
    const { container } = render(
      <CashflowWidget
        deals={[makeDeal({ stage: "scheduled", value: 800, scheduledAt: nextDays(10) })]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("excludes scheduled deals with no scheduledAt", () => {
    const { container } = render(
      <CashflowWidget
        deals={[makeDeal({ stage: "scheduled", value: 800, scheduledAt: null })]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows both panels when both totals are non-zero", () => {
    render(
      <CashflowWidget
        deals={[
          makeDeal({ id: "d1", stage: "ready_to_invoice", value: 600 }),
          makeDeal({ id: "d2", stage: "scheduled", value: 400, scheduledAt: nextDays(2) }),
        ]}
      />
    );
    expect(screen.getByText(/invoiced & unpaid/i)).toBeInTheDocument();
    expect(screen.getByText(/expected this week/i)).toBeInTheDocument();
  });
});
