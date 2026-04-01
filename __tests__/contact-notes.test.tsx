import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { updateContactMetadata, toastSuccess, toastError } = vi.hoisted(() => ({
  updateContactMetadata: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/contact-actions", () => ({
  updateContactMetadata,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { ContactNotes } from "@/components/crm/contact-notes";

describe("ContactNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves edited notes and shows success feedback", async () => {
    const user = userEvent.setup();
    updateContactMetadata.mockResolvedValue({ success: true });

    render(<ContactNotes contactId="contact_123" initialNotes="Old note" />);

    await user.clear(screen.getByPlaceholderText(/log notes about this customer/i));
    await user.type(screen.getByPlaceholderText(/log notes about this customer/i), "Updated note");
    await user.click(screen.getByRole("button", { name: "Save notes" }));

    await waitFor(() => {
      expect(updateContactMetadata).toHaveBeenCalledWith("contact_123", {
        notes: "Updated note",
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Notes saved");
  });

  it("resets the textarea when the upstream note changes", async () => {
    const { rerender } = render(
      <ContactNotes contactId="contact_123" initialNotes="Initial note" />,
    );

    expect(screen.getByDisplayValue("Initial note")).toBeInTheDocument();

    rerender(<ContactNotes contactId="contact_123" initialNotes="Fresh note from server" />);

    expect(screen.getByDisplayValue("Fresh note from server")).toBeInTheDocument();
  });

  it("shows the server error when the save fails", async () => {
    const user = userEvent.setup();
    updateContactMetadata.mockResolvedValue({ success: false, error: "Write failed" });

    render(<ContactNotes contactId="contact_123" initialNotes="" />);

    await user.type(screen.getByPlaceholderText(/log notes about this customer/i), "Follow up Friday");
    await user.click(screen.getByRole("button", { name: "Save notes" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Write failed");
    });
  });
});
