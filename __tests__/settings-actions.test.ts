import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  db,
  requireCurrentWorkspaceAccess,
  revalidatePath,
  invalidateAgentContextCache,
} = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  requireCurrentWorkspaceAccess: vi.fn(),
  revalidatePath: vi.fn(),
  invalidateAgentContextCache: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}));
vi.mock("@/lib/workspace-access", () => ({ requireCurrentWorkspaceAccess }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/twilio", () => ({
  getSubaccountClient: vi.fn(),
  twilioMasterClient: null,
}));
vi.mock("@/lib/call-forwarding", () => ({
  buildCallForwardingSetupSmsBody: vi.fn(),
}));
vi.mock("@/lib/working-hours", () => ({
  normalizeWeeklyHours: vi.fn((value) => value),
}));
vi.mock("@/lib/agent-mode", () => ({
  normalizeAppAgentMode: vi.fn((mode: string) => (mode === "INFO_ONLY" ? "INFO_ONLY" : "EXECUTION")),
  normalizeAgentMode: vi.fn((mode: string | null | undefined) => {
    if (mode === "INFO_ONLY") return "info_only";
    if (mode === "DRAFT") return "review_approve";
    return "execute";
  }),
}));
vi.mock("@/lib/lead-capture-email", () => ({
  buildLeadCaptureEmail: vi.fn((alias: string, domain: string) => `${alias}@${domain}`),
  resolveInboundLeadDomain: vi.fn(() => "inbound.earlymark.ai"),
  toLeadCaptureAlias: vi.fn((value: string) => value.toLowerCase().replace(/\s+/g, "-")),
}));
vi.mock("@/lib/inbound-lead-email-readiness", () => ({
  getInboundLeadEmailReadiness: vi.fn(),
}));
vi.mock("@/lib/timezone", () => ({
  DEFAULT_WORKSPACE_TIMEZONE: "Australia/Sydney",
  inferTimezoneFromAddress: vi.fn(() => "Australia/Sydney"),
  isValidIanaTimezone: vi.fn(() => true),
}));
vi.mock("@/lib/ai/context", () => ({
  invalidateAgentContextCache,
}));

import {
  setWorkspaceCallOutFee,
  updateAiPreferences,
  updateWorkspaceSettings,
} from "@/actions/settings-actions";

describe("settings-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_123",
      role: "OWNER",
      workspaceId: "ws_123",
    });
    db.workspace.update.mockResolvedValue({});
  });

  it("rejects unsafe ai preference rules before updating workspace settings", async () => {
    db.workspace.findUnique.mockResolvedValueOnce({ agentMode: "INFO_ONLY" });

    await expect(
      updateWorkspaceSettings({
        agentMode: "INFO_ONLY",
        workingHoursStart: "08:00",
        workingHoursEnd: "17:00",
        agendaNotifyTime: "07:30",
        wrapupNotifyTime: "17:30",
        aiPreferences: "- Always send a text immediately after every enquiry",
      }),
    ).rejects.toThrow(/Outbound customer contact cannot be forced/i);

    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("dedupes and formats ai preference rules while merging settings updates", async () => {
    db.workspace.findUnique
      .mockResolvedValueOnce({ agentMode: "EXECUTION" })
      .mockResolvedValueOnce({
        settings: {
          callAllowedStart: "08:00",
          voiceEnabled: false,
        },
      });

    const result = await updateWorkspaceSettings({
      agentMode: "EXECUTION",
      workingHoursStart: "08:00",
      workingHoursEnd: "17:00",
      agendaNotifyTime: "07:30",
      wrapupNotifyTime: "17:30",
      aiPreferences: "- Be concise\nBe concise\n- Confirm pricing tools before quoting",
      voiceEnabled: true,
      callAllowedEnd: "18:30",
      inboundEmailAlias: "acme",
      autoCallLeads: true,
    });

    expect(result).toEqual({ success: true });
    expect(db.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_123" },
      data: {
        agentMode: "EXECUTION",
        workingHoursStart: "08:00",
        workingHoursEnd: "17:00",
        agendaNotifyTime: "07:30",
        wrapupNotifyTime: "17:30",
        aiPreferences: "- Be concise\n- Confirm pricing tools before quoting",
        settings: {
          callAllowedStart: "08:00",
          voiceEnabled: true,
          callAllowedEnd: "18:30",
        },
        inboundEmailAlias: "acme",
        autoCallLeads: true,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/agent");
  });

  it("skips duplicate ai preference rules and enforces the rule cap", async () => {
    db.workspace.findUnique
      .mockResolvedValueOnce({
        aiPreferences: "- Be concise",
      })
      .mockResolvedValueOnce({
        aiPreferences: Array.from({ length: 20 }, (_, index) => `- Rule ${index + 1}`).join("\n"),
        agentMode: "EXECUTION",
      });

    await expect(updateAiPreferences("ws_123", "Be concise")).resolves.toEqual({
      success: true,
      skipped: "duplicate",
    });
    await expect(updateAiPreferences("ws_123", "Rule 21")).resolves.toEqual({
      success: false,
      error: "rule_limit_reached",
      message:
        "You've reached the maximum of 20 behavioural rules. Please delete an existing rule first before adding a new one.",
    });
    expect(db.workspace.update).not.toHaveBeenCalled();
  });

  it("clamps call-out fees, updates the workspace, and invalidates context cache", async () => {
    db.workspace.findUnique.mockResolvedValue({ id: "ws_123" });

    await expect(setWorkspaceCallOutFee("ws_123", -25)).resolves.toEqual({
      success: true,
      callOutFee: 0,
    });

    expect(db.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_123" },
      data: { callOutFee: 0 },
    });
    expect(invalidateAgentContextCache).toHaveBeenCalledWith("ws_123");
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/agent");
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/pricing");
  });
});
