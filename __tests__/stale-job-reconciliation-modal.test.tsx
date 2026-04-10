import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { reconcileStaleJob, toastSuccess, toastError } = vi.hoisted(() => ({
  reconcileStaleJob: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/stale-job-actions", () => ({
  reconcileStaleJob,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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
    <div>
      <select aria-label="Select an outcome" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
        <option value="">Select an outcome</option>
        <option value="COMPLETED">Completed</option>
        <option value="RESCHEDULED">Rescheduled</option>
        <option value="PARKED">Parked (date unknown)</option>
        <option value="NO_SHOW">No Show</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { StaleJobReconciliationModal } from "@/components/crm/stale-job-reconciliation-modal";

describe("StaleJobReconciliationModal", () => {
  const deal = {
    id: "deal_1",
    title: "Blocked Drain",
    contactName: "Alex Harper",
    scheduledAt: new Date("2026-04-09T10:00:00.000Z"),
    address: "1 King St",
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains what happens next for the selected outcome", async () => {
    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/select an outcome/i), {
      target: { value: "RESCHEDULED" },
    });

    expect(
      await screen.findByText(/clears the old scheduled date and moves the job back so you can book a new time/i),
    ).toBeInTheDocument();
  });

  it("shows success feedback when reconciliation saves", async () => {
    reconcileStaleJob.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();

    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/select an outcome/i), {
      target: { value: "COMPLETED" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update job/i }));

    await waitFor(() => {
      expect(reconcileStaleJob).toHaveBeenCalledWith(
        expect.objectContaining({
          dealId: "deal_1",
          actualOutcome: "COMPLETED",
        }),
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith("Job updated");
    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows the returned error when reconciliation fails", async () => {
    reconcileStaleJob.mockResolvedValue({ success: false, error: "Could not save outcome" });

    render(<StaleJobReconciliationModal deal={deal} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/select an outcome/i), {
      target: { value: "CANCELLED" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update job/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save outcome");
    });
  });
});
