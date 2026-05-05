import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getAuthUserId, getOrCreateWorkspace, redirect } = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

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

vi.mock("@/components/agent/commission-calculator", () => ({
  CommissionCalculator: () => <div>Commission Calculator</div>,
}));

vi.mock("@/components/agent/vendor-report-card", () => ({
  VendorReportCard: () => <div>Vendor Report Card</div>,
}));

vi.mock("@/components/dashboard/pulse-widget", () => ({
  PulseWidget: () => <div>Pulse Widget</div>,
}));

import AgentPage from "@/app/(dashboard)/agent/page";

describe("AgentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_1" });
  });

  it("shows an honest legacy agent dashboard message with a CRM path forward", async () => {
    render(await AgentPage());

    expect(screen.getByText("Agent pipeline workspace")).toBeInTheDocument();
    expect(screen.getByText(/legacy agent dashboard is not the primary workflow right now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open CRM Dashboard/i })).toHaveAttribute("href", "/crm/dashboard");
  });

  it("redirects unauthenticated users", async () => {
    getAuthUserId.mockResolvedValue(null);

    await expect(AgentPage()).rejects.toThrow("REDIRECT:/auth");
  });
});
