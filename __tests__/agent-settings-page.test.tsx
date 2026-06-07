import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  getWorkspaceSettings: vi.fn(),
  updateWorkspaceSettings: vi.fn(),
  updateCurrentWorkspacePipelineSettings: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettings: hoisted.getWorkspaceSettings,
  updateWorkspaceSettings: hoisted.updateWorkspaceSettings,
}));

vi.mock("@/actions/workspace-actions", () => ({
  updateCurrentWorkspacePipelineSettings: hoisted.updateCurrentWorkspacePipelineSettings,
}));

vi.mock("sonner", () => ({
  toast: {
    error: hoisted.toastError,
    success: hoisted.toastSuccess,
  },
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked }: { checked: boolean }) => <button type="button" role="switch" aria-checked={checked}>toggle</button>,
}));

vi.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadioGroupItem: ({ value, id }: { value: string; id: string }) => <input type="radio" value={value} id={id} readOnly />,
}));

describe("AgentSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getWorkspaceSettings.mockResolvedValue({
      agentMode: "DRAFT",
      workingHoursStart: "08:00",
      workingHoursEnd: "17:00",
      agendaNotifyTime: "07:30",
      wrapupNotifyTime: "17:30",
      aiPreferences: "",
      autoUpdateGlossary: true,
      followUpDays: 7,
      urgentDays: 14,
    });
    vi.stubEnv("NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER", "+61485010634");
  });

  it("shows the internal WhatsApp assistant entry point and its constraints", async () => {
    const { default: AgentSettingsPage } = await import("@/app/crm/settings/agent/page");
    render(<AgentSettingsPage />);

    await waitFor(() => expect(screen.getByText("WhatsApp Assistant")).toBeInTheDocument());

    expect(screen.getByText(/Workspace users can message this number from the personal mobile saved on their Earlymark user account/i)).toBeInTheDocument();
    expect(screen.getByText("+61485010634")).toBeInTheDocument();

    const whatsappLink = screen.getByRole("link", { name: /Connect via WhatsApp/i });
    expect(whatsappLink).toHaveAttribute(
      "href",
      "https://wa.me/61485010634?text=Hi%20Earlymark",
    );
  });
});
