import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  routerPush,
  routerRefresh,
  createDeal,
  getContacts,
  createContact,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerRefresh: vi.fn(),
  createDeal: vi.fn(),
  getContacts: vi.fn(),
  createContact: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

vi.mock("@/actions/deal-actions", () => ({
  createDeal,
}));

vi.mock("@/actions/contact-actions", () => ({
  getContacts,
  createContact,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/ui/tabs", async () => {
  const React = await import("react");

  const TabsContext = React.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: "" });

  function Tabs({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </TabsContext.Provider>
    );
  }

  function TabsList({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function TabsTrigger({
    value,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
    const context = React.useContext(TabsContext);
    return (
      <button type="button" aria-pressed={context.value === value} onClick={() => context.onValueChange?.(value)} {...props}>
        {children}
      </button>
    );
  }

  return { Tabs, TabsList, TabsTrigger };
});

vi.mock("@/components/ui/address-autocomplete", () => ({
  AddressAutocomplete: ({
    id,
    value,
    onChange,
    onPlaceSelect,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onPlaceSelect?: (place: { address: string; latitude: number | null; longitude: number | null; placeId: string | null }) => void;
  }) => (
    <div>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        onClick={() =>
          onPlaceSelect?.({
            address: "15 Queen St, Sydney NSW 2000",
            latitude: -33.867,
            longitude: 151.207,
            placeId: "place_1",
          })
        }
      >
        Select suggested address
      </button>
    </div>
  ),
}));

import { NewDealModal } from "@/components/modals/new-deal-modal";

describe("NewDealModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getContacts.mockResolvedValue([
      { id: "contact_existing", name: "Existing Client", company: "Acme", email: null, phone: null },
    ]);
    createContact.mockResolvedValue({ success: true, contactId: "contact_new" });
    createDeal.mockResolvedValue({ success: true, dealId: "deal_new" });
  });

  it("requires an assignee when creating a scheduled job", async () => {
    const user = userEvent.setup();
    render(
      <NewDealModal
        isOpen
        onClose={vi.fn()}
        workspaceId="ws_1"
        teamMembers={[{ id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" }]}
      />,
    );

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalledWith("ws_1");
    });

    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: "Scheduled plumbing visit" },
    });
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "Sarah Jones" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "0400000002" },
    });

    await user.click(screen.getByRole("button", { name: "Scheduled" }));
    fireEvent.submit(screen.getByRole("button", { name: "Create Job" }).closest("form")!);

    expect(toastError).toHaveBeenCalledWith("Assign a team member when creating a job in Scheduled stage.");
    expect(createDeal).not.toHaveBeenCalled();
  });

  it("creates a business contact and job, then resets and closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <NewDealModal
        isOpen
        onClose={onClose}
        workspaceId="ws_1"
        teamMembers={[{ id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" }]}
      />,
    );

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalledWith("ws_1");
    });

    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: "Urgent drainage repair" },
    });
    fireEvent.change(screen.getByLabelText(/value/i), {
      target: { value: "450" },
    });
    fireEvent.change(screen.getByLabelText(/^address$/i), {
      target: { value: "15 Queen St" },
    });
    fireEvent.change(screen.getByLabelText(/schedule/i), {
      target: { value: "2026-04-15T09:30" },
    });
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "Acme Plumbing" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "office@acme.com" },
    });

    await user.click(screen.getByRole("button", { name: "Business" }));
    fireEvent.change(screen.getByLabelText(/business name/i), {
      target: { value: "Acme Plumbing Pty Ltd" },
    });
    await user.click(screen.getByRole("button", { name: "Scheduled" }));
    await user.click(screen.getByRole("button", { name: "Jess Smith" }));

    await waitFor(() => {
      expect(screen.getByText("scheduled")).toBeInTheDocument();
      expect(screen.getByText("user_1")).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: "Create Job" }).closest("form")!);

    await waitFor(() => {
      expect(createContact).toHaveBeenCalledWith({
        name: "Acme Plumbing",
        email: "office@acme.com",
        phone: undefined,
        company: "Acme Plumbing Pty Ltd",
        contactType: "BUSINESS",
        workspaceId: "ws_1",
      });
    });
    expect(createDeal).toHaveBeenCalledWith({
      title: "Urgent drainage repair",
      value: 450,
      contactId: "contact_new",
      stage: "scheduled",
      workspaceId: "ws_1",
      address: "15 Queen St",
      latitude: undefined,
      longitude: undefined,
      scheduledAt: new Date("2026-04-15T09:30"),
      assignedToId: "user_1",
    });
    expect(toastSuccess).toHaveBeenCalledWith("Contact created!");
    expect(toastSuccess).toHaveBeenCalledWith("Job created. Opening it now.");
    expect(onClose).toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith("/crm/deals/deal_new");
    expect(routerRefresh).toHaveBeenCalled();
    expect(screen.getByLabelText(/job description/i)).toHaveValue("");
  });

  it("shows a clear inline error for an invalid email", async () => {
    render(
      <NewDealModal
        isOpen
        onClose={vi.fn()}
        workspaceId="ws_1"
        teamMembers={[{ id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" }]}
      />,
    );

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalledWith("ws_1");
    });

    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: "Quoted visit" },
    });
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "Sarah Jones" },
    });
    fireEvent.change(screen.getByLabelText(/email$/i), {
      target: { value: "not-an-email" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Create Job" }).closest("form")!);

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(createContact).not.toHaveBeenCalled();
    expect(createDeal).not.toHaveBeenCalled();
  });

  it("clears stale coordinates when the user types over a previously selected address", async () => {
    const user = userEvent.setup();

    render(
      <NewDealModal
        isOpen
        onClose={vi.fn()}
        workspaceId="ws_1"
        teamMembers={[{ id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" }]}
      />,
    );

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalledWith("ws_1");
    });

    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: "Address trust job" },
    });
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "Sarah Jones" },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: "0400000002" },
    });

    await user.click(screen.getByRole("button", { name: "Select suggested address" }));
    fireEvent.change(screen.getByLabelText(/^address$/i), {
      target: { value: "500 QA Avenue, Sydney NSW" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Create Job" }).closest("form")!);

    await waitFor(() => {
      expect(createDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          address: "500 QA Avenue, Sydney NSW",
          latitude: undefined,
          longitude: undefined,
        }),
      );
    });
  });
});
