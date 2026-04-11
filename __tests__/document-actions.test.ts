import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCurrentWorkspaceAccess, db, getUploadUrl, getPublicUrl, revalidatePath } = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    businessDocument: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
  getUploadUrl: vi.fn(),
  getPublicUrl: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/actions/storage-actions", () => ({
  getUploadUrl,
  getPublicUrl,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

import { addDocument, deleteDocument, getDocuments, getUploadToken } from "@/actions/document-actions";

describe("document-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    db.businessDocument.findMany.mockResolvedValue([]);
    db.businessDocument.create.mockResolvedValue({ id: "doc_1" });
    getUploadUrl.mockResolvedValue("upload-url");
    getPublicUrl.mockResolvedValue("public-url");
  });

  it("lists documents from the actor workspace", async () => {
    await expect(getDocuments()).resolves.toEqual([]);

    expect(db.businessDocument.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws_1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("requires workspace access before returning upload tokens", async () => {
    await expect(getUploadToken("guide.pdf")).resolves.toBe("upload-url");

    expect(requireCurrentWorkspaceAccess).toHaveBeenCalled();
    expect(getUploadUrl).toHaveBeenCalledWith("guide.pdf", "documents");
  });

  it("adds and deletes documents in the actor workspace", async () => {
    await expect(
      addDocument({
        name: "Price list",
        description: "Current prices",
        path: "documents/price-list.pdf",
        fileType: "application/pdf",
        fileSize: 1234,
      }),
    ).resolves.toEqual({ success: true, doc: { id: "doc_1" } });

    expect(db.businessDocument.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws_1",
        name: "Price list",
        description: "Current prices",
        fileUrl: "public-url",
        fileType: "application/pdf",
        fileSize: 1234,
      },
    });

    await expect(deleteDocument("doc_1")).resolves.toEqual({ success: true });
    expect(db.businessDocument.delete).toHaveBeenCalledWith({
      where: { id: "doc_1", workspaceId: "ws_1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/my-business");
  });
});
