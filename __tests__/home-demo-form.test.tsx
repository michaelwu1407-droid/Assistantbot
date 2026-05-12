import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { requestDemoCallMock } = vi.hoisted(() => ({
  requestDemoCallMock: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({
          children,
          initial: _initial,
          whileInView: _whileInView,
          whileHover: _whileHover,
          whileTap: _whileTap,
          viewport: _viewport,
          transition: _transition,
          animate: _animate,
          exit: _exit,
          ...props
        }: {
          children: React.ReactNode;
          [key: string]: unknown;
        }) => <div {...props}>{children}</div>,
    },
  ),
}));

vi.mock("@/actions/demo-call-action", () => ({
  requestDemoCall: requestDemoCallMock,
}));

vi.mock("@/components/layout/navbar", () => ({
  Navbar: () => <div>Navbar</div>,
}));

vi.mock("@/components/home/hero-dashboard-reel", () => ({
  HeroDashboardReel: () => <div>Hero dashboard</div>,
}));

vi.mock("@/components/home/PulsingLogo", () => ({
  PulsingLogo: () => <div>Tracey logo</div>,
}));

vi.mock("@/components/home/autonomy-mode-tabs", () => ({
  AutonomyModeTabs: () => <div>Autonomy modes</div>,
}));

vi.mock("@/components/home/platform-diagram", () => ({
  PlatformDiagram: () => <div>Platform diagram</div>,
}));

import Home from "@/app/page";

describe("home demo form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the direct callback success message", async () => {
    const user = userEvent.setup();
    requestDemoCallMock.mockResolvedValue({
      success: true,
      message: "Tracey is calling you now!",
      leadId: "lead_123",
    });

    render(<Home />);

    await user.type(screen.getByPlaceholderText("First name"), "Miguel");
    await user.type(screen.getByPlaceholderText("Last name"), "Wu");
    await user.type(screen.getByPlaceholderText("Phone number"), "+61 434 955 958");
    await user.type(screen.getByPlaceholderText("Email address"), "miguel@example.com");
    await user.type(screen.getByPlaceholderText("Business name"), "Earlymark");
    const form = screen.getByPlaceholderText("Business name").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(requestDemoCallMock).toHaveBeenCalledWith({
        firstName: "Miguel",
        lastName: "Wu",
        phone: "+61 434 955 958",
        email: "miguel@example.com",
        businessName: "Earlymark",
      });
    });

    expect(await screen.findByRole("heading", { name: "Tracey is calling you now!" })).toBeInTheDocument();
    expect(screen.queryByText(/We've started your callback attempt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/30 seconds/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/She'll introduce herself/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Your callback is being placed/i)).not.toBeInTheDocument();
  });
});
