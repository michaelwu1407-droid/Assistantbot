import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkspaceRecord = {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  industryType: string | null;
  location: string | null;
  onboardingComplete: boolean;
  tutorialComplete: boolean;
  brandingColor: string | null;
  subscriptionStatus: string | null;
  settings: Record<string, unknown>;
};

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  workspaceId: string;
  role: string;
  hasOnboarded?: boolean;
};

const {
  db,
  logger,
  getAuthUser,
  getAuthUserId,
  inferTimezoneFromAddress,
  initializeTradieComms,
  addMem0Memory,
} = vi.hoisted(() => ({
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
      update: vi.fn(),
      create: vi.fn(),
    },
    businessProfile: {
      upsert: vi.fn(),
    },
    businessKnowledge: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    repairItem: {
      createMany: vi.fn(),
    },
    pricingSettings: {
      upsert: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
  logger: {
    authFlow: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    workspaceError: vi.fn(),
    critical: vi.fn(),
    databaseError: vi.fn(),
    error: vi.fn(),
  },
  getAuthUser: vi.fn(),
  getAuthUserId: vi.fn(),
  inferTimezoneFromAddress: vi.fn(),
  initializeTradieComms: vi.fn(),
  addMem0Memory: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/logging", () => ({ logger }));
vi.mock("@/lib/auth", () => ({ getAuthUser, getAuthUserId }));
vi.mock("@/lib/timezone", () => ({ inferTimezoneFromAddress }));
vi.mock("@/lib/comms", () => ({ initializeTradieComms }));
vi.mock("@/lib/ai/context", () => ({ addMem0Memory }));

const workspaceActionsPromise = import("@/actions/workspace-actions");

describe("integration: onboarding to ready workspace", () => {
  let workspace: WorkspaceRecord;
  let user: UserRecord;
  let businessKnowledgeRows: Array<Record<string, unknown>>;
  let repairItems: Array<Record<string, unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));

    workspace = {
      id: "ws_1",
      ownerId: "user_1",
      name: "My Workspace",
      type: "TRADIE",
      industryType: null,
      location: null,
      onboardingComplete: false,
      tutorialComplete: false,
      brandingColor: null,
      subscriptionStatus: "active",
      settings: {},
    };
    user = {
      id: "user_1",
      email: "owner@example.com",
      name: "Michael Wu",
      phone: null,
      workspaceId: "ws_1",
      role: "OWNER",
      hasOnboarded: false,
    };
    businessKnowledgeRows = [];
    repairItems = [];

    getAuthUserId.mockResolvedValue("user_1");
    getAuthUser.mockResolvedValue({
      id: "user_1",
      email: "owner@example.com",
      name: "Michael Wu",
    });
    inferTimezoneFromAddress.mockReturnValue("Australia/Sydney");
    initializeTradieComms.mockResolvedValue({
      success: true,
      phoneNumber: "+61485010634",
    });

    db.user.findUnique.mockImplementation(async ({ where, select }) => {
      if (where.email && where.email === user.email) {
        return select ? { id: user.id, role: user.role, workspaceId: user.workspaceId } : user;
      }
      if (where.id && where.id === user.id) {
        if (select?.email) return { email: user.email };
        return user;
      }
      return null;
    });
    db.user.update.mockImplementation(async ({ where, data }) => {
      if (where.id !== user.id) return null;
      Object.assign(user, data);
      return user;
    });
    db.user.create.mockImplementation(async ({ data, select }) => {
      Object.assign(user, data);
      return select ? { id: user.id, email: user.email, workspaceId: user.workspaceId } : user;
    });

    db.workspace.findFirst.mockImplementation(async ({ where }) => {
      if (where.ownerId === user.id) return workspace;
      return null;
    });
    db.workspace.findUnique.mockImplementation(async ({ where, select }) => {
      if (where.id !== workspace.id) return null;
      if (select?.settings) return { settings: workspace.settings };
      return workspace;
    });
    db.workspace.create.mockImplementation(async ({ data }) => {
      Object.assign(workspace, data);
      return workspace;
    });
    db.workspace.update.mockImplementation(async ({ where, data }) => {
      if (where.id !== workspace.id) return null;
      workspace = {
        ...workspace,
        ...data,
        settings: data.settings ? { ...workspace.settings, ...data.settings } : workspace.settings,
      };
      return workspace;
    });

    db.businessProfile.upsert.mockResolvedValue(undefined);
    db.businessKnowledge.create.mockImplementation(async ({ data }) => {
      businessKnowledgeRows.push(data);
      return data;
    });
    db.businessKnowledge.createMany.mockImplementation(async ({ data }) => {
      businessKnowledgeRows.push(...data);
      return { count: data.length };
    });
    db.repairItem.createMany.mockImplementation(async ({ data }) => {
      repairItems.push(...data);
      return { count: data.length };
    });
    db.pricingSettings.upsert.mockResolvedValue(undefined);
    db.activity.create.mockResolvedValue(undefined);
    db.workspace.findMany.mockResolvedValue([workspace]);
  });

  it("completes onboarding, provisions a phone number, and routes the user to the dashboard", async () => {
    const { completeOnboarding, checkUserRoute } = await workspaceActionsPromise;

    const result = await completeOnboarding({
      ownerName: "Michael Wu",
      businessName: "Acme Plumbing",
      industryType: "TRADES",
      location: "Sydney NSW",
      ownerPhone: "0400000000",
      tradeType: "Plumber",
      serviceRadius: 25,
      workHours: "Mon-Fri, 08:00-17:00",
      emergencyService: true,
      callOutFee: 149,
      pricingMode: "STANDARD",
      agentMode: "EXECUTION",
      workingHoursStart: "08:00",
      workingHoursEnd: "17:00",
      agendaNotifyTime: "07:00",
      wrapupNotifyTime: "17:30",
      autoUpdateGlossary: true,
      autoCallLeads: true,
      callForwardingEnabled: true,
      businessContact: { email: "office@acme.com" },
      pricingServices: [{ service: "Blocked drain", minFee: 180, maxFee: 350 }],
      disableAiQuoting: false,
      leadSources: ["hipages", "webform"],
      emergencyBypass: true,
      digestPreference: "daily",
      exclusionCriteria: "No roof work above two storeys",
    });

    expect(result).toEqual({
      success: true,
      workspaceId: "ws_1",
      phoneNumber: "+61485010634",
      provisioningError: undefined,
    });
    expect(workspace).toEqual(
      expect.objectContaining({
        name: "Acme Plumbing",
        industryType: "TRADES",
        location: "Sydney NSW",
        onboardingComplete: true,
      }),
    );
    expect(workspace.settings).toEqual(
      expect.objectContaining({
        businessContact: {
          phone: "0400000000",
          email: "office@acme.com",
          address: "Sydney NSW",
        },
        pricingServices: [{ service: "Blocked drain", minFee: 180, maxFee: 350 }],
        leadSources: ["hipages", "webform"],
        emergencyBypass: true,
        digestPreference: "daily",
        callForwardingEnabled: true,
        callForwardingMode: "full",
      }),
    );
    expect(businessKnowledgeRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "NEGATIVE_SCOPE",
          ruleContent: "No roof work above two storeys",
        }),
        expect.objectContaining({
          category: "SERVICE",
          ruleContent: "Blocked drain",
          metadata: { priceRange: "$180 - $350" },
        }),
      ]),
    );
    expect(repairItems).toEqual([
      expect.objectContaining({
        workspaceId: "ws_1",
        title: "Blocked drain",
        description: "$180 - $350",
      }),
    ]);
    expect(addMem0Memory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "ws_1",
        metadata: expect.objectContaining({
          type: "hard_constraint",
          action: "decline",
          source: "onboarding",
        }),
      }),
    );

    await expect(checkUserRoute("user_1")).resolves.toBe("/crm/dashboard");
  });
});
