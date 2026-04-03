import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  getPhoneNumberStatus,
  getWorkspaceSettings,
  updateWorkspaceSettings,
  getAutomatedMessageRules,
  updateAutomatedMessageRule,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  getPhoneNumberStatus: vi.fn(),
  getWorkspaceSettings: vi.fn(),
  updateWorkspaceSettings: vi.fn(),
  getAutomatedMessageRules: vi.fn(),
  updateAutomatedMessageRule: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/phone-settings", () => ({
  getPhoneNumberStatus,
}));

vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettings,
  updateWorkspaceSettings,
}));

vi.mock("@/actions/automated-message-actions", () => ({
  getAutomatedMessageRules,
  updateAutomatedMessageRule,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}>
      toggle
    </button>
  ),
}));

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");

  const SelectContext = React.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: "" });

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) {
    return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
  }

  function SelectTrigger({ children, id }: { children: React.ReactNode; id?: string }) {
    return <button id={id} type="button">{children}</button>;
  }

  function SelectValue() {
    const context = React.useContext(SelectContext);
    return <span>{context.value}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    const context = React.useContext(SelectContext);
    return <button type="button" onClick={() => context.onValueChange?.(value)}>{children}</button>;
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

import { CallSettingsClient } from "@/components/settings/call-settings-client";

describe("CallSettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPhoneNumberStatus.mockResolvedValue({ hasPhoneNumber: true, hasSubaccount: true });
    getWorkspaceSettings.mockResolvedValue({
      agentMode: "EXECUTION",
      workingHoursStart: "08:00",
      workingHoursEnd: "17:00",
      agendaNotifyTime: "07:30",
      wrapupNotifyTime: "17:30",
      workspaceTimezone: "Australia/Sydney",
      agentBusinessName: "Earlymark Plumbing",
      textAllowedStart: "08:00",
      textAllowedEnd: "20:00",
      callAllowedStart: "08:00",
      callAllowedEnd: "20:00",
    });
    getAutomatedMessageRules.mockResolvedValue([
      {
        id: "rule_1",
        name: "Booking reminder",
        triggerType: "booking_reminder_24h",
        enabled: true,
        messageTemplate: "We'll see you tomorrow.",
        hoursOffset: -24,
      },
    ]);
    updateWorkspaceSettings.mockResolvedValue({ success: true });
    updateAutomatedMessageRule.mockResolvedValue({ success: true });
  });

  it("falls back to default contact settings when saved settings fail to load", async () => {
    getWorkspaceSettings.mockRejectedValue(new Error("settings unavailable"));

    render(<CallSettingsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save contact hours" })).toBeInTheDocument();
    });
    expect(toastError).toHaveBeenCalledWith("Loaded default contact settings because your saved settings could not be loaded.");
    expect(screen.getAllByDisplayValue("08:00")).toHaveLength(2);
  });

  it("saves merged contact hours", async () => {
    const user = userEvent.setup();
    render(<CallSettingsClient />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Save contact hours" })).toBeInTheDocument());

    const timeInputs = screen.getAllByDisplayValue("08:00");
    fireEvent.change(timeInputs[0], { target: { value: "09:00" } });

    await user.click(screen.getByRole("button", { name: "Save contact hours" }));

    await waitFor(() =>
      expect(updateWorkspaceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          agentMode: "EXECUTION",
          workspaceTimezone: "Australia/Sydney",
          textAllowedStart: "09:00",
          textAllowedEnd: "20:00",
          callAllowedStart: "08:00",
          callAllowedEnd: "20:00",
        }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Settings saved");
  });

  it("appends the Tracey sign-off when saving an automated message", async () => {
    const user = userEvent.setup();
    render(<CallSettingsClient />);

    await waitFor(() => expect(screen.getByDisplayValue("We'll see you tomorrow.")).toBeInTheDocument());

    const messageBox = screen.getByDisplayValue("We'll see you tomorrow.");
    await user.clear(messageBox);
    await user.type(messageBox, "Please confirm your arrival window.");
    await user.click(screen.getByRole("button", { name: "Save automated message" }));

    await waitFor(() =>
      expect(updateAutomatedMessageRule).toHaveBeenCalledWith(
        "rule_1",
        expect.objectContaining({
          enabled: true,
          hoursOffset: -24,
          messageTemplate:
            "Please confirm your arrival window.\n\nKind regards, Tracey (AI assistant for Earlymark Plumbing)",
        }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Automated text message saved");
  });
});
