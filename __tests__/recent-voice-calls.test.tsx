import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getRecentVoiceCallsForWorkspace } = vi.hoisted(() => ({
  getRecentVoiceCallsForWorkspace: vi.fn(),
}));

vi.mock("@/actions/voice-call-actions", () => ({
  getRecentVoiceCallsForWorkspace,
}));

import { RecentVoiceCalls } from "@/components/settings/recent-voice-calls";

describe("RecentVoiceCalls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a calm empty state when no voice calls have been persisted yet", async () => {
    getRecentVoiceCallsForWorkspace.mockResolvedValue([]);

    render(await RecentVoiceCalls());

    expect(screen.getByText("No persisted voice calls yet.")).toBeInTheDocument();
  });

  it("summarizes the latest call in a way a user can scan quickly", async () => {
    getRecentVoiceCallsForWorkspace.mockResolvedValue([
      {
        id: "call_1",
        callerName: "Alice Example",
        callerPhone: "0400000001",
        callType: "normal",
        startedAt: new Date("2026-04-03T10:00:00.000Z"),
        businessName: "Alice Plumbing",
        summary: "Caller asked for an urgent callback about a burst pipe.",
        transcriptText: "Caller: We have a burst pipe.\nTracey: I'm escalating this now.",
      },
    ]);

    render(await RecentVoiceCalls());

    expect(screen.getByText("Alice Example")).toBeInTheDocument();
    expect(screen.getByText(/Customer workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/urgent callback about a burst pipe/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Plumbing")).toBeInTheDocument();
    expect(screen.getByText(/Caller: We have a burst pipe\./i)).toBeInTheDocument();
  });
});
