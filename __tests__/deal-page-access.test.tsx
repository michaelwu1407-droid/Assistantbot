import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { notFound, requireDealInCurrentWorkspace, db } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  requireDealInCurrentWorkspace: vi.fn(),
  db: {
    deal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
    voiceCall: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound,
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

vi.mock("@/lib/workspace-access", () => ({
  requireDealInCurrentWorkspace,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/components/crm/deal-notes", () => ({
  DealNotes: () => <div>Deal notes</div>,
}));

vi.mock("@/components/crm/activity-feed", () => ({
  ActivityFeed: () => <div>Activity feed</div>,
}));

vi.mock("@/components/crm/deal-photos-upload", () => ({
  DealPhotosUpload: () => <div>Deal photos</div>,
}));

vi.mock("@/components/tradie/job-billing-tab", () => ({
  JobBillingTab: () => <div>Job billing</div>,
}));

vi.mock("@/actions/invite-actions", () => ({
  getTeamMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/actions/deal-actions", () => ({
  getDealRecurrence: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/app/crm/deals/[id]/edit/deal-edit-form", () => ({
  DealEditForm: ({
    canManageAssignment,
    teamMembers,
  }: {
    canManageAssignment: boolean;
    teamMembers: Array<{ id: string }>;
  }) => (
    <div data-testid="deal-edit-form">
      manage-assignment:{String(canManageAssignment)} members:{teamMembers.length}
    </div>
  ),
}));

import DealDetailPage from "@/app/crm/deals/[id]/page";
import DealEditPage from "@/app/crm/deals/[id]/edit/page";

describe("deal page access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "OWNER" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });
    db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      title: "Blocked Drain",
      value: 420,
      stage: "SCHEDULED",
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      scheduledAt: new Date("2026-04-02T10:00:00.000Z"),
      address: "1 King St",
      metadata: {},
      contactId: "contact_1",
      assignedToId: "user_1",
      assignedTo: { id: "user_1", name: "Jess Smith", email: "jess@example.com" },
      contact: {
        id: "contact_1",
        name: "Acme Plumbing",
        company: "Acme Plumbing",
        phone: "0400000001",
        email: "office@acme.com",
      },
      jobPhotos: [],
      syncIssues: [],
    });
    db.deal.findMany.mockResolvedValue([]);
    db.workspace.findUnique.mockResolvedValue({ workspaceTimezone: "Australia/Sydney" });
    db.activity.findMany.mockResolvedValue([]);
    db.voiceCall.findMany.mockResolvedValue([]);
  });

  it("renders the deal detail page when access is allowed", async () => {
    render(await DealDetailPage({ params: Promise.resolve({ id: "deal_1" }) }));

    expect(screen.getAllByText("Blocked Drain").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /contact them/i })).toHaveAttribute(
      "href",
      "/crm/inbox?contact=contact_1",
    );
    expect(screen.getByRole("link", { name: /edit contact/i })).toHaveAttribute(
      "href",
      "/crm/contacts/contact_1/edit",
    );
    expect(screen.getByText("Activity feed")).toBeInTheDocument();
  });

  it("returns not found when the scoped deal lookup denies access", async () => {
    requireDealInCurrentWorkspace.mockRejectedValue(new Error("Deal not found"));

    await expect(
      DealDetailPage({ params: Promise.resolve({ id: "deal_1" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("hides assignment controls on the edit page for team members", async () => {
    requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "TEAM_MEMBER" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });

    render(await DealEditPage({ params: Promise.resolve({ id: "deal_1" }) }));

    expect(screen.getByTestId("deal-edit-form")).toHaveTextContent("manage-assignment:false");
    expect(screen.getByTestId("deal-edit-form")).toHaveTextContent("members:0");
  });

  it("scopes related job history to the assigned tradie on the detail page", async () => {
    requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "TEAM_MEMBER" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });

    render(await DealDetailPage({ params: Promise.resolve({ id: "deal_1" }) }));

    expect(db.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contactId: "contact_1",
          workspaceId: "ws_1",
          assignedToId: "user_1",
          id: { not: "deal_1" },
        }),
      }),
    );
  });
});
