import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("@/lib/auth", () => ({ getAuthUserId: hoisted.getAuthUserId }));
vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace: hoisted.getOrCreateWorkspace,
}));
vi.mock("next/navigation", () => ({ redirect: hoisted.redirect }));
vi.mock("@/components/onboarding/tracey-onboarding", () => ({
  TraceyOnboarding: ({ isResuming }: { isResuming?: boolean }) => (
    <div data-testid="tracey-onboarding" data-is-resuming={String(isResuming ?? false)}>
      {isResuming ? "Welcome back!" : "Let's get started"}
    </div>
  ),
}));

import SetupPage from "@/app/setup/page";

describe("SetupPage isResuming detection (onb-15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUserId.mockResolvedValue("user_1");
  });

  it("passes isResuming=false for a fresh workspace with default name", async () => {
    hoisted.getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      onboardingComplete: false,
      name: "My Workspace",
    });

    const page = await SetupPage();
    render(page);

    expect(screen.getByTestId("tracey-onboarding").getAttribute("data-is-resuming")).toBe("false");
    expect(screen.getByText("Let's get started")).toBeTruthy();
  });

  it("passes isResuming=true when workspace has a custom name (onb-15)", async () => {
    hoisted.getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      onboardingComplete: false,
      name: "Smith Plumbing",
    });

    const page = await SetupPage();
    render(page);

    expect(screen.getByTestId("tracey-onboarding").getAttribute("data-is-resuming")).toBe("true");
    expect(screen.getByText("Welcome back!")).toBeTruthy();
  });

  it("redirects to /crm/dashboard if onboarding is already complete", async () => {
    hoisted.getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      onboardingComplete: true,
      name: "Smith Plumbing",
    });

    await expect(SetupPage()).rejects.toThrow("REDIRECT:/crm/dashboard");
  });
});
