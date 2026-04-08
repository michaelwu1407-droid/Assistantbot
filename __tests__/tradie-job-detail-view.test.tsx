import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/tradie/job-status-bar", () => ({
  JobStatusBar: () => <div>Job Status Bar</div>,
}));

vi.mock("@/components/tradie/camera-fab", () => ({
  CameraFAB: () => <div>Camera FAB</div>,
}));

vi.mock("@/components/tradie/voice-note-input", () => ({
  VoiceNoteInput: () => <div>Voice Note Input</div>,
}));

import { JobDetailView } from "@/components/tradie/job-detail-view";

describe("Tradie JobDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", vi.fn());
  });

  it("routes billing and handover actions into the full CRM instead of showing dead-end placeholders", async () => {
    const user = userEvent.setup();

    render(
      <JobDetailView
        job={{
          id: "deal_1",
          title: "Blocked Drain",
          client: {
            name: "Alex Harper",
            phone: "0400000000",
            email: "alex@example.com",
            address: "1 Test St, Sydney",
          },
          status: "SCHEDULED",
          value: 250,
          description: "Drain issue",
          safetyCheckCompleted: false,
          activities: [],
          invoices: [],
          photos: [],
        }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /billing/i }));
    expect(screen.getByRole("link", { name: /open full billing/i })).toHaveAttribute("href", "/crm/deals/deal_1");
    expect(screen.queryByText(/Billing features coming soon/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /handover/i }));
    expect(screen.getByRole("link", { name: /open full job in crm/i })).toHaveAttribute("href", "/crm/deals/deal_1");
    expect(screen.queryByRole("button", { name: /send handover pack to client/i })).not.toBeInTheDocument();
    expect(screen.getByText(/handover documents and customer-ready attachments are managed from the full crm job view/i)).toBeInTheDocument();
    expect(screen.queryByText(/maintenance guide/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/warranty card/i)).not.toBeInTheDocument();
  });

  it("makes call and map actions honest when contact data is missing", () => {
    render(
      <JobDetailView
        job={{
          id: "deal_2",
          title: "Hot Water Service",
          client: {
            name: "Taylor Smith",
            phone: null,
            email: null,
            address: null,
          },
          status: "SCHEDULED",
          value: 480,
          description: "Hot water fault",
          safetyCheckCompleted: false,
          activities: [],
          invoices: [],
          photos: [],
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /no address/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /no phone/i })).toBeDisabled();
  });
});
