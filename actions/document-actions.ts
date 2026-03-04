"use server";

import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { getUploadUrl, getPublicUrl } from "./storage-actions";
import { getOrCreateWorkspace } from "./workspace-actions";
import { revalidatePath } from "next/cache";

export async function getDocuments() {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("Unauthorized");

    const workspace = await getOrCreateWorkspace(userId);

    return db.businessDocument.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
    });
}

export async function getUploadToken(filename: string) {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("Unauthorized");
    return getUploadUrl(filename, "documents");
}

export async function addDocument(data: { name: string; description: string; path: string; fileType?: string; fileSize?: number }) {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("Unauthorized");

    const workspace = await getOrCreateWorkspace(userId);
    const publicUrl = await getPublicUrl(data.path, "documents");

    const doc = await db.businessDocument.create({
        data: {
            workspaceId: workspace.id,
            name: data.name,
            description: data.description,
            fileUrl: publicUrl,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    });

    revalidatePath("/dashboard/settings/my-business");
    return { success: true, doc };
}

export async function deleteDocument(id: string) {
    const userId = await getAuthUserId();
    if (!userId) throw new Error("Unauthorized");

    const workspace = await getOrCreateWorkspace(userId);

    await db.businessDocument.delete({
        where: { id, workspaceId: workspace.id },
    });

    revalidatePath("/dashboard/settings/my-business");
    return { success: true };
}
