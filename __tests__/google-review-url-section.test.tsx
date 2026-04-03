import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { getWorkspaceSettings, updateWorkspaceSettings, toastSuccess, toastError } = vi.hoisted(() => ({
  getWorkspaceSettings: vi.fn(),
  updateWorkspaceSettings: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettings,
  updateWorkspaceSettings,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { GoogleReviewUrlSection } from "@/components/settings/google-review-url-section";

describe("GoogleReviewUrlSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspaceSettings.mockResolvedValue({
      agentMode: "EXECUTION",
      workingHoursStart: "08:00",
      workingHoursEnd: "17:00",
      agendaNotifyTime: "07:30",
      wrapupNotifyTime: "17:30",
      workspaceTimezone: "Australia/Sydney",
      aiPreferences: "- Be concise",
    });
    updateWorkspaceSettings.mockResolvedValue({ success: true });
  });

  it("loads current settings and saves the trimmed review URL", async () => {
    const user = userEvent.setup();
    render(<GoogleReviewUrlSection initialUrl="" />);

    await user.type(screen.getByPlaceholderText("https://g.page/r/your-business/review"), " https://g.page/r/earlymark/review ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateWorkspaceSettings).toHaveBeenCalledWith({
        agentMode: "EXECUTION",
        workingHoursStart: "08:00",
        workingHoursEnd: "17:00",
        agendaNotifyTime: "07:30",
        wrapupNotifyTime: "17:30",
        workspaceTimezone: "Australia/Sydney",
        aiPreferences: "- Be concise",
        googleReviewUrl: "https://g.page/r/earlymark/review",
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Google Review URL saved");
  });

  it("shows an error when settings cannot be loaded or saved", async () => {
    const user = userEvent.setup();
    getWorkspaceSettings.mockResolvedValue(null);

    render(<GoogleReviewUrlSection initialUrl="https://g.page/r/earlymark/review" />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Failed to save"));
    expect(updateWorkspaceSettings).not.toHaveBeenCalled();
  });
});
