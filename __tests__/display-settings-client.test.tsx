import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { DisplaySettingsClient } from "@/components/settings/display-settings-client";

describe("DisplaySettingsClient", () => {
  it("renders language, accessibility, and mobile sections", () => {
    render(<DisplaySettingsClient />);

    expect(screen.getByText("Language and region")).toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });
});
