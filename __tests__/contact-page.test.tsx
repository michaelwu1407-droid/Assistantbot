import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
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

import ContactPage from "@/app/contact/page";

describe("public contact page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("shows the live-callback success state when the API reports callPlaced", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, callPlaced: true }),
    });

    render(<ContactPage />);

    await user.type(screen.getByLabelText("Name"), "Miguel Wu");
    await user.type(screen.getByLabelText("Email"), "miguel@example.com");
    await user.type(screen.getByLabelText("Phone (optional)"), "+61 434 955 958");
    await user.type(screen.getByLabelText("Subject"), "Need a demo");
    await user.type(screen.getByLabelText("Message"), "Please get Tracey to call me.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

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
            subject: "Need a demo",
            message: "Please get Tracey to call me.",
          }),
        }),
      );
    });

    expect(screen.getByText("Tracey is calling you now")).toBeInTheDocument();
    expect(screen.getByText(/pick up/i)).toBeInTheDocument();
  });

  it("shows API errors from the contact route", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "LiveKit is down" }),
    });

    render(<ContactPage />);

    await user.type(screen.getByLabelText("Name"), "Miguel Wu");
    await user.type(screen.getByLabelText("Email"), "miguel@example.com");
    await user.type(screen.getByLabelText("Subject"), "Need a demo");
    await user.type(screen.getByLabelText("Message"), "Please get Tracey to call me.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("LiveKit is down")).toBeInTheDocument();
    });
  });
});
