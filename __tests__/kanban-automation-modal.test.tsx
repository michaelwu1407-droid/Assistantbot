import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/actions/kanban-automation-actions", () => ({
  executeKanbanAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
}));

import { KanbanAutomationModal } from "@/components/crm/kanban-automation-modal";

describe("KanbanAutomationModal", () => {
  const deal = {
    id: "deal_1",
    title: "Blocked Drain",
    contactName: "Alex Harper",
    currentStage: "CONTACTED",
    lastActivity: new Date("2026-04-01T10:00:00+10:00"),
    value: 450,
  };

  it("shows user-facing CRM stage labels instead of old generic sales pipeline names", async () => {
    const user = userEvent.setup();

    render(
      <KanbanAutomationModal
        open
        onOpenChange={vi.fn()}
        deal={deal}
        onAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /move stage/i }));

    expect(screen.getByText(/Stage: Quote sent/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Qualified$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Closed Won$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^New request$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Scheduled$/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/^Completed$/i)).toBeInTheDocument();
  });
});
