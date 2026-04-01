import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, logger, getAuthUser, getAuthUserId, inferTimezoneFromAddress } = vi.hoisted(() => ({
  db: {
    workspace: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  logger: {
    authFlow: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    workspaceError: vi.fn(),
    critical: vi.fn(),
    databaseError: vi.fn(),
  },
  getAuthUser: vi.fn(),
  getAuthUserId: vi.fn(),
  inferTimezoneFromAddress: vi.fn(() => "Australia/Sydney"),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/logging", () => ({ logger }));
vi.mock("@/lib/auth", () => ({ getAuthUser, getAuthUserId }));
vi.mock("@/lib/timezone", () => ({ inferTimezoneFromAddress }));

import {
  checkUserRoute,
  ensureWorkspaceUserForAuth,
  getOrCreateWorkspace,
  updateWorkspacePipelineSettings,
} from "@/actions/workspace-actions";

describe("workspace-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getAuthUser.mockResolvedValue({ id: "auth_123", email: "owner@example.com", name: "Owner Name" });
    getAuthUserId.mockResolvedValue("auth_123");
  });

  it("updates an existing app user when auth resolves by email", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "owner@example.com",
      workspaceId: "old_ws",
      role: "MANAGER",
    });

    const result = await ensureWorkspaceUserForAuth({
      workspaceId: "ws_123",
      name: "Updated Owner",
    });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        workspaceId: "ws_123",
        role: "MANAGER",
        name: "Updated Owner",
      },
    });
    expect(result).toEqual({
      id: "user_1",
      email: "owner@example.com",
      workspaceId: "ws_123",
    });
  });

  it("creates a fallback phone-auth user when there is no auth email", async () => {
    getAuthUser.mockResolvedValue(null);
    getAuthUserId.mockResolvedValue("phone_user");
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: "phone_user",
      email: "phone_user@phone-auth.local",
      workspaceId: "ws_555",
    });

    const result = await ensureWorkspaceUserForAuth({
      workspaceId: "ws_555",
      phone: "0400000000",
    });

    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        id: "phone_user",
        email: "phone_user@phone-auth.local",
        name: null,
        phone: "0400000000",
        workspaceId: "ws_555",
        role: "OWNER",
        hasOnboarded: false,
      },
      select: { id: true, email: true, workspaceId: true },
    });
    expect(result).toEqual({
      id: "phone_user",
      email: "phone_user@phone-auth.local",
      workspaceId: "ws_555",
    });
  });

  it("merges pipeline health settings into existing workspace settings", async () => {
    db.workspace.findUnique.mockResolvedValue({
      settings: {
        followUpDays: 2,
        urgentDays: 5,
        voiceEnabled: true,
      },
    });

    await expect(updateWorkspacePipelineSettings("ws_123", { followUpDays: 4 })).resolves.toEqual({
      success: true,
    });

    expect(db.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_123" },
      data: {
        settings: {
          followUpDays: 4,
          urgentDays: 5,
          voiceEnabled: true,
        },
      },
    });
  });

  it("routes active but incomplete users to setup and complete users to the crm dashboard", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user_123",
      role: "OWNER",
      workspaceId: "ws_123",
    });
    db.workspace.findUnique
      .mockResolvedValueOnce({
        id: "ws_123",
        name: "Acme",
        type: "TRADIE",
        industryType: "TRADES",
        ownerId: "user_123",
        location: "Sydney",
        onboardingComplete: false,
        tutorialComplete: false,
        brandingColor: null,
        stripeCustomerId: null,
        stripePriceId: null,
        subscriptionStatus: "active",
        settings: {},
      })
      .mockResolvedValueOnce({
        id: "ws_123",
        name: "Acme",
        type: "TRADIE",
        industryType: "TRADES",
        ownerId: "user_123",
        location: "Sydney",
        onboardingComplete: true,
        tutorialComplete: false,
        brandingColor: null,
        stripeCustomerId: null,
        stripePriceId: null,
        subscriptionStatus: "active",
        settings: {},
      });

    await expect(checkUserRoute("user_123")).resolves.toBe("/setup");
    await expect(checkUserRoute("user_123")).resolves.toBe("/crm/dashboard");
  });

  it("creates a new workspace when no prior workspace can be resolved", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.workspace.create.mockResolvedValue({
      id: "ws_new",
      name: "My Workspace",
      type: "TRADIE",
      industryType: null,
      ownerId: "user_999",
      location: null,
      onboardingComplete: false,
      tutorialComplete: false,
      brandingColor: null,
      stripeCustomerId: null,
      stripePriceId: null,
      subscriptionStatus: null,
      settings: {},
    });
    db.user.create.mockResolvedValue({
      id: "user_999",
      email: "owner@example.com",
      workspaceId: "ws_new",
    });

    const workspace = await getOrCreateWorkspace("user_999");

    expect(db.workspace.create).toHaveBeenCalledWith({
      data: {
        name: "My Workspace",
        type: "TRADIE",
        industryType: null,
        location: null,
        workspaceTimezone: "Australia/Sydney",
        ownerId: "user_999",
      },
    });
    expect(workspace).toEqual({
      id: "ws_new",
      name: "My Workspace",
      type: "TRADIE",
      industryType: null,
      ownerId: "user_999",
      location: null,
      onboardingComplete: false,
      tutorialComplete: false,
      brandingColor: "",
      stripeCustomerId: null,
      stripePriceId: null,
      subscriptionStatus: null,
      settings: {},
    });
  });
});
