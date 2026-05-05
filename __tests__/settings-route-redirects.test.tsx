import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, requireCurrentWorkspaceAccess, workspaceFindUnique } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireCurrentWorkspaceAccess: vi.fn(),
  workspaceFindUnique: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/lib/db", () => ({
  db: {
    workspace: {
      findUnique: workspaceFindUnique,
    },
  },
}));

vi.mock("@/components/billing/manage-subscription-button", () => ({
  ManageSubscriptionButton: ({ workspaceId }: { workspaceId: string }) => <div>Manage {workspaceId}</div>,
}));

vi.mock("@/lib/billing-plan", () => ({
  getBillingIntervalForPriceId: vi.fn(() => "monthly"),
  getPlanLabelForPriceId: vi.fn(() => "Starter"),
}));

import AIVoiceSettingsPage from "@/app/crm/settings/ai-voice/page";
import AfterHoursSettingsPage from "@/app/crm/settings/after-hours/page";
import BillingSettingsPage from "@/app/crm/settings/billing/page";
import PhoneSettingsPage from "@/app/crm/settings/phone-settings/page";
import SmsTemplatesPage from "@/app/crm/settings/sms-templates/page";
import SupportPage from "@/app/crm/settings/support/page";
import DataPrivacySettingsPage from "@/app/crm/settings/data-privacy/page";

describe("settings route redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    workspaceFindUnique.mockResolvedValue({
      id: "ws_1",
      stripePriceId: "price_1",
      subscriptionStatus: "active",
    });
  });

  it("redirects legacy settings routes to their canonical destinations", () => {
    expect(() => PhoneSettingsPage()).toThrow("REDIRECT:/crm/settings/call-settings");
    expect(() => SupportPage()).toThrow("REDIRECT:/crm/settings/help");
    expect(() => DataPrivacySettingsPage()).toThrow("REDIRECT:/crm/settings/privacy");
    expect(() => SmsTemplatesPage()).toThrow("REDIRECT:/crm/settings/call-settings");
    expect(() => AIVoiceSettingsPage()).toThrow("REDIRECT:/crm/settings/call-settings");
    expect(() => AfterHoursSettingsPage()).toThrow("REDIRECT:/crm/settings/call-settings");
  });

  it("blocks team members from opening billing directly by URL", async () => {
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_2",
      role: "TEAM_MEMBER",
      workspaceId: "ws_1",
    });

    await expect(BillingSettingsPage()).rejects.toThrow("REDIRECT:/crm/settings");
    expect(workspaceFindUnique).not.toHaveBeenCalled();
  });

  it("renders billing for managers and owners", async () => {
    const page = await BillingSettingsPage();

    expect(page).toBeTruthy();
    expect(requireCurrentWorkspaceAccess).toHaveBeenCalled();
    expect(workspaceFindUnique).toHaveBeenCalledWith({
      where: { id: "ws_1" },
      select: {
        id: true,
        stripePriceId: true,
        subscriptionStatus: true,
      },
    });
  });
});
