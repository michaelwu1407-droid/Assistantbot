import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { publishCrmSelection, routerRefresh, updateDealAssignedTo, updateDealStage } = vi.hoisted(() => ({
  publishCrmSelection: vi.fn(),
  routerRefresh: vi.fn(),
  updateDealAssignedTo: vi.fn(),
  updateDealStage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCorners: vi.fn(),
  KeyboardSensor: vi.fn(),
  MouseSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
}));

vi.mock("@dnd-kit/sortable", () => ({
  sortableKeyboardCoordinates: vi.fn(),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
  arrayMove: (items: unknown[]) => items,
}));

vi.mock("@/components/crm/deal-card", () => ({
  DealCard: ({ deal, onOpenModal }: { deal: { title: string }; onOpenModal?: () => void }) => (
    <button type="button" onClick={onOpenModal}>
      {deal.title}
    </button>
  ),
}));

vi.mock("@/components/crm/deal-detail-modal", () => ({
  DealDetailModal: () => null,
}));

vi.mock("@/components/ui/hover-scroll-name", () => ({
  HoverScrollName: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("@/actions/deal-actions", () => ({
  persistKanbanColumnOrder: vi.fn(),
  updateDealAssignedTo,
  updateDealStage,
}));

vi.mock("@/lib/crm-selection", () => ({
  publishCrmSelection,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { KanbanBoard } from "@/components/crm/kanban-board";

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pipeline columns and dispatches the new-deal event from an empty column", async () => {
    const user = userEvent.setup();
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<KanbanBoard deals={[]} />);

    expect(screen.getAllByText("New request").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quote sent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Awaiting payment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Deleted").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /add your first deal/i })[0]);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "open-new-deal-modal",
        detail: {
          initialStage: "new_request",
        },
      }),
    );
  });

  it("publishes the current CRM selection when a deal is opened", async () => {
    const user = userEvent.setup();

    render(
      <KanbanBoard
        deals={[
          {
            id: "deal_1",
            title: "Blocked Drain",
            contactName: "Acme Plumbing",
            company: "Acme Plumbing",
            value: 420,
            stage: "new_request",
            address: "1 King St",
            assignedToId: null,
            metadata: {},
          } as never,
        ]}
      />,
    );

    expect(publishCrmSelection).toHaveBeenCalledWith([]);

    await user.click(screen.getByRole("button", { name: "Blocked Drain" }));

    expect(publishCrmSelection).toHaveBeenLastCalledWith([
      {
        id: "deal_1",
        title: "Blocked Drain",
      },
    ]);
  });
});
