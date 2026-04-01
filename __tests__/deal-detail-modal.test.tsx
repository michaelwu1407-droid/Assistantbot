import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  routerPush,
  routerRefresh,
  approveCompletion,
  rejectCompletion,
  updateDeal,
  updateDealStage,
  scheduleFollowUp,
  completeFollowUp,
  cancelFollowUp,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerRefresh: vi.fn(),
  approveCompletion: vi.fn(),
  rejectCompletion: vi.fn(),
  updateDeal: vi.fn(),
  updateDealStage: vi.fn(),
  scheduleFollowUp: vi.fn(),
  completeFollowUp: vi.fn(),
  cancelFollowUp: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/actions/deal-actions", () => ({
  updateDeal,
  approveCompletion,
  rejectCompletion,
  updateDealStage,
}));

vi.mock("@/actions/followup-actions", () => ({
  scheduleFollowUp,
  completeFollowUp,
  cancelFollowUp,
}));

vi.mock("@/components/crm/activity-feed", () => ({
  ActivityFeed: () => <div>Activity Feed</div>,
}));

vi.mock("@/components/crm/deal-notes", () => ({
  DealNotes: ({ initialNotes }: { initialNotes: string }) => <div>Deal Notes: {initialNotes}</div>,
}));

vi.mock("@/components/crm/stale-job-reconciliation-modal", () => ({
  StaleJobReconciliationModal: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { DealDetailModal } from "@/components/crm/deal-detail-modal";

describe("DealDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            deal: {
              id: "deal_1",
              title: "Blocked Drain",
              value: 420,
              stage: "PENDING_COMPLETION",
              contactId: "contact_1",
              company: "Acme Plumbing",
              address: "1 King St",
              createdAt: "2026-04-01T10:00:00.000Z",
              scheduledAt: "2026-04-02T10:00:00.000Z",
              metadata: { notes: "Customer prefers text updates." },
              contact: {
                id: "contact_1",
                name: "Acme Plumbing",
                company: "Acme Plumbing",
                phone: "0400000001",
                email: "office@acme.com",
              },
              jobPhotos: [],
            },
            contactDeals: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );
    approveCompletion.mockResolvedValue({ success: true });
    rejectCompletion.mockResolvedValue({ success: true });
  });

  it("loads a pending-completion deal and lets a manager approve it", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onDealUpdated = vi.fn();

    render(
      <DealDetailModal
        dealId="deal_1"
        open
        onOpenChange={onOpenChange}
        onDealUpdated={onDealUpdated}
        currentUserRole="OWNER"
      />,
    );

    expect((await screen.findAllByText("Blocked Drain")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pending approval/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Acme Plumbing").length).toBeGreaterThan(0);
    expect(screen.getByText("Activity Feed")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "notes" }));

    expect(screen.getByText("Deal Notes: Customer prefers text updates.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(approveCompletion).toHaveBeenCalledWith("deal_1");
    });
    expect(toastSuccess).toHaveBeenCalledWith("Job approved and marked completed");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDealUpdated).toHaveBeenCalled();
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("shows the load error state when the deal fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not found", {
          status: 404,
        }),
      ),
    );
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<DealDetailModal dealId="missing" open onOpenChange={onOpenChange} />);

    expect(await screen.findByText("Deal not found")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Close" })[0]);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
