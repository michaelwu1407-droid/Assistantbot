import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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
    return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
  }

  function SelectTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" {...props}>{children}</button>;
  }

  function SelectValue() {
    const context = React.useContext(SelectContext);
    return <span>{context.value}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    const context = React.useContext(SelectContext);
    return <button type="button" onClick={() => context.onValueChange?.(value)}>{children}</button>;
  }

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

import { SupportRequestPanel } from "@/components/settings/support-request-panel";

describe("SupportRequestPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the error state when the support request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Support inbox unavailable" }),
    }));

    render(<SupportRequestPanel />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Need help" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Please help with setup." } });
    fireEvent.submit(screen.getByRole("button", { name: /send support request/i }).closest("form")!);

    expect(await screen.findByText("Support inbox unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/we will get back to you within 24 hours/i)).not.toBeInTheDocument();
  });

  it("clears a previous error and shows only success after a retry succeeds", async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn()
          .mockResolvedValueOnce({
            ok: false,
            json: async () => ({ success: false, error: "Support inbox unavailable" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          }),
    );

    render(<SupportRequestPanel />);

    const form = screen.getByRole("button", { name: /send support request/i }).closest("form")!;
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Need help" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Please help with setup." } });
    fireEvent.submit(form);

    expect(await screen.findByText("Support inbox unavailable")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Need help again" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Retrying with more detail." } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/we will get back to you within 24 hours/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Support inbox unavailable")).not.toBeInTheDocument();
  });
});
