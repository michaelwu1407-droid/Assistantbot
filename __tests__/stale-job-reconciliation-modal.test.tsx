import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { reconcileStaleJob, toastSuccess, toastError, useIsDesktop } = vi.hoisted(() => ({
  reconcileStaleJob: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  useIsDesktop: vi.fn(),
}));

vi.mock("@/actions/stale-job-actions", () => ({ reconcileStaleJob }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));
vi.mock("@/hooks/use-is-desktop", () => ({ useIsDesktop }));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div data-surface="dialog">{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div data-surface="drawer">{children}</div>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { StaleJobReconciliationModal } from "@/components/crm/stale-job-reconciliation-modal";

const deal = {
  id: "deal_1",
  title: "Blocked Drain",
  contactName: "Alex Harper",
  scheduledAt: new Date("2026-04-09T10:00:00.000Z"),
  address: "1 King St",
} as never;

describe("StaleJobReconciliationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIsDesktop.mockReturnValue(true);
  });

  it("renders a Dialog on desktop and a Drawer on mobile (responsive surface swap)", () => {
    const { rerender, container } = render(
      <StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    expect(container.querySelector('[data-surface="dialog"]')).not.toBeNull();
    expect(container.querySelector('[data-surface="drawer"]')).toBeNull();

    useIsDesktop.mockReturnValue(false);
    rerender(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(container.querySelector('[data-surface="drawer"]')).not.toBeNull();
    expect(container.querySelector('[data-surface="dialog"]')).toBeNull();
  });

  it("exposes outcomes as a radiogroup with five radios — no hidden dropdown", () => {
    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: /job outcome/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("disables the primary action until an outcome is picked", () => {
    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole("button", { name: /update job/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /completed/i }));
    expect(screen.getByRole("button", { name: /mark completed/i })).toBeEnabled();
  });

  it("submits the selected outcome and shows success feedback", async () => {
    reconcileStaleJob.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();

    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole("radio", { name: /completed/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark completed/i }));

    await waitFor(() => {
      expect(reconcileStaleJob).toHaveBeenCalledWith(
        expect.objectContaining({ dealId: "deal_1", actualOutcome: "COMPLETED" }),
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith("Job updated");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("surfaces the returned error when reconciliation fails", async () => {
    reconcileStaleJob.mockResolvedValue({ success: false, error: "Could not save outcome" });

    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: /cancelled/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark cancelled/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save outcome");
    });
  });

  it("updates aria-checked on the selected outcome only", () => {
    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: /parked/i }));
    const radios = screen.getAllByRole("radio");
    const checked = radios.filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName(/parked/i);
  });
});
