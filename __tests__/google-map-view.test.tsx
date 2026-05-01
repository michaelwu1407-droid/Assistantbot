import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@react-google-maps/api", () => ({
  GoogleMap: ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="google-marker">{children}</div>,
  InfoWindow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useJsApiLoader: () => ({
    isLoaded: true,
    loadError: undefined,
  }),
}));

vi.mock("@/components/tradie/job-completion-modal", () => ({
  JobCompletionModal: () => null,
}));

vi.mock("@/components/crm/deal-detail-modal", () => ({
  DealDetailModal: () => null,
}));

import { GoogleMapView } from "@/components/map/google-map-view";

describe("GoogleMapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-google-maps-key");
    vi.stubGlobal("open", vi.fn());
    vi.stubGlobal(
      "google",
      {
        maps: {
          SymbolPath: {
            CIRCLE: "CIRCLE",
          },
          LatLngBounds: vi.fn(() => ({
            extend: vi.fn(),
          })),
          event: {
            addListener: vi.fn(() => "listener"),
            removeListener: vi.fn(),
          },
        },
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("keeps route mode useful by surfacing the next upcoming job after today is complete", async () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(11, 30, 0, 0);

    render(
      <GoogleMapView
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

    fireEvent.click(screen.getByRole("button", { name: /enable route mode/i }));

    expect(screen.getByText("All Done!")).toBeInTheDocument();
    expect(screen.getByText(/Next upcoming job/i)).toBeInTheDocument();
    expect(screen.getByText("Next Up Plumbing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show all upcoming jobs/i }));

    expect(screen.queryByRole("button", { name: /exit route mode/i })).not.toBeInTheDocument();
    expect(screen.queryByText("All Done!")).not.toBeInTheDocument();
    expect(screen.getByText(/upcoming job/i)).toBeInTheDocument();
  });
});
