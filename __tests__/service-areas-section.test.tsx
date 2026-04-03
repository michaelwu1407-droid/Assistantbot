import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { getServiceArea, updateServiceArea, toastSuccess, toastError } = vi.hoisted(() => ({
  getServiceArea: vi.fn(),
  updateServiceArea: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/knowledge-actions", () => ({
  getServiceArea,
  updateServiceArea,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ value, onValueChange, disabled }: { value: number[]; onValueChange: (value: number[]) => void; disabled?: boolean }) => (
    <input
      aria-label="Service radius"
      type="range"
      min={5}
      max={100}
      step={5}
      value={value[0]}
      disabled={disabled}
      onChange={(event) => onValueChange([Number(event.target.value)])}
    />
  ),
}));

import { ServiceAreasSection } from "@/components/settings/service-areas-section";

describe("ServiceAreasSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServiceArea.mockResolvedValue({
      serviceRadius: 20,
      serviceSuburbs: ["Parramatta"],
      baseSuburb: "Sydney",
    });
    updateServiceArea.mockResolvedValue({ success: true });
  });

  it("shows the backend error when saving service areas fails", async () => {
    const user = userEvent.setup();
    updateServiceArea.mockResolvedValue({ success: false, error: "Profile missing" });

    render(<ServiceAreasSection />);

    await waitFor(() => expect(getServiceArea).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Save service areas" }));

    await waitFor(() => expect(updateServiceArea).toHaveBeenCalledWith(20, ["Parramatta"]));
    expect(toastError).toHaveBeenCalledWith("Profile missing");
    expect(toastSuccess).not.toHaveBeenCalledWith("Service area saved");
  });
});
