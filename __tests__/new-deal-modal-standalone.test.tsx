import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  routerPush,
  createDeal,
  getContacts,
  createContact,
  getTeamMembers,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  routerPush: vi.fn(),
  createDeal: vi.fn(),
  getContacts: vi.fn(),
  createContact: vi.fn(),
  getTeamMembers: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("@/actions/deal-actions", () => ({
  createDeal,
}));

vi.mock("@/actions/contact-actions", () => ({
  getContacts,
  createContact,
}));

vi.mock("@/actions/invite-actions", () => ({
  getTeamMembers,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
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
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
  }) => <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />,
}));

import { NewDealModalStandalone } from "@/components/modals/new-deal-modal-standalone";

describe("NewDealModalStandalone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getContacts.mockResolvedValue([
      { id: "contact_existing", name: "Existing Client", company: "Acme", email: null, phone: null },
    ]);
    getTeamMembers.mockResolvedValue([
      { id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" },
    ]);
    createContact.mockResolvedValue({ success: true, contactId: "contact_new" });
    createDeal.mockResolvedValue({ success: true, dealId: "deal_new" });
  });

  it("creates a job for an existing selected contact", async () => {
    const user = userEvent.setup();
    render(<NewDealModalStandalone workspaceId="ws_1" />);

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalledWith("ws_1");
      expect(getTeamMembers).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /existing/i }));
    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: "Replace hot water service" },
    });
    fireEvent.change(screen.getByLabelText(/value/i), {
      target: { value: "1200" },
    });
    await user.click(screen.getByRole("button", { name: "Existing Client (Acme)" }));

    await waitFor(() => {
      expect(screen.getByText("contact_existing")).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: /save job & close/i }).closest("form")!);

    await waitFor(() => {
      expect(createDeal).toHaveBeenCalledWith({
        title: "Replace hot water service",
        value: 1200,
        contactId: "contact_existing",
        stage: "new_request",
        workspaceId: "ws_1",
        address: undefined,
        latitude: undefined,
        longitude: undefined,
        scheduledAt: undefined,
        assignedToId: undefined,
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Job created. Opening it now.");
    expect(routerPush).toHaveBeenCalledWith("/crm/deals/deal_new");
  });

  it("requires a business name for new business contacts", async () => {
    const user = userEvent.setup();
    render(<NewDealModalStandalone workspaceId="ws_1" />);

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalledWith("ws_1");
    });

    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: "Commercial fit-out" },
    });
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Acme Reception" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ops@acme.com" },
    });
    await user.click(screen.getByRole("button", { name: "BUSINESS" }));

    fireEvent.submit(screen.getByRole("button", { name: /save job & close/i }).closest("form")!);

    expect(screen.getByText("Business name is required when client type is Business.")).toBeInTheDocument();
    expect(createContact).not.toHaveBeenCalled();
    expect(createDeal).not.toHaveBeenCalled();
  });

  it("shows a clear invalid-email error before creating a contact", async () => {
    render(<NewDealModalStandalone workspaceId="ws_1" />);

    await waitFor(() => {
      expect(getContacts).toHaveBeenCalledWith("ws_1");
    });

    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: "Commercial fit-out" },
    });
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Acme Reception" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ops-at-acme" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /save job & close/i }).closest("form")!);

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(createContact).not.toHaveBeenCalled();
    expect(createDeal).not.toHaveBeenCalled();
  });
});
