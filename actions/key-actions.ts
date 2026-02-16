"use server";

import { db } from "@/lib/db";

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
