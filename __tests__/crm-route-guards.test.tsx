import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, isManagerOrAbove } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  isManagerOrAbove: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/rbac", () => ({
  isManagerOrAbove,
}));

import AnalyticsLayout from "@/app/crm/analytics/layout";
import IntegrationsLayout from "@/app/crm/settings/integrations/layout";

describe("CRM route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects team members away from analytics before rendering the page", async () => {
    isManagerOrAbove.mockResolvedValue(false);

    await expect(
      AnalyticsLayout({ children: <div>analytics</div> }),
    ).rejects.toThrow("REDIRECT:/crm/dashboard");
  });

  it("allows managers into analytics", async () => {
    isManagerOrAbove.mockResolvedValue(true);

    await expect(
      AnalyticsLayout({ children: <div>analytics</div> }),
    ).resolves.toEqual(<div>analytics</div>);
  });

  it("redirects team members away from integrations before rendering the page", async () => {
    isManagerOrAbove.mockResolvedValue(false);

    await expect(
      IntegrationsLayout({ children: <div>integrations</div> }),
    ).rejects.toThrow("REDIRECT:/crm/settings");
  });
});
