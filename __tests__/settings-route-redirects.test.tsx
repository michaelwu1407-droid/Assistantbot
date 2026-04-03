import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, isManagerOrAbove, getAuthUserId, getOrCreateWorkspace } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  isManagerOrAbove: vi.fn(),
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/rbac", () => ({
  isManagerOrAbove,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
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

describe("settings route redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isManagerOrAbove.mockResolvedValue(true);
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      stripePriceId: "price_1",
      subscriptionStatus: "active",
    });
  });

  it("redirects legacy settings routes to their canonical destinations", () => {
    expect(() => PhoneSettingsPage()).toThrow("REDIRECT:/crm/settings");
    expect(() => SupportPage()).toThrow("REDIRECT:/crm/settings/help");
    expect(() => SmsTemplatesPage()).toThrow("REDIRECT:/crm/settings/call-settings");
    expect(() => AIVoiceSettingsPage()).toThrow("REDIRECT:/crm/settings/call-settings");
    expect(() => AfterHoursSettingsPage()).toThrow("REDIRECT:/crm/settings/call-settings");
  });

  it("blocks team members from opening billing directly by URL", async () => {
    isManagerOrAbove.mockResolvedValue(false);

    await expect(BillingSettingsPage()).rejects.toThrow("REDIRECT:/crm/settings");
    expect(getAuthUserId).not.toHaveBeenCalled();
    expect(getOrCreateWorkspace).not.toHaveBeenCalled();
  });

  it("renders billing for managers and owners", async () => {
    const page = await BillingSettingsPage();

    expect(page).toBeTruthy();
    expect(getAuthUserId).toHaveBeenCalled();
    expect(getOrCreateWorkspace).toHaveBeenCalledWith("user_1");
  });
});
