import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { uploadDealPhoto, routerRefresh, toastSuccess, toastError } = vi.hoisted(() => ({
  uploadDealPhoto: vi.fn(),
  routerRefresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

vi.mock("@/actions/deal-actions", () => ({
  uploadDealPhoto,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { DealPhotosUpload } from "@/components/crm/deal-photos-upload";

describe("DealPhotosUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadDealPhoto.mockResolvedValue({ success: true });
  });

  it("uploads a photo, clears the note, and refreshes on success", async () => {
    const user = userEvent.setup();
    render(<DealPhotosUpload dealId="deal_1" initialPhotos={[]} />);

    await user.type(screen.getByPlaceholderText("e.g. Installed new kitchen tap"), "Finished install");
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["photo"], "job.jpg", { type: "image/jpeg" });

    await user.upload(hiddenInput, file);

    await waitFor(() => expect(uploadDealPhoto).toHaveBeenCalled());
    const [dealId, formData] = uploadDealPhoto.mock.calls[0];
    expect(dealId).toBe("deal_1");
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("caption")).toBe("Finished install");
    expect(toastSuccess).toHaveBeenCalledWith("Photo uploaded");
    expect(routerRefresh).toHaveBeenCalled();
    expect(screen.getByPlaceholderText("e.g. Installed new kitchen tap")).toHaveValue("");
  });

  it("shows the returned backend error without refreshing when upload is rejected", async () => {
    const user = userEvent.setup();
    uploadDealPhoto.mockResolvedValue({ success: false, error: "Upload failed: file too large" });

    render(<DealPhotosUpload dealId="deal_1" initialPhotos={[]} />);

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["photo"], "job.jpg", { type: "image/jpeg" });

    await user.upload(hiddenInput, file);

    await waitFor(() => expect(uploadDealPhoto).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("Upload failed: file too large");
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});
