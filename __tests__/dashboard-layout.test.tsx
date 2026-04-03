import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirect,
  logger,
  getDashboardShellState,
  getAuthUser,
  resolveHeaderDisplayName,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  logger: {
    authFlow: vi.fn(),
    workspaceError: vi.fn(),
  },
  getDashboardShellState: vi.fn(),
  getAuthUser: vi.fn(),
  resolveHeaderDisplayName: vi.fn(() => "Michael"),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/logging", () => ({
  logger,
}));

vi.mock("@/lib/dashboard-shell", () => ({
  getDashboardShellState,
}));

vi.mock("@/components/layout/shell-host", () => ({
  ShellHost: ({
    chatbot,
    children,
  }: {
    chatbot: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="shell-chatbot">{chatbot}</div>
      <div data-testid="shell-children">{children}</div>
    </div>
  ),
}));

vi.mock("@/components/chatbot/deferred-chat-interface", () => ({
  DeferredChatInterface: ({ workspaceId }: { workspaceId: string }) => (
    <div data-testid="deferred-chat">workspace:{workspaceId}</div>
  ),
}));

vi.mock("@/components/providers/dashboard-provider", () => ({
  DashboardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/providers/sync-provider", () => ({
  SyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/providers/industry-provider", () => ({
  IndustryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/providers/dashboard-client-chrome", () => ({
  DashboardClientChrome: () => <div data-testid="dashboard-client-chrome" />,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/display-name", () => ({
  resolveHeaderDisplayName,
}));

vi.mock("@/components/layout/shell-initializer", () => ({
  ShellInitializer: ({ workspaceId }: { workspaceId: string }) => (
    <div data-testid="shell-initializer">{workspaceId}</div>
  ),
}));

import DashboardLayout from "@/app/crm/layout";

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUser.mockResolvedValue(null);
  });

  it("renders the dashboard shell with the deferred chat interface", async () => {
    getDashboardShellState.mockResolvedValue({
      userId: "user_123",
      userRole: "OWNER",
      workspace: {
        id: "ws_123",
        subscriptionStatus: "active",
        onboardingComplete: true,
        tutorialComplete: false,
      },
    });

    const layout = await DashboardLayout({
      children: <div>dashboard page</div>,
    });
    render(layout);

    expect(screen.getByTestId("shell-initializer")).toHaveTextContent("ws_123");
    expect(screen.getByTestId("deferred-chat")).toHaveTextContent("workspace:ws_123");
    expect(screen.getByTestId("shell-children")).toHaveTextContent("dashboard page");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated visitors to /auth", async () => {
    getDashboardShellState.mockResolvedValue(null);

    await expect(
      DashboardLayout({
        children: <div>dashboard page</div>,
      }),
    ).rejects.toThrow("REDIRECT:/auth");
  });

  it("redirects unpaid workspaces to /billing", async () => {
    getDashboardShellState.mockResolvedValue({
      userId: "user_123",
      userRole: "OWNER",
      workspace: {
        id: "ws_123",
        subscriptionStatus: "inactive",
        onboardingComplete: false,
        tutorialComplete: false,
      },
    });

    await expect(
      DashboardLayout({
        children: <div>dashboard page</div>,
      }),
    ).rejects.toThrow("REDIRECT:/billing");
  });

  it("redirects active but un-onboarded workspaces to /setup", async () => {
    getDashboardShellState.mockResolvedValue({
      userId: "user_123",
      userRole: "OWNER",
      workspace: {
        id: "ws_123",
        subscriptionStatus: "active",
        onboardingComplete: false,
        tutorialComplete: false,
      },
    });

    await expect(
      DashboardLayout({
        children: <div>dashboard page</div>,
      }),
    ).rejects.toThrow("REDIRECT:/setup");
  });
});
