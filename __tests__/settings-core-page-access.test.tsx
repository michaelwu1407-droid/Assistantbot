import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  redirect,
  requireCurrentWorkspaceAccess,
  getUserProfile,
  getAutomations,
  getWorkspaceWithSettings,
  getBusinessContact,
  getWorkspaceSettings,
  db,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireCurrentWorkspaceAccess: vi.fn(),
  getUserProfile: vi.fn(),
  getAutomations: vi.fn(),
  getWorkspaceWithSettings: vi.fn(),
  getBusinessContact: vi.fn(),
  getWorkspaceSettings: vi.fn(),
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    businessProfile: {
      findUnique: vi.fn(),
    },
    businessDocument: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/user-actions", () => ({
  getUserProfile,
}));

vi.mock("@/actions/automation-actions", () => ({
  getAutomations,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getWorkspaceWithSettings,
}));

vi.mock("@/actions/settings-actions", () => ({
  getBusinessContact,
  getWorkspaceSettings,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/components/dashboard/profile-form", () => ({
  ProfileForm: ({ userId }: { userId: string }) => <div>profile-form:{userId}</div>,
}));

vi.mock("@/components/settings/referral-settings", () => ({
  ReferralSettings: ({ userId }: { userId: string }) => <div>referrals:{userId}</div>,
}));

vi.mock("@/components/settings/call-forwarding-card", () => ({
  CallForwardingCard: () => <div>call-forwarding</div>,
}));

vi.mock("@/components/settings/account-security-card", () => ({
  AccountSecurityCard: ({ userId, businessName }: { userId: string; businessName: string }) => (
    <div>
      security:{userId}:{businessName}
    </div>
  ),
}));

vi.mock("@/app/crm/settings/automations/automation-list", () => ({
  AutomationList: ({ workspaceId }: { workspaceId: string }) => <div>automations:{workspaceId}</div>,
}));

vi.mock("@/components/settings/my-business-details", () => ({
  MyBusinessDetails: ({
    workspaceId,
    initialData,
  }: {
    workspaceId: string;
    initialData: { name: string; specialty: string };
  }) => (
    <div>
      business-details:{workspaceId}:{initialData.name}:{initialData.specialty}
    </div>
  ),
}));

vi.mock("@/components/settings/working-hours-form", () => ({
  WorkingHoursForm: () => <div>working-hours</div>,
}));

vi.mock("@/components/settings/business-contact-form", () => ({
  BusinessContactForm: () => <div>business-contact</div>,
}));

vi.mock("@/components/settings/service-areas-section", () => ({
  ServiceAreasSection: () => <div>service-areas</div>,
}));

vi.mock("@/components/settings/pricing-for-agent-section", () => ({
  PricingForAgentSection: () => <div>pricing</div>,
}));

vi.mock("@/components/settings/attachment-library-section", () => ({
  AttachmentLibrarySection: () => <div>attachments</div>,
}));

vi.mock("@/components/settings/google-review-url-section", () => ({
  GoogleReviewUrlSection: ({ initialUrl }: { initialUrl: string }) => <div>reviews:{initialUrl}</div>,
}));

import AccountSettingsPage from "@/app/crm/settings/page";
import AutomationsPage from "@/app/crm/settings/automations/page";
import MyBusinessSettingsPage from "@/app/crm/settings/my-business/page";

describe("core settings page access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      name: "Alexandria Plumbing",
      location: "Alexandria NSW",
    });
    getUserProfile.mockResolvedValue({
      username: "Miguel",
      email: "miguel@example.com",
      viewMode: "ADVANCED",
    });
    getAutomations.mockResolvedValue([]);
    getWorkspaceWithSettings.mockResolvedValue({});
    getBusinessContact.mockResolvedValue(null);
    getWorkspaceSettings.mockResolvedValue({ googleReviewUrl: "https://reviews.example" });
    db.businessProfile.findUnique.mockResolvedValue({ tradeType: "Electrician" });
    db.businessDocument.findMany.mockResolvedValue([]);
  });

  it("renders account settings for the app user and workspace", async () => {
    render(await AccountSettingsPage());

    expect(getUserProfile).toHaveBeenCalledWith("app_user_1");
    expect(screen.getByText("profile-form:app_user_1")).toBeInTheDocument();
    expect(screen.getByText("security:app_user_1:Alexandria Plumbing")).toBeInTheDocument();
    expect(screen.getByText("referrals:app_user_1")).toBeInTheDocument();
  });

  it("renders automations from the actor workspace", async () => {
    render(await AutomationsPage());

    expect(getAutomations).toHaveBeenCalledWith("ws_1");
    expect(screen.getByText("automations:ws_1")).toBeInTheDocument();
  });

  it("renders my-business settings from the actor workspace and app user", async () => {
    render(await MyBusinessSettingsPage());

    expect(db.businessProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "app_user_1" },
      select: { tradeType: true },
    });
    expect(db.businessDocument.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws_1" },
      orderBy: { createdAt: "desc" },
    });
    expect(screen.getByText("business-details:ws_1:Alexandria Plumbing:Electrician")).toBeInTheDocument();
    expect(screen.getByText("reviews:https://reviews.example")).toBeInTheDocument();
  });
});
