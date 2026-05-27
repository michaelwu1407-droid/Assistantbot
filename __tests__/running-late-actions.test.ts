import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: { deal: { findUnique: vi.fn() } },
  requireCurrentWorkspaceAccess: vi.fn(),
  sendSMS: vi.fn(),
  formatTime: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));
vi.mock("@/actions/messaging-actions", () => ({ sendSMS: hoisted.sendSMS }));
vi.mock("@/lib/format", () => ({ formatTime: hoisted.formatTime }));

import { sendRunningLateMessage } from "@/actions/running-late-actions";

const WORKSPACE_ID = "ws_1";
const DEAL_ID = "deal_1";
const CONTACT_ID = "contact_1";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({ workspaceId: WORKSPACE_ID });
  hoisted.formatTime.mockReturnValue("3:30 PM");
  hoisted.sendSMS.mockResolvedValue({ success: true });
  hoisted.db.deal.findUnique.mockResolvedValue({
    id: DEAL_ID,
    workspaceId: WORKSPACE_ID,
    contactId: CONTACT_ID,
    scheduledAt: new Date("2026-05-27T05:00:00.000Z"),
    contact: { name: "Bob Smith", phone: "+61412345678" },
  });
});

describe("sendRunningLateMessage", () => {
  it("sends SMS with correct delay and returns success", async () => {
    const result = await sendRunningLateMessage(DEAL_ID, 20);

    expect(result).toEqual({ success: true });
    expect(hoisted.sendSMS).toHaveBeenCalledWith(
      CONTACT_ID,
      expect.stringContaining("20 min late"),
      DEAL_ID
    );
    expect(hoisted.sendSMS).toHaveBeenCalledWith(
      CONTACT_ID,
      expect.stringContaining("Bob"),
      DEAL_ID
    );
  });

  it("includes the formatted ETA in the message", async () => {
    hoisted.formatTime.mockReturnValue("4:00 PM");
    await sendRunningLateMessage(DEAL_ID, 30);

    const [, body] = hoisted.sendSMS.mock.calls[0];
    expect(body).toContain("4:00 PM");
  });

  it("returns error when deal not found", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue(null);
    const result = await sendRunningLateMessage(DEAL_ID, 10);

    expect(result).toEqual({ success: false, error: "Job not found" });
    expect(hoisted.sendSMS).not.toHaveBeenCalled();
  });

  it("returns error when deal belongs to different workspace", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: DEAL_ID,
      workspaceId: "other_ws",
      contactId: CONTACT_ID,
      scheduledAt: null,
      contact: { name: "Bob Smith", phone: "+61412345678" },
    });
    const result = await sendRunningLateMessage(DEAL_ID, 10);

    expect(result).toEqual({ success: false, error: "Job not found" });
  });

  it("returns error when contact has no phone", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: DEAL_ID,
      workspaceId: WORKSPACE_ID,
      contactId: CONTACT_ID,
      scheduledAt: null,
      contact: { name: "Bob Smith", phone: null },
    });
    const result = await sendRunningLateMessage(DEAL_ID, 10);

    expect(result).toEqual({ success: false, error: "No phone number for this contact" });
  });

  it("propagates SMS failure error", async () => {
    hoisted.sendSMS.mockResolvedValue({ success: false, error: "Twilio error" });
    const result = await sendRunningLateMessage(DEAL_ID, 10);

    expect(result).toEqual({ success: false, error: "Twilio error" });
  });

  it("uses current time as base when scheduledAt is null", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: DEAL_ID,
      workspaceId: WORKSPACE_ID,
      contactId: CONTACT_ID,
      scheduledAt: null,
      contact: { name: "Jane Doe", phone: "+61400000001" },
    });
    const result = await sendRunningLateMessage(DEAL_ID, 15);

    expect(result.success).toBe(true);
    expect(hoisted.formatTime).toHaveBeenCalled();
  });
});
