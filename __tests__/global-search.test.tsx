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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="search-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
      aria-label="Global search"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={() => onClick?.()}>
      {children}
    </button>
  ),
}));

import { GlobalSearch } from "@/components/layout/global-search";

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalSearchClient.mockResolvedValue([
      {
        id: "c1",
        type: "contact",
        title: "Pat Customer",
        subtitle: "0400",
        url: "/crm/contacts/c1",
      },
    ]);
  });

  it("navigates on mouse click for a result (not only keyboard selection)", async () => {
    render(<GlobalSearch workspaceId="ws_1" open onOpenChange={() => {}} />);

    fireEvent.change(screen.getByLabelText("Global search"), {
      target: { value: "pat" },
    });

    await waitFor(() => {
      expect(globalSearchClient).toHaveBeenCalledWith("ws_1", "pat");
    });

    fireEvent.click(screen.getByRole("button", { name: /Pat Customer/i }));

    expect(routerPush).toHaveBeenCalledWith("/crm/contacts/c1");
  });
});
