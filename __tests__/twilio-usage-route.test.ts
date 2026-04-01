import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));

import { POST } from "@/app/api/webhooks/twilio-usage/route";

function buildUsageRequest(fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  return new NextRequest("https://app.example.com/api/webhooks/twilio-usage", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

describe("POST /api/webhooks/twilio-usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without an AccountSid", async () => {
    const response = await POST(
      buildUsageRequest({
        CurrentValue: "55",
        TriggerValue: "50",
        UsageCategory: "calls",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing AccountSid" });
  });

  it("disables voice and logs a workspace activity when the threshold is hit", async () => {
    hoisted.db.workspace.findFirst.mockResolvedValue({
      id: "ws_1",
      name: "Acme Plumbing",
      voiceEnabled: true,
    });
    hoisted.db.workspace.update.mockResolvedValue({});
    hoisted.db.activity.create.mockResolvedValue({});

    const response = await POST(
      buildUsageRequest({
        AccountSid: "ACsub123",
        CurrentValue: "55",
        TriggerValue: "50",
        UsageCategory: "calls",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, voiceDisabled: true });
    expect(hoisted.db.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_1" },
      data: { voiceEnabled: false },
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "⚠️ Voice Disabled — Daily Spend Limit Reached",
        content: expect.stringContaining("Daily Twilio spend reached $55"),
      }),
    });
  });

  it("returns alreadyDisabled when the workspace was already circuit-broken", async () => {
    hoisted.db.workspace.findFirst.mockResolvedValue({
      id: "ws_1",
      name: "Acme Plumbing",
      voiceEnabled: false,
    });

    const response = await POST(
      buildUsageRequest({
        AccountSid: "ACsub123",
        CurrentValue: "55",
        TriggerValue: "50",
        UsageCategory: "calls",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, alreadyDisabled: true });
    expect(hoisted.db.workspace.update).not.toHaveBeenCalled();
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
  });
});
