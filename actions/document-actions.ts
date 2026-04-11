"use server";

import { db } from "@/lib/db";
import { getUploadUrl, getPublicUrl } from "./storage-actions";
import { revalidatePath } from "next/cache";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";

export async function getDocuments() {
    const actor = await requireCurrentWorkspaceAccess();

    return db.businessDocument.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: { createdAt: "desc" },
    });
}

export async function getUploadToken(filename: string) {
    await requireCurrentWorkspaceAccess();
    return getUploadUrl(filename, "documents");
}

export async function addDocument(data: { name: string; description: string; path: string; fileType?: string; fileSize?: number }) {
    const actor = await requireCurrentWorkspaceAccess();

    const publicUrl = await getPublicUrl(data.path, "documents");

    const doc = await db.businessDocument.create({
        data: {
            workspaceId: actor.workspaceId,
            name: data.name,
            description: data.description,
            fileUrl: publicUrl,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    });

    revalidatePath("/crm/settings/my-business");
    return { success: true, doc };
}

export async function deleteDocument(id: string) {
    const actor = await requireCurrentWorkspaceAccess();

    await db.businessDocument.delete({
        where: { id, workspaceId: actor.workspaceId },
    });

    revalidatePath("/crm/settings/my-business");
    return { success: true };
}
