import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/tradie/job-map", () => ({
  default: () => <div>Job Map</div>,
}));

vi.mock("@/components/tradie/job-bottom-sheet", () => ({
  JobBottomSheet: () => <div>Bottom Sheet</div>,
}));

vi.mock("@/components/tradie/job-completion-modal", () => ({
  JobCompletionModal: () => null,
}));

vi.mock("@/components/dashboard/pulse-widget", () => ({
  PulseWidget: () => <div>Pulse Widget</div>,
}));

vi.mock("@/components/layout/global-search", () => ({
  GlobalSearch: () => null,
}));

vi.mock("@/lib/store", () => ({
  useShellStore: Object.assign(
    (selector: (state: { userId: string | null; workspaceId: string | null }) => unknown) =>
      selector({ userId: "user_1", workspaceId: "ws_1" }),
    {
      getState: () => ({ workspaceId: "ws_1" }),
    },
  ),
}));

import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client";

describe("TradieDashboardClient", () => {
  // BETA_REMOVED: "Return to Map" link assertion removed — map is behind beta gate.
  // To reinstate: expect(screen.getByRole("link", { name: /return to map/i })).toHaveAttribute("href", "/tradie/map")
  it("shows the all-caught-up empty state when there are no jobs today", () => {
    render(<TradieDashboardClient todayJobs={[]} />);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });
});
