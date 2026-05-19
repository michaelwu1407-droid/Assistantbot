import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

const { executeKanbanAction } = vi.hoisted(() => ({
  executeKanbanAction: vi.fn(),
}));

vi.mock("@/actions/kanban-automation-actions", () => ({ executeKanbanAction }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Real Dialog primitives — axe evaluates the actual ARIA contract.

import { KanbanAutomationModal } from "@/components/crm/kanban-automation-modal";

const deal = {
  id: "deal_1",
  title: "Blocked Drain",
  contactName: "Alex Harper",
  currentStage: "CONTACTED",
  lastActivity: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  value: 450,
};

describe("KanbanAutomationModal — accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeKanbanAction.mockResolvedValue({ success: true });
  });

  it("initial state: axe-clean", async () => {
    const { baseElement } = render(
      <KanbanAutomationModal open deal={deal} onOpenChange={vi.fn()} onAction={vi.fn()} />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("after selecting move-stage action: axe-clean", async () => {
    const { baseElement, getByRole } = render(
      <KanbanAutomationModal open deal={deal} onOpenChange={vi.fn()} onAction={vi.fn()} />,
    );
    fireEvent.click(getByRole("button", { name: /move stage/i }));
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("after selecting follow-up action: axe-clean", async () => {
    const { baseElement, getByRole } = render(
      <KanbanAutomationModal open deal={deal} onOpenChange={vi.fn()} onAction={vi.fn()} />,
    );
    fireEvent.click(getByRole("button", { name: /send follow.up/i }));
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
