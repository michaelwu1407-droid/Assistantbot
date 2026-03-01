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
    if (!userId) return { url: null };
    const workspace = await db.workspace.findFirst({
      where: {
        users: {
          some: { id: userId }
        }
      }
    });

    if (!workspace) return { url: null };

    const url = buildXeroAuthUrl(workspace.id);
    return { url };
  } catch (error) {
    console.error("[connectXero] Error:", error);
    return { url: null };
  }
}
