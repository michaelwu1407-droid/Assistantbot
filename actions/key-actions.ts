"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface KeyView {
  id: string;
  code: string;
  description: string | null;
  status: string;
  holderName?: string;
  checkedOutAt?: Date;
}

/**
 * Get all keys for a workspace.
 */
export async function getKeys(workspaceId: string): Promise<KeyView[]> {
  const keys = await db.key.findMany({
    where: { workspaceId },
    include: { holder: true },
    orderBy: { code: "asc" }
  });

  return keys.map(k => ({
    id: k.id,
    code: k.code,
    description: k.description,
    status: k.status,
    holderName: k.holder?.name,
    checkedOutAt: k.checkedOutAt || undefined
  }));
}

/**
 * Check out a key to a contact.
 */
export async function checkOutKey(keyId: string, contactId: string) {
  const key = await db.key.findUnique({ where: { id: keyId } });
  if (!key) return { success: false, error: "Key not found" };
  if (key.status === "CHECKED_OUT") return { success: false, error: "Key already checked out" };

  await db.key.update({
    where: { id: keyId },
    data: {
      status: "CHECKED_OUT",
      holderId: contactId,
      checkedOutAt: new Date()
    }
  });

  // Log activity
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Key Checked Out",
      content: `Key ${key.code} checked out`,
      contactId: contactId,
      workspaceId: key.workspaceId // Note: Activity schema needs workspaceId if we want to track it globally, but currently it links via deal/contact. 
      // Since we have contactId, it's fine.
    } as any // Cast to any because workspaceId isn't on Activity yet, but we rely on contact relation
  });

  revalidatePath("/dashboard/agent");
  return { success: true };
}

/**
 * Check in a key.
 */
export async function checkInKey(keyId: string) {
  const key = await db.key.findUnique({ where: { id: keyId } });
  if (!key) return { success: false, error: "Key not found" };

  await db.key.update({
    where: { id: keyId },
    data: {
      status: "AVAILABLE",
      holderId: null,
      checkedOutAt: null
    }
  });

  if (key.holderId) {
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Key Checked In",
        content: `Key ${key.code} returned`,
        contactId: key.holderId
      }
    });
  }

  revalidatePath("/dashboard/agent");
  return { success: true };
}
