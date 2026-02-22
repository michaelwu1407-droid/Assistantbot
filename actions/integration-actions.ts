"use server";

import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildXeroAuthUrl } from "@/lib/xero";

/**
 * Initiates the Xero OAuth 2.0 flow by returning the authorization URL.
 */
export async function connectXero(): Promise<{ url: string | null }> {
  try {
    const userId = await getAuthUserId();
    const user = await db.user.findFirst({
      where: { id: userId },
      select: { workspaceId: true },
    });

    if (!user) return { url: null };

    const url = buildXeroAuthUrl(user.workspaceId);
    return { url };
  } catch (error) {
    console.error("[connectXero] Error:", error);
    return { url: null };
  }
}
