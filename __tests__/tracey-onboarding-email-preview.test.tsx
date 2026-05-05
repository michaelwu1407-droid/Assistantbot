import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  scrapeWebsite,
  saveTraceyOnboarding,
  saveBusinessProfileForProvisioning,
  getProvisioningIntentForOnboarding,
  getLeadCaptureEmailReadiness,
  getAuthUser,
  createInvite,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  scrapeWebsite: vi.fn(),
  saveTraceyOnboarding: vi.fn(),
  saveBusinessProfileForProvisioning: vi.fn(),
  getProvisioningIntentForOnboarding: vi.fn(),
  getLeadCaptureEmailReadiness: vi.fn(),
  getAuthUser: vi.fn(),
  createInvite: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      animate: _animate,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    button: ({
      children,
      animate: _animate,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

vi.mock("@/actions/scraper-actions", () => ({
  scrapeWebsite,
}));

vi.mock("@/actions/tracey-onboarding", () => ({
  saveTraceyOnboarding,
  saveBusinessProfileForProvisioning,
  getProvisioningIntentForOnboarding,
}));

vi.mock("@/actions/settings-actions", () => ({
  getLeadCaptureEmailReadiness,
}));

vi.mock("@/lib/auth-client", () => ({
  getAuthUser,
}));

vi.mock("@/actions/invite-actions", () => ({
  createInvite,
}));

vi.mock("@/components/ui/weekly-hours-editor", () => ({
  WeeklyHoursEditor: () => <div data-testid="weekly-hours-editor" />,
}));

vi.mock("@/components/ui/address-autocomplete", () => ({
  AddressAutocomplete: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label="Physical Address"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { TraceyOnboarding } from "@/components/onboarding/tracey-onboarding";

describe("Tracey onboarding lead email preview", () => {
  const fetchMock = vi.fn();

  async function advanceToActivationChecklist(user: ReturnType<typeof userEvent.setup>) {
    await user.clear(screen.getByPlaceholderText("John Smith"));
    await user.type(screen.getByPlaceholderText("John Smith"), "Michael Wu");
    await user.type(screen.getByPlaceholderText("04XX XXX XXX"), "0434955958");
    await user.clear(screen.getByPlaceholderText("you@business.com.au"));
    await user.type(screen.getByPlaceholderText("you@business.com.au"), "michael@example.com");
    await user.type(screen.getByPlaceholderText("https://yoursite.com.au"), "https://alexandria.example.com");

    await user.click(screen.getByRole("button", { name: /^Next/i }));
    await user.click(screen.getByRole("button", { name: /^Next/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alexandria Automotive Services")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123 Trade St, Alexandria NSW 2015")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^Next/i }));
    await user.click(screen.getByRole("button", { name: /^Next/i }));
    await user.click(screen.getByRole("button", { name: /^Next/i }));

    await waitFor(() => {
      expect(screen.getByText("Your activation checklist")).toBeInTheDocument();
    }, { timeout: 5000 });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    getAuthUser.mockResolvedValue({
      name: "Michael Wu",
      email: "michael@example.com",
    });
    scrapeWebsite.mockResolvedValue({
      success: true,
      data: {
        businessName: "Alexandria Automotive Services",
        tradeType: "plumber",
        address: "123 Trade St, Alexandria NSW 2015",
      },
    });
    saveTraceyOnboarding.mockResolvedValue({
      success: true,
      phoneNumber: "+61485010634",
      leadsEmail: "alexandria-automotive-services-verified@inbound.earlymark.ai",
    });
    saveBusinessProfileForProvisioning.mockResolvedValue({ success: true });
    getLeadCaptureEmailReadiness.mockResolvedValue({
      ready: true,
      receivingConfirmed: false,
      domain: "inbound.earlymark.ai",
      lastInboundEmailSuccessAt: null,
    });
    getProvisioningIntentForOnboarding.mockResolvedValue({
      success: true,
      provisionPhoneNumberRequested: true,
      provisioningStatus: "provisioned",
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          provisioningStatus: "provisioned",
          phoneNumber: "+61485010634",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the canonical preview on steps 3 and 5, then the persisted inbound email after activation", async () => {
    const user = userEvent.setup();
    render(<TraceyOnboarding />);

    await user.clear(screen.getByPlaceholderText("John Smith"));
    await user.type(screen.getByPlaceholderText("John Smith"), "Michael Wu");
    await user.type(screen.getByPlaceholderText("04XX XXX XXX"), "0434955958");
    await user.clear(screen.getByPlaceholderText("you@business.com.au"));
    await user.type(screen.getByPlaceholderText("you@business.com.au"), "michael@example.com");
    await user.type(screen.getByPlaceholderText("https://yoursite.com.au"), "https://alexandria.example.com");

    await user.click(screen.getByRole("button", { name: /^Next/i }));
    await user.click(screen.getByRole("button", { name: /^Next/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alexandria Automotive Services")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123 Trade St, Alexandria NSW 2015")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^Next/i }));

    const previewEmail = "alexandria-automotive-services@inbound.earlymark.ai";
    expect(screen.getAllByText(previewEmail).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^Next/i }));
    await user.click(screen.getByRole("button", { name: /^Next/i }));

    await waitFor(() => {
      expect(screen.getByText("Your activation checklist")).toBeInTheDocument();
      expect(screen.getAllByText(previewEmail).length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByText("+61485010634")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Activate Tracey/i })).toBeEnabled();
    }, { timeout: 5000 });

    await user.click(screen.getByRole("button", { name: /Activate Tracey/i }));

    await waitFor(() => {
      expect(screen.getByText("Your Leads Email")).toBeInTheDocument();
      expect(
        screen.getByText("alexandria-automotive-services-verified@inbound.earlymark.ai"),
      ).toBeInTheDocument();
    });
  }, 25000);

  it("lets users finish onboarding cleanly when phone provisioning is not enabled in billing", async () => {
    getProvisioningIntentForOnboarding.mockResolvedValueOnce({
      success: true,
      provisionPhoneNumberRequested: false,
      provisioningStatus: "not_requested",
    });
    saveTraceyOnboarding.mockResolvedValueOnce({
      success: true,
      leadsEmail: "alexandria-automotive-services-verified@inbound.earlymark.ai",
    });

    const user = userEvent.setup();
    render(<TraceyOnboarding />);

    await advanceToActivationChecklist(user);

    expect(
      screen.getByText("You can add a dedicated number later from billing or settings."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Activate Tracey/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Activate Tracey/i }));

    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
      expect(
        screen.getByText(/You can provision a dedicated number later from billing or settings\./i),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Tracey's Phone Number")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  }, 25000);

  it("tells users to fix number setup before activation when provisioning fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          provisioningStatus: "failed",
          error: "Twilio provisioning timed out.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const user = userEvent.setup();
    render(<TraceyOnboarding />);

    await advanceToActivationChecklist(user);

    await waitFor(() => {
      expect(screen.getByText("Twilio provisioning timed out.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry number setup/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Fix number setup to continue/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Fix number setup to continue/i }));

    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('Use "Retry number setup" below or contact support.'),
    );

    await user.click(screen.getByRole("button", { name: /Retry number setup/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  }, 25000);
});
