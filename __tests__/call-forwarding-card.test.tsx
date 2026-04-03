import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  getCallForwardingSettings,
  sendCallForwardingSetupSms,
  updateCallForwardingSettings,
  getPhoneNumberStatus,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  getCallForwardingSettings: vi.fn(),
  sendCallForwardingSetupSms: vi.fn(),
  updateCallForwardingSettings: vi.fn(),
  getPhoneNumberStatus: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/settings-actions", () => ({
  getCallForwardingSettings,
  sendCallForwardingSetupSms,
  updateCallForwardingSettings,
}));

vi.mock("@/actions/phone-settings", () => ({
  getPhoneNumberStatus,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/components/settings/personal-phone-dialog", () => ({
  PersonalPhoneDialog: () => null,
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

  function SelectTrigger({ children }: { children: React.ReactNode }) {
    return <button type="button">{children}</button>;
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

import { CallForwardingCard } from "@/components/settings/call-forwarding-card";

describe("CallForwardingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCallForwardingSettings.mockResolvedValue({
      enabled: true,
      mode: "backup",
      delaySec: 12,
      carrier: "other",
    });
    getPhoneNumberStatus.mockResolvedValue({
      personalPhone: "+61411111111",
      name: "Earlymark Plumbing",
      phoneNumber: "+61485010634",
      hasPhoneNumber: true,
    });
    updateCallForwardingSettings.mockImplementation(async ({ mode, enabled, delaySec }) => ({
      success: true,
      mode: enabled ? mode : "off",
      delaySec,
      carrier: "other",
    }));
    sendCallForwardingSetupSms.mockResolvedValue({ success: true });
  });

  it("lets the user switch between backup, full AI, and off modes", async () => {
    const user = userEvent.setup();
    render(<CallForwardingCard />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Backup AI/i })).toBeInTheDocument());

    expect(screen.getByText(/Backup AI pickup timing/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /100% AI/i }));
    await waitFor(() =>
      expect(updateCallForwardingSettings).toHaveBeenCalledWith({
        enabled: true,
        mode: "full",
        delaySec: 12,
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Call handling preference saved");

    await user.click(screen.getByRole("button", { name: /Forwarding off/i }));
    await waitFor(() =>
      expect(updateCallForwardingSettings).toHaveBeenCalledWith({
        enabled: false,
        mode: "off",
        delaySec: 12,
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Call forwarding preference updated");

    await user.click(screen.getByRole("button", { name: /Backup AI/i }));
    await waitFor(() =>
      expect(updateCallForwardingSettings).toHaveBeenCalledWith({
        enabled: true,
        mode: "backup",
        delaySec: 12,
      }),
    );
  });

  it("sends setup steps for backup and full modes but blocks them when forwarding is off", async () => {
    const user = userEvent.setup();
    render(<CallForwardingCard />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Text me setup steps/i })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Text me setup steps/i }));
    await waitFor(() =>
      expect(sendCallForwardingSetupSms).toHaveBeenCalledWith({
        mode: "backup",
        delaySec: 12,
        carrier: "other",
      }),
    );

    await user.click(screen.getByRole("button", { name: /100% AI/i }));
    await waitFor(() =>
      expect(updateCallForwardingSettings).toHaveBeenCalledWith({
        enabled: true,
        mode: "full",
        delaySec: 12,
      }),
    );

    await user.click(screen.getByRole("button", { name: /Text me setup steps/i }));
    await waitFor(() =>
      expect(sendCallForwardingSetupSms).toHaveBeenCalledWith({
        mode: "full",
        delaySec: 12,
        carrier: "other",
      }),
    );

    await user.click(screen.getByRole("button", { name: /Forwarding off/i }));
    await waitFor(() =>
      expect(updateCallForwardingSettings).toHaveBeenCalledWith({
        enabled: false,
        mode: "off",
        delaySec: 12,
      }),
    );

    expect(screen.queryByRole("button", { name: /Text me setup steps/i })).not.toBeInTheDocument();
  });
});
