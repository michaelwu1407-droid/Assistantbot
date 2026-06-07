import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { updateBusinessContact, toastSuccess, toastError } = vi.hoisted(() => ({
  updateBusinessContact: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/settings-actions", () => ({
  updateBusinessContact,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { BusinessContactForm } from "@/components/settings/business-contact-form";

describe("BusinessContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateBusinessContact.mockResolvedValue({ success: true });
  });

  it("trims and saves the business contact details", async () => {
    const user = userEvent.setup();
    render(<BusinessContactForm initialData={{ phone: "", email: "", address: "" }} />);

    await user.type(screen.getByPlaceholderText("+61 400 000 000"), " 0400123123 ");
    await user.type(screen.getByPlaceholderText("hello@yourbusiness.com"), " hello@example.com ");
    await user.type(screen.getByPlaceholderText("Business address"), " 1 King St ");
    await user.click(screen.getByRole("button", { name: "Save contact" }));

    await waitFor(() =>
      expect(updateBusinessContact).toHaveBeenCalledWith({
        phone: "0400123123",
        email: "hello@example.com",
        address: "1 King St",
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Business contact saved");
  });

  it("shows an error when the save result is rejected", async () => {
    const user = userEvent.setup();
    updateBusinessContact.mockResolvedValue({ success: false });

    render(<BusinessContactForm initialData={{ phone: "", email: "", address: "" }} />);

    await user.click(screen.getByRole("button", { name: "Save contact" }));

    await waitFor(() => expect(updateBusinessContact).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("Failed to save");
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
