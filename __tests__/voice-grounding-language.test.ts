import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, getWorkspaceSettingsById, sharedGet, sharedSet } = vi.hoisted(() => ({
  db: {
    workspace: { findUnique: vi.fn() },
    businessProfile: { findFirst: vi.fn() },
    repairItem: { findMany: vi.fn() },
    businessKnowledge: { findMany: vi.fn() },
    user: { findFirst: vi.fn() },
    aiPreference: { findMany: vi.fn() },
  },
  getWorkspaceSettingsById: vi.fn(),
  sharedGet: vi.fn().mockResolvedValue(null),
  sharedSet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/actions/settings-actions", () => ({ getWorkspaceSettingsById }));
vi.mock("@/lib/shared-store", () => ({ sharedGet, sharedSet, sharedDelete: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));

import { getWorkspaceVoiceGrounding } from "@/lib/ai/context";

function baseWorkspace() {
  return {
    id: "ws_1",
    name: "Acme Plumbing",
    location: "Sydney",
    twilioPhoneNumber: "+61200000001",
    exclusionCriteria: null,
    ownerId: "user_1",
  };
}

function baseSettings(overrides: Record<string, unknown> = {}) {
  return {
    agentMode: "EXECUTION",
    voiceEnabled: true,
    voiceLanguage: null,
    emergencyBypass: false,
    customerContactMode: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sharedGet.mockResolvedValue(null);
  db.businessProfile.findFirst.mockResolvedValue(null);
  db.repairItem.findMany.mockResolvedValue([]);
  db.businessKnowledge.findMany.mockResolvedValue([]);
  db.user.findFirst.mockResolvedValue(null);
  db.aiPreference.findMany.mockResolvedValue([]);
});

describe("getWorkspaceVoiceGrounding — agentLanguage", () => {
  it("sets agentLanguage to null when voiceLanguage is not configured", async () => {
    db.workspace.findUnique.mockResolvedValue(baseWorkspace());
    getWorkspaceSettingsById.mockResolvedValue(baseSettings({ voiceLanguage: null }));

    const grounding = await getWorkspaceVoiceGrounding("ws_1");

    expect(grounding?.agentLanguage).toBeNull();
  });

  it("passes voiceLanguage through to agentLanguage in the grounding object", async () => {
    db.workspace.findUnique.mockResolvedValue(baseWorkspace());
    getWorkspaceSettingsById.mockResolvedValue(baseSettings({ voiceLanguage: "zh" }));

    const grounding = await getWorkspaceVoiceGrounding("ws_1");

    expect(grounding?.agentLanguage).toBe("zh");
  });

  it("treats empty-string voiceLanguage as null (falsy coercion)", async () => {
    db.workspace.findUnique.mockResolvedValue(baseWorkspace());
    getWorkspaceSettingsById.mockResolvedValue(baseSettings({ voiceLanguage: "" }));

    const grounding = await getWorkspaceVoiceGrounding("ws_1");

    expect(grounding?.agentLanguage).toBeNull();
  });
});
