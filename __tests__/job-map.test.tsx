import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { leafletMapMock } = vi.hoisted(() => ({
  leafletMapMock: vi.fn(({ deals }: { deals: unknown[] }) => (
    <div data-testid="leaflet-map" data-deals={JSON.stringify(deals)} />
  )),
}));

vi.mock("next/dynamic", () => ({
  default: () => leafletMapMock,
}));

import JobMap from "@/components/tradie/job-map";

describe("JobMap", () => {
  it("uses tradie lat/lng coordinates when latitude/longitude are not present", () => {
    render(
      <JobMap
        deals={[
          {
            id: "deal_1",
            title: "Blocked drain",
            address: "12 King St",
            lat: -33.91,
            lng: 151.11,
            clientName: "Taylor",
            scheduledAt: new Date("2026-04-08T02:00:00.000Z"),
          },
        ]}
      />,
    );

    expect(screen.getByTestId("leaflet-map")).toBeInTheDocument();
    expect(leafletMapMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deals: [
          expect.objectContaining({
            latitude: -33.91,
            longitude: 151.11,
          }),
        ],
      }),
      undefined,
    );
  });
});
