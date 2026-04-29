import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
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

vi.mock("@/components/layout/navbar", () => ({
  Navbar: () => <div>Navbar</div>,
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <div>Footer</div>,
}));

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");

  const SelectContext = React.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: "" });

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    );
  }

  function SelectTrigger({
    id,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button type="button" id={id} {...props}>
        {children}
      </button>
    );
  }

  function SelectValue({ placeholder }: { placeholder?: string }) {
    const context = React.useContext(SelectContext);
    return <span>{context.value || placeholder}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    const context = React.useContext(SelectContext);
    return (
      <button type="button" onClick={() => context.onValueChange?.(value)}>
        {children}
      </button>
    );
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

import PricingPage from "@/app/pricing/page";

describe("pricing contact form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("shows the live-callback success state when the pricing page gets callPlaced", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, callPlaced: true }),
    });

    render(<PricingPage />);

    await user.type(screen.getByLabelText("Name"), "Miguel Wu");
    await user.type(screen.getByLabelText("Email"), "miguel@example.com");
    await user.type(screen.getByLabelText("Phone (optional)"), "+61 434 955 958");
    await user.type(screen.getByLabelText("Subject"), "Need pricing");
    await user.type(screen.getByLabelText("Message"), "Please get Tracey to call me.");
    const form = screen.getByLabelText("Message").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/contact",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department: "sales",
            name: "Miguel Wu",
            email: "miguel@example.com",
            phone: "+61 434 955 958",
            subject: "Need pricing",
            message: "Please get Tracey to call me.",
          }),
        }),
      );
    });

    expect(await screen.findByText(/Tracey is calling you now/i)).toBeInTheDocument();
    expect(await screen.findByText(/pick up/i)).toBeInTheDocument();
  });

  it("shows request errors on the pricing-page form", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed to send message. Please try again." }),
    });

    render(<PricingPage />);

    await user.type(screen.getByLabelText("Name"), "Miguel Wu");
    await user.type(screen.getByLabelText("Email"), "miguel@example.com");
    await user.type(screen.getByLabelText("Subject"), "Need pricing");
    await user.type(screen.getByLabelText("Message"), "Please get Tracey to call me.");
    const form = screen.getByLabelText("Message").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText("Failed to send message. Please try again.")).toBeInTheDocument();
    });
  });

  it("explains the instant callback option before submit", () => {
    render(<PricingPage />);

    expect(
      screen.getByText("Add your phone if you want Tracey to call you back right away."),
    ).toBeInTheDocument();
  });
});
