import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  scrapeWebsite,
  saveTraceyOnboarding,
  saveBusinessProfileForProvisioning,
  getAuthUser,
  createInvite,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  scrapeWebsite: vi.fn(),
  saveTraceyOnboarding: vi.fn(),
  saveBusinessProfileForProvisioning: vi.fn(),
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
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
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
      expect(screen.getByText(/Leads email/i)).toBeInTheDocument();
      expect(screen.getAllByText(previewEmail).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Activate Tracey/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /Activate Tracey/i }));

    await waitFor(() => {
      expect(screen.getByText("Your Leads Email")).toBeInTheDocument();
      expect(
        screen.getByText("alexandria-automotive-services-verified@inbound.earlymark.ai"),
      ).toBeInTheDocument();
    });
  }, 25000);
});
