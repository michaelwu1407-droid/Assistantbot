import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireCurrentWorkspaceAccess,
  db,
  buildXeroAuthUrl,
  buildGoogleCalendarAuthUrl,
  disconnectGoogleCalendarIntegration,
  getWorkspaceCalendarStatus,
} = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    user: {
      findUnique: vi.fn(),
    },
    emailIntegration: {
      deleteMany: vi.fn(),
    },
  },
  buildXeroAuthUrl: vi.fn((workspaceId: string) => `xero:${workspaceId}`),
  buildGoogleCalendarAuthUrl: vi.fn((workspaceId: string) => `calendar:${workspaceId}`),
  disconnectGoogleCalendarIntegration: vi.fn(),
  getWorkspaceCalendarStatus: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/xero", () => ({
  buildXeroAuthUrl,
  getXeroOAuthRedirectUri: vi.fn(() => "https://app.example/api/auth/xero/callback"),
}));

vi.mock("@/lib/workspace-calendar", () => ({
  buildGoogleCalendarAuthUrl,
  disconnectGoogleCalendarIntegration,
  getWorkspaceCalendarStatus,
}));

import {
  connectGoogleCalendar,
  connectXero,
  disconnectEmailIntegration,
  disconnectWorkspaceCalendarIntegration,
  getIntegrationStatus,
} from "@/actions/integration-actions";

describe("integration-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example";
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.XERO_CLIENT_ID = "xero-id";
    process.env.XERO_CLIENT_SECRET = "xero-secret";
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    db.user.findUnique.mockResolvedValue({
      workspaceId: "ws_1",
      emailIntegrations: [{ id: "gmail_1", provider: "gmail", emailAddress: "owner@example.com", isActive: true }],
      workspace: { settings: { xero_access_token: "token", xero_tenant_id: "tenant" } },
    });
    getWorkspaceCalendarStatus.mockResolvedValue({
      connected: true,
      provider: "google",
      emailAddress: "owner@example.com",
      lastSyncAt: null,
      calendarId: "primary",
    });
  });

  it("builds integration URLs from the actor workspace", async () => {
    await expect(connectXero()).resolves.toEqual({ url: "xero:ws_1" });
    await expect(connectGoogleCalendar()).resolves.toEqual({ url: "calendar:ws_1" });
  });

  it("loads integration status from the actor app user and workspace", async () => {
    await expect(getIntegrationStatus()).resolves.toMatchObject({
      emailIntegrations: [{ id: "gmail_1" }],
      xeroConnected: true,
      calendarIntegration: { connected: true },
    });
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app_user_1" },
      }),
    );
    expect(getWorkspaceCalendarStatus).toHaveBeenCalledWith("ws_1");
  });

  it("disconnects calendar and email integrations through actor-scoped IDs", async () => {
    await expect(disconnectWorkspaceCalendarIntegration()).resolves.toEqual({ success: true });
    expect(disconnectGoogleCalendarIntegration).toHaveBeenCalledWith("ws_1");

    await expect(disconnectEmailIntegration("email_1")).resolves.toEqual({ success: true });
    expect(db.emailIntegration.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "email_1",
        userId: "app_user_1",
      },
    });
  });
});
