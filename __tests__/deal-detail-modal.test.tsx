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
  sendSMS,
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
  sendSMS: vi.fn(),
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

vi.mock("@/actions/messaging-actions", () => ({
  sendSMS,
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

function makeDealResponse(overrides?: Record<string, unknown>) {
  return new Response(
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
        ...overrides,
      },
      contactDeals: [],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("DealDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(makeDealResponse())),
    );
    approveCompletion.mockResolvedValue({ success: true });
    rejectCompletion.mockResolvedValue({ success: true });
    updateDeal.mockResolvedValue({ success: true });
    sendSMS.mockResolvedValue({ success: true });
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
    expect(screen.getByRole("link", { name: /open customer timeline/i })).toHaveAttribute("href", "/crm/inbox?contact=contact_1");
    expect(screen.getByText(/full SMS, email, and call correspondence/i)).toBeInTheDocument();

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

  it("routes edit actions to the actual edit pages", async () => {
    const user = userEvent.setup();

    const { unmount } = render(
      <DealDetailModal dealId="deal_1" open onOpenChange={vi.fn()} currentUserRole="OWNER" />,
    );

    await screen.findAllByText("Blocked Drain");

    await user.click(screen.getAllByRole("button", { name: "Edit job" })[0]);
    expect(routerPush).toHaveBeenCalledWith("/crm/deals/deal_1/edit");

    unmount();

    render(<DealDetailModal dealId="deal_1" open onOpenChange={vi.fn()} currentUserRole="OWNER" />);
    await screen.findAllByText("Blocked Drain");

    await user.click(screen.getByRole("button", { name: "Edit contact" }));
    expect(routerPush).toHaveBeenCalledWith("/crm/contacts/contact_1/edit");
  });

  it("shows an honest disabled timeline action when no contact is linked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          makeDealResponse({
            contactId: null,
            contact: null,
          }),
        ),
      ),
    );

    render(<DealDetailModal dealId="deal_1" open onOpenChange={vi.fn()} currentUserRole="OWNER" />);

    await screen.findAllByText("Blocked Drain");
    expect(screen.getByRole("button", { name: /no contact linked/i })).toBeDisabled();
  });

  it("sends a direct sms when clicking the send button", async () => {
    const user = userEvent.setup();

    render(<DealDetailModal dealId="deal_1" open onOpenChange={vi.fn()} currentUserRole="OWNER" />);

    await screen.findAllByText("Blocked Drain");

    expect(screen.getByText(/Send a direct SMS from your workspace number/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Send a direct SMS..."), "Running 10 mins late");
    await user.click(screen.getByRole("button", { name: "Send direct SMS" }));

    await waitFor(() => {
      expect(sendSMS).toHaveBeenCalledWith("contact_1", "Running 10 mins late", "deal_1");
    });
    expect(toastSuccess).toHaveBeenCalledWith("SMS sent");
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("shows the returned error when confirming a draft job is rejected", async () => {
    updateDeal.mockResolvedValue({ success: false, error: "Only managers can confirm drafts." });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          makeDealResponse({
            stage: "CONTACTED",
            isDraft: true,
          }),
        ),
      ),
    );

    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<DealDetailModal dealId="deal_1" open onOpenChange={onOpenChange} currentUserRole="OWNER" />);

    await screen.findAllByText("Blocked Drain");
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledWith("deal_1", { isDraft: false });
    });
    expect(toastError).toHaveBeenCalledWith("Only managers can confirm drafts.");
    expect(toastSuccess).not.toHaveBeenCalledWith("Job confirmed");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
