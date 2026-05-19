import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

const { reconcileStaleJob, useIsDesktop } = vi.hoisted(() => ({
  reconcileStaleJob: vi.fn(),
  useIsDesktop: vi.fn(),
}));

vi.mock("@/actions/stale-job-actions", () => ({ reconcileStaleJob }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-is-desktop", () => ({ useIsDesktop }));

// Render the real Dialog / Drawer primitives — axe needs them to evaluate
// the actual ARIA contract (roles, labels, focus management).

import { StaleJobReconciliationModal } from "@/components/crm/stale-job-reconciliation-modal";

const deal = {
  id: "deal_1",
  title: "Blocked Drain",
  contactName: "Alex Harper",
  scheduledAt: new Date("2026-04-09T10:00:00.000Z"),
  address: "1 King St",
} as never;

describe("StaleJobReconciliationModal — accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconcileStaleJob.mockResolvedValue({ success: true });
  });

  it("desktop dialog: axe-clean before any input", async () => {
    useIsDesktop.mockReturnValue(true);
    const { baseElement } = render(
      <StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("desktop dialog: axe-clean after selecting an outcome", async () => {
    useIsDesktop.mockReturnValue(true);
    const { baseElement, getByRole } = render(
      <StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    fireEvent.click(getByRole("radio", { name: /completed/i }));
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("mobile drawer: axe-clean before any input", async () => {
    useIsDesktop.mockReturnValue(false);
    const { baseElement } = render(
      <StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("the outcome picker is a labelled radiogroup with named radios", async () => {
    useIsDesktop.mockReturnValue(true);
    const { getByRole, getAllByRole } = render(
      <StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    expect(getByRole("radiogroup")).toHaveAttribute("aria-label", "Job outcome");
    const radios = getAllByRole("radio");
    expect(radios).toHaveLength(5);
    for (const radio of radios) {
      expect(radio).toHaveAccessibleName();
      expect(radio.getAttribute("aria-checked")).toMatch(/^(true|false)$/);
    }
  });
});
