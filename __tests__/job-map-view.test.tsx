import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { push, refresh, batchGeocode } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  batchGeocode: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

vi.mock("@/actions/geo-actions", () => ({
  batchGeocode,
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockLeafletMap() {
      return <div data-testid="leaflet-map" />;
    };
  },
}));

import { JobMapView } from "@/components/crm/job-map-view";

describe("JobMapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    batchGeocode.mockResolvedValue(undefined);
  });

  it("shows direct recovery actions when jobs are waiting to be mapped", async () => {
    const user = userEvent.setup();

    render(<JobMapView initialDeals={[]} workspaceId="ws_1" pendingCount={3} />);

    expect(screen.getByText(/You have 3 jobs waiting to be mapped/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Update locations/i })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Open dashboard to fix addresses/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Open dashboard to fix addresses/i }));
    expect(push).toHaveBeenCalledWith("/crm/dashboard");

    await user.click(screen.getAllByRole("button", { name: /Update locations/i })[1]);
    expect(batchGeocode).toHaveBeenCalledWith("ws_1");
    expect(refresh).toHaveBeenCalled();
  });
});
