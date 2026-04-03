import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { routerPush, routerRefresh, createContact, updateContact, toastSuccess, toastError } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routerRefresh: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

vi.mock("@/actions/contact-actions", () => ({
  createContact,
  updateContact,
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
  }: {
    id?: string;
    children: React.ReactNode;
  }) {
    return <button id={id} type="button">{children}</button>;
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

import { ContactForm } from "@/components/crm/contact-form";

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createContact.mockResolvedValue({ success: true, contactId: "contact_1", merged: false });
    updateContact.mockResolvedValue({ success: true });
  });

  it("creates a contact and routes to the detail page", async () => {
    const user = userEvent.setup();
    render(<ContactForm mode="create" workspaceId="ws_1" />);

    await user.type(screen.getByLabelText("Name"), "Sarah Jones");
    await user.type(screen.getByLabelText("Email"), "sarah@example.com");
    await user.type(screen.getByLabelText("Phone"), "0400000000");
    await user.type(screen.getByLabelText("Company"), "Sarah Plumbing");

    await user.click(screen.getByRole("button", { name: "Create contact" }));

    await waitFor(() =>
      expect(createContact).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws_1",
          name: "Sarah Jones",
          email: "sarah@example.com",
          phone: "0400000000",
          company: "Sarah Plumbing",
          contactType: "PERSON",
        }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Contact created.");
    expect(routerPush).toHaveBeenCalledWith("/crm/contacts/contact_1");
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("updates an existing contact and returns to the detail page", async () => {
    const user = userEvent.setup();
    render(
      <ContactForm
        mode="edit"
        contact={{
          id: "contact_9",
          name: "Acme Plumbing",
          email: "office@acme.com",
          phone: "0400123123",
          company: "Acme Plumbing",
          address: "1 King St",
          metadata: { contactType: "BUSINESS" },
        }}
      />,
    );

    await user.clear(screen.getByLabelText("Phone"));
    await user.type(screen.getByLabelText("Phone"), "0400999888");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateContact).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: "contact_9",
          phone: "0400999888",
        }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Contact updated.");
    expect(routerPush).toHaveBeenCalledWith("/crm/contacts/contact_9");
  });
});
