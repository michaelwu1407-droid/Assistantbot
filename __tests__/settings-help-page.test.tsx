import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/store", () => ({
  useShellStore: () => ({ resetTutorial: vi.fn() }),
}));

vi.mock("@/components/settings/support-request-panel", () => ({
  SupportRequestPanel: () => <div>Support request form</div>,
}));

import HelpSettingsPage from "@/app/crm/settings/help/page";

describe("HelpSettingsPage", () => {
  it("shows tracked support paths without advertising an unverified phone number", () => {
    render(<HelpSettingsPage />);

    expect(screen.getByText("Contact support")).toBeInTheDocument();
    expect(screen.getByText(/support@earlymark\.ai/i)).toBeInTheDocument();
    expect(screen.getAllByText(/support request form/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/mark the request below as urgent/i)).toBeInTheDocument();
    expect(screen.queryByText(/1300 EARLYMARK/i)).not.toBeInTheDocument();
  });
});
