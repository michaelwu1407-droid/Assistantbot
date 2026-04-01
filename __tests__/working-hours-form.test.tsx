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

import { WorkingHoursForm } from "@/components/settings/working-hours-form";

describe("WorkingHoursForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspaceSettings.mockResolvedValue({
      agentMode: "EXECUTION",
      workspaceTimezone: "Australia/Sydney",
    });
    updateWorkspaceSettings.mockResolvedValue({ success: true });
  });

  it("reveals emergency hours and saves merged settings", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WorkingHoursForm
        initialData={{
          workingHoursStart: "08:00",
          workingHoursEnd: "17:00",
          agendaNotifyTime: "07:00",
          wrapupNotifyTime: "18:00",
        }}
      />,
    );

    expect(container.querySelectorAll('input[type="time"]')).toHaveLength(4);

    await user.click(screen.getByRole("switch"));

    const timeInputs = container.querySelectorAll('input[type="time"]');
    expect(timeInputs).toHaveLength(6);

    await user.clear(timeInputs[0]);
    await user.type(timeInputs[0], "09:00");
    await user.clear(timeInputs[1]);
    await user.type(timeInputs[1], "18:00");
    await user.type(timeInputs[4], "18:30");
    await user.type(timeInputs[5], "22:00");

    await user.click(screen.getByRole("button", { name: "Save hours" }));

    await waitFor(() => {
      expect(updateWorkspaceSettings).toHaveBeenCalledWith({
        agentMode: "EXECUTION",
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        agendaNotifyTime: "07:00",
        wrapupNotifyTime: "18:00",
        workspaceTimezone: "Australia/Sydney",
        emergencyHoursStart: "18:30",
        emergencyHoursEnd: "22:00",
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Working hours saved");
  });

  it("shows an error when current settings cannot be loaded", async () => {
    const user = userEvent.setup();
    getWorkspaceSettings.mockResolvedValue(null);

    render(
      <WorkingHoursForm
        initialData={{
          workingHoursStart: "08:00",
          workingHoursEnd: "17:00",
          agendaNotifyTime: "07:00",
          wrapupNotifyTime: "18:00",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save hours" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to get current settings");
    });
    expect(updateWorkspaceSettings).not.toHaveBeenCalled();
  });
});
