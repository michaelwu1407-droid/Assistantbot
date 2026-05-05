import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mapFitBounds, mapFlyTo } = vi.hoisted(() => ({
  mapFitBounds: vi.fn(),
  mapFlyTo: vi.fn(),
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CircleMarker: () => <div data-testid="circle-marker" />,
  useMap: () => ({
    fitBounds: mapFitBounds,
    flyTo: mapFlyTo,
  }),
}));

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({ icon: true })),
    latLngBounds: vi.fn((positions: unknown) => positions),
  },
}));

vi.mock("@/components/tradie/job-completion-modal", () => ({
  JobCompletionModal: () => null,
}));

vi.mock("@/components/crm/deal-detail-modal", () => ({
  DealDetailModal: () => null,
}));

import MapView from "@/components/map/map-view";

describe("MapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "navigator",
      {
        geolocation: {
          getCurrentPosition: vi.fn(),
        },
        permissions: {
          query: vi.fn().mockResolvedValue({ state: "denied" }),
        },
      } as unknown as Navigator,
    );
    vi.stubGlobal("open", vi.fn());
  });

  it("shows the empty-state copy for days with no scheduled jobs", () => {
    render(<MapView jobs={[]} />);

    expect(screen.getByText("Today's Jobs")).toBeInTheDocument();
    expect(screen.getByText("No jobs scheduled for today.")).toBeInTheDocument();
    expect(screen.getByText(/Upcoming booked jobs still appear on the map/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enable route mode/i })).toBeInTheDocument();
  });

  it("lets the user select a job and exposes route and customer-timeline actions", async () => {
    const user = userEvent.setup();
    const scheduledAt = new Date();
    scheduledAt.setHours(10, 0, 0, 0);

    render(
      <MapView
        jobs={[
          {
            id: "deal_1",
            title: "Blocked Drain",
            clientName: "Acme Plumbing",
            address: "1 King St, Sydney",
            status: "SCHEDULED",
            value: 420,
            scheduledAt,
            lat: -33.86,
            lng: 151.2,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /select job blocked drain for acme plumbing/i }));

    expect(screen.getByRole("button", { name: /view job/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /open customer timeline/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /open in google maps/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /enable route mode/i }));

    expect(screen.getByRole("button", { name: /navigate to job/i })).toBeInTheDocument();
    expect(screen.getByText("Active Target")).toBeInTheDocument();
  });

  it("keeps route mode useful by surfacing the next upcoming job after today is complete", async () => {
    const user = userEvent.setup();
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(11, 30, 0, 0);

    render(
      <MapView
        jobs={[
          {
            id: "deal_today_done",
            title: "Finished Hot Water",
            clientName: "Done Today Pty",
            address: "1 Done St, Sydney",
            status: "COMPLETED",
            value: 200,
            scheduledAt: today,
            lat: -33.86,
            lng: 151.2,
          },
          {
            id: "deal_upcoming",
            title: "Blocked Drain",
            clientName: "Next Up Plumbing",
            address: "2 Future Rd, Sydney",
            status: "SCHEDULED",
            value: 320,
            scheduledAt: tomorrow,
            lat: -33.87,
            lng: 151.21,
          },
        ]}
        todayIds={new Set(["deal_today_done"])}
      />,
    );

    await user.click(screen.getByRole("button", { name: /enable route mode/i }));

    await waitFor(() => expect(screen.getByText("All Done!")).toBeInTheDocument());
    expect(screen.getByText(/Next upcoming job/i)).toBeInTheDocument();
    expect(screen.getByText("Next Up Plumbing")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show all upcoming jobs/i }));

    expect(screen.queryByRole("button", { name: /exit route mode/i })).not.toBeInTheDocument();
    expect(screen.queryByText("All Done!")).not.toBeInTheDocument();
    expect(screen.getByText(/upcoming job/i)).toBeInTheDocument();
  });
});
