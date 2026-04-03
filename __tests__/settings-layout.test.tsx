import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(),
}));

let currentRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" = "OWNER";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    usePathname,
  };
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/store", () => ({
  useShellStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { userRole: currentRole };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

import SettingsLayout from "@/app/crm/settings/layout";

describe("SettingsLayout", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/crm/settings");
    currentRole = "OWNER";
  });

  it("hides manager-only settings links for team members", () => {
    currentRole = "TEAM_MEMBER";

    render(<SettingsLayout><div>settings content</div></SettingsLayout>);

    expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Integrations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Billing" })).not.toBeInTheDocument();
  });

  it("shows manager-only settings links for owners and managers", () => {
    render(<SettingsLayout><div>settings content</div></SettingsLayout>);

    expect(screen.getByRole("link", { name: "Integrations" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Billing" })).toBeInTheDocument();
  });
});
