import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { routerPush, globalSearchClient } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  globalSearchClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("@/lib/search-client", () => ({
  globalSearchClient,
}));

vi.mock("@/lib/store", () => ({
  useShellStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      workspaceId: "ws_1",
      userRole: "OWNER",
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
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
      aria-label="Search command input"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandSeparator: () => <hr />,
  CommandShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  CommandItem: ({
    children,
    onSelect,
    onClick,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={() => { onClick?.(); onSelect?.(); }}>
      {children}
    </button>
  ),
}));

import { SearchDialog } from "@/components/layout/search-dialog";

describe("SearchDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalSearchClient.mockResolvedValue([
      {
        id: "deal_1",
        type: "deal",
        title: "Blocked Drain",
        subtitle: "Acme Plumbing",
        url: "/crm/deals/deal_1",
      },
    ]);
  });

  it("navigates when a visible search result is clicked", async () => {
    render(<SearchDialog />);

    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    fireEvent.change(screen.getByLabelText("Search command input"), {
      target: { value: "blocked" },
    });

    await waitFor(() => {
      expect(globalSearchClient).toHaveBeenCalledWith("ws_1", "blocked");
    });

    fireEvent.click(screen.getByRole("button", { name: /Blocked Drain/i }));

    expect(routerPush).toHaveBeenCalledWith("/crm/deals/deal_1");
  });
});
