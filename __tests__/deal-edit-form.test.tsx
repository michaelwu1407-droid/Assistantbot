import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  routerPush,
  routerRefresh,
  updateDeal,
  updateDealMetadata,
  updateDealAssignedTo,
  setDealRecurrence,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerRefresh: vi.fn(),
  updateDeal: vi.fn(),
  updateDealMetadata: vi.fn(),
  updateDealAssignedTo: vi.fn(),
  setDealRecurrence: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

vi.mock("@/actions/deal-actions", () => ({
  updateDeal,
  updateDealMetadata,
  updateDealAssignedTo,
  setDealRecurrence,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");

  const SelectContext = React.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: "" });

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    );
  }

  function SelectTrigger({
    id,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button type="button" id={id} {...props}>
        {children}
      </button>
    );
  }

  function SelectValue({ placeholder }: { placeholder?: string }) {
    const context = React.useContext(SelectContext);
    return <span>{context.value || placeholder}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    const context = React.useContext(SelectContext);
    return (
      <button type="button" onClick={() => context.onValueChange?.(value)}>
        {children}
      </button>
    );
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
    >
      Toggle recurrence
    </button>
  ),
}));

import { DealEditForm } from "@/app/crm/deals/[id]/edit/deal-edit-form";

describe("DealEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateDeal.mockResolvedValue({ success: true });
    updateDealAssignedTo.mockResolvedValue({ success: true });
    updateDealMetadata.mockResolvedValue({ success: true });
    setDealRecurrence.mockResolvedValue({ success: true });
  });

  function renderForm() {
    return render(
      <DealEditForm
        dealId="deal_123"
        initialTitle="Blocked Drain"
        initialValue={250}
        initialStage="lead"
        initialNotes="Needs inspection"
        initialAddress="12 King St"
        initialScheduledAt=""
        initialAssignedToId=""
        teamMembers={[
          { id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" },
        ]}
        stageOptions={[
          { value: "lead", label: "Lead" },
          { value: "scheduled", label: "Scheduled" },
        ]}
        canManageAssignment
        initialRecurrence={null}
      />,
    );
  }

  it("blocks scheduled jobs without an assignee", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Scheduled" }));
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    expect(toastError).toHaveBeenCalledWith("Assign a team member when the job is in Scheduled stage.");
    expect(updateDeal).not.toHaveBeenCalled();
  });

  it("saves edited fields, notes, assignee, and recurrence", async () => {
    const user = userEvent.setup();
    renderForm();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "  Emergency Drain Repair  " },
    });
    fireEvent.change(screen.getByLabelText(/value/i), {
      target: { value: "375.50" },
    });
    fireEvent.change(screen.getByLabelText(/address/i), {
      target: { value: "  15 Queen St  " },
    });
    fireEvent.change(screen.getByLabelText(/scheduled date & time/i), {
      target: { value: "2026-04-15T09:30" },
    });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "Bring replacement fittings" },
    });

    await user.click(screen.getByRole("button", { name: "Scheduled" }));
    await user.click(screen.getByRole("button", { name: "Jess Smith" }));
    await user.click(screen.getByRole("switch"));
    const recurrenceIntervalInput = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(recurrenceIntervalInput, {
      target: { value: "0" },
    });
    await user.click(screen.getByRole("button", { name: "month(s)" }));
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2026-12-31" },
    });

    await waitFor(() => {
      expect(screen.getByText("scheduled")).toBeInTheDocument();
      expect(screen.getByText("user_1")).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledWith("deal_123", {
        title: "Emergency Drain Repair",
        value: 375.5,
        stage: "scheduled",
        address: "15 Queen St",
        scheduledAt: "2026-04-15T09:30",
      });
    });

    expect(updateDealAssignedTo).toHaveBeenCalledWith("deal_123", "user_1");
    expect(updateDealMetadata).toHaveBeenCalledWith("deal_123", {
      notes: "Bring replacement fittings",
    });
    expect(setDealRecurrence).toHaveBeenCalledWith("deal_123", {
      unit: "month",
      interval: 1,
      endDate: "2026-12-31",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Deal updated");
    expect(routerPush).toHaveBeenCalledWith("/crm/deals/deal_123");
    expect(routerRefresh).toHaveBeenCalled();
  }, 15000);

  it("hides reassignment controls for team-member editing and skips assignee updates", async () => {
    const user = userEvent.setup();

    render(
      <DealEditForm
        dealId="deal_123"
        initialTitle="Blocked Drain"
        initialValue={250}
        initialStage="scheduled"
        initialNotes="Needs inspection"
        initialAddress="12 King St"
        initialScheduledAt="2026-04-15T09:30"
        initialAssignedToId="user_1"
        teamMembers={[
          { id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" },
        ]}
        canManageAssignment={false}
        stageOptions={[
          { value: "lead", label: "Lead" },
          { value: "scheduled", label: "Scheduled" },
        ]}
        initialRecurrence={null}
      />,
    );

    expect(screen.queryByLabelText(/assigned to/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "Team member updated notes" },
    });

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledWith("deal_123", {
        title: "Blocked Drain",
        value: 250,
        stage: "scheduled",
        address: "12 King St",
        scheduledAt: "2026-04-15T09:30",
      });
    });

    expect(updateDealAssignedTo).not.toHaveBeenCalled();
    expect(updateDealMetadata).toHaveBeenCalledWith("deal_123", {
      notes: "Team member updated notes",
    });
  });
});
