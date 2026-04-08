import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/store", () => ({
  useShellStore: (selector: (state: { workspaceId: string }) => unknown) =>
    selector({ workspaceId: "ws_1" }),
}));

vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({ open, children, onOpenChange }: { open: boolean; children: React.ReactNode; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div data-testid="command-dialog">
        <button onClick={() => onOpenChange(false)}>close</button>
        {children}
      </div>
    ) : null,
  CommandInput: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder ?? "command-input"}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ heading, children }: { heading: string; children: React.ReactNode }) => (
    <section aria-label={heading}>{children}</section>
  ),
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  CommandSeparator: () => <hr />,
  CommandShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { SearchCommand } from "@/components/core/search-command";

describe("SearchCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ id: "contact_1", name: "Alex Harper", company: "Harper Plumbing" }],
        }),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("routes legacy command search contacts into CRM contact pages", async () => {
    render(<SearchCommand />);

    fireEvent.click(screen.getByText(/Search \(Cmd\+K\)\.\.\./i));
    fireEvent.change(screen.getByLabelText(/type a command or search/i), {
      target: { value: "Alex" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(screen.getByRole("button", { name: /Alex Harper/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Alex Harper/i }));
    expect(push).toHaveBeenCalledWith("/crm/contacts/contact_1");
  });

  it("routes legacy navigation shortcuts into CRM contacts and settings", () => {
    cleanup();
    render(<SearchCommand />);
    fireEvent.click(screen.getByText(/Search \(Cmd\+K\)\.\.\./i));

    fireEvent.click(screen.getByRole("button", { name: /Contacts/i }));
    expect(push).toHaveBeenCalledWith("/crm/contacts");

    cleanup();
    render(<SearchCommand />);
    fireEvent.click(screen.getByText(/Search \(Cmd\+K\)\.\.\./i));

    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    expect(push).toHaveBeenCalledWith("/crm/settings");
  });
});
