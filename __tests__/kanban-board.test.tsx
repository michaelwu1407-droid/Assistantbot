import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { publishCrmSelection, routerRefresh, updateDealAssignedTo, updateDealStage, deleteDeal } = vi.hoisted(() => ({
  publishCrmSelection: vi.fn(),
  routerRefresh: vi.fn(),
  updateDealAssignedTo: vi.fn(),
  updateDealStage: vi.fn(),
  deleteDeal: vi.fn(),
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
  DealCard: ({
    deal,
    onOpenModal,
    onDelete,
    onEnterSelectionMode,
    selectionMode,
    isSelected,
    onToggleSelected,
  }: {
    deal: { id: string; title: string };
    onOpenModal?: () => void;
    onDelete?: () => void;
    onEnterSelectionMode?: (dealId: string) => void;
    selectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelected?: (dealId: string, checked: boolean) => void;
  }) => (
    <div data-kanban-card="true">
      <button type="button" onClick={onOpenModal}>
        {deal.title}
      </button>
      {selectionMode && onToggleSelected ? (
        <button type="button" onClick={() => onToggleSelected(deal.id, !isSelected)}>
          {isSelected ? `Deselect ${deal.title}` : `Select ${deal.title}`}
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" onClick={onDelete}>
          Delete {deal.title}
        </button>
      ) : null}
      {onEnterSelectionMode ? (
        <button type="button" onClick={() => onEnterSelectionMode(deal.id)}>
          Enter selection for {deal.title}
        </button>
      ) : null}
    </div>
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
  deleteDeal,
  updateDealAssignedTo,
  updateDealStage,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  AlertDialogAction: ({ children, onClick, className }: { children: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement>; className?: string }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement> }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

  it("permanently deletes a card already in the Deleted column after confirmation", async () => {
    const user = userEvent.setup();
    deleteDeal.mockResolvedValue({ success: true });

    render(
      <KanbanBoard
        deals={[
          {
            id: "deal_deleted",
            title: "Old Job",
            contactName: "Acme Plumbing",
            company: "Acme Plumbing",
            value: 420,
            stage: "deleted",
            address: "1 King St",
            assignedToId: null,
            metadata: {},
          } as never,
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete Old Job" }));

    expect(screen.getByText("Permanently delete 1 job?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete permanently" }));

    expect(deleteDeal).toHaveBeenCalledWith("deal_deleted");
    expect(updateDealStage).not.toHaveBeenCalled();
  });

  it("permanently deletes selected cards when all selected cards are already in Deleted", async () => {
    const user = userEvent.setup();
    deleteDeal.mockResolvedValue({ success: true });

    render(
      <KanbanBoard
        deals={[
          {
            id: "deal_deleted_1",
            title: "Old Job 1",
            contactName: "Acme Plumbing",
            company: "Acme Plumbing",
            value: 420,
            stage: "deleted",
            address: "1 King St",
            assignedToId: null,
            metadata: {},
          } as never,
          {
            id: "deal_deleted_2",
            title: "Old Job 2",
            contactName: "Acme Plumbing",
            company: "Acme Plumbing",
            value: 420,
            stage: "deleted",
            address: "2 King St",
            assignedToId: null,
            metadata: {},
          } as never,
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enter selection for Old Job 1" }));
    await user.click(screen.getByRole("button", { name: "Select Old Job 2" }));
    await user.click(screen.getByRole("button", { name: "Delete selected jobs permanently" }));

    expect(screen.getByText("Permanently delete 2 jobs?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete permanently" }));

    expect(deleteDeal).toHaveBeenCalledTimes(2);
    expect(deleteDeal).toHaveBeenNthCalledWith(1, "deal_deleted_1");
    expect(deleteDeal).toHaveBeenNthCalledWith(2, "deal_deleted_2");
    expect(updateDealStage).not.toHaveBeenCalled();
  });
});
