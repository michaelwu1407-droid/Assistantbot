import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, getAuthUserId, getOrCreateWorkspace, authFlow, authError } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  authFlow: vi.fn(),
  authError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    authFlow,
    authError,
  },
}));

import AuthNextPage from "@/app/auth/next/page";

describe("AuthNextPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors to /auth", async () => {
    getAuthUserId.mockResolvedValue(null);

    await expect(AuthNextPage()).rejects.toThrow("REDIRECT:/auth");
  });

  it("redirects to /auth when workspace lookup fails", async () => {
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockRejectedValue(new Error("db offline"));

    await expect(AuthNextPage()).rejects.toThrow("REDIRECT:/auth");
    expect(authError).toHaveBeenCalled();
  });

  it("redirects unpaid users to /billing", async () => {
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      subscriptionStatus: "inactive",
      onboardingComplete: true,
      tutorialComplete: true,
      ownerId: "user_1",
    });

    await expect(AuthNextPage()).rejects.toThrow("REDIRECT:/billing");
  });

  it("redirects subscribed but not onboarded users to /setup", async () => {
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      subscriptionStatus: "active",
      onboardingComplete: false,
      tutorialComplete: false,
      ownerId: "user_1",
    });

    await expect(AuthNextPage()).rejects.toThrow("REDIRECT:/setup");
  });

  it("redirects subscribed users with incomplete tutorial to tutorial mode", async () => {
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      subscriptionStatus: "active",
      onboardingComplete: true,
      tutorialComplete: false,
      ownerId: "user_1",
    });

    await expect(AuthNextPage()).rejects.toThrow("REDIRECT:/crm/dashboard?tutorial=1");
  });

  it("redirects fully ready users to the CRM dashboard", async () => {
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      subscriptionStatus: "active",
      onboardingComplete: true,
      tutorialComplete: true,
      ownerId: "user_1",
    });

    await expect(AuthNextPage()).rejects.toThrow("REDIRECT:/crm/dashboard");
  });
});
