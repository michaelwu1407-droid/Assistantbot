"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Validation ─────────────────────────────────────────────────────

const UpdateProfileSchema = z.object({
  username: z.string().min(2),
  bio: z.string().optional(),
  urls: z.array(z.object({ value: z.string().url() })).optional(),
  viewMode: z.enum(["BASIC", "ADVANCED"]).optional(),
});

// ─── Types ───────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  urls: { value: string }[];
  viewMode: "BASIC" | "ADVANCED";
  hasOnboarded: boolean;
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get the current user's profile.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        urls: true,
        viewMode: true,
        hasOnboarded: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.name || "",
      email: user.email,
      bio: user.bio || "",
      urls: (user.urls as { value: string }[]) || [],
      viewMode: (user.viewMode as "BASIC" | "ADVANCED") || "BASIC",
      hasOnboarded: user.hasOnboarded,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Update user's profile.
 */
export async function updateUserProfile(
  userId: string,
  data: {
    username?: string;
    bio?: string;
    urls?: { value: string }[];
    viewMode?: "BASIC" | "ADVANCED";
  }
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdateProfileSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.username,
        bio: parsed.data.bio,
        urls: parsed.data.urls ? JSON.parse(JSON.stringify(parsed.data.urls)) : undefined,
        viewMode: parsed.data.viewMode,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Mark user onboarding as complete.
 */
export async function completeUserOnboarding(userId: string) {
  try {
    await db.user.update({
      where: { id: userId },
      data: { hasOnboarded: true },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Delete user account and log reason.
 * Manually cleans up ALL dependent records before deleting the user.
 */
export async function deleteUserAccount(userId: string, reason: string) {
  try {
    console.log(`[ACCOUNT DELETION] User ${userId} requested deletion. Reason: ${reason}`);

    // 1. Find the user's workspace
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true,
        email: true,
        workspaceId: true 
      },
    });

    if (!user) {
      console.error(`[ACCOUNT DELETION] User not found in database. Supabase ID: ${userId}`);
      
      // Check if there are any users in the database to debug
      const totalUsers = await db.user.count();
      console.error(`[ACCOUNT DELETION] Total users in database: ${totalUsers}`);
      
      // If user doesn't exist in database but exists in Supabase, we should still clean up Supabase
      // This handles the case where database was corrupted but Supabase still has the user
      return { 
        success: false, 
        error: "User account not found in our database. This might indicate a data synchronization issue. Please contact support for assistance." 
      };
    }

    console.log(`[ACCOUNT DELETION] Found user: ${user.name} (${user.email}) in workspace ${user.workspaceId}`);

    const workspaceId = user.workspaceId;

    // 2. Clean up user-level records without cascade delete
    await db.activity.deleteMany({ where: { userId } });
    await db.notification.deleteMany({ where: { userId } });

    // 3. Unassign deals from this user
    await db.$executeRawUnsafe(
      `UPDATE "Deal" SET "assignedToId" = NULL WHERE "assignedToId" = $1`,
      userId
    );

    // 4. Delete user (cascades: BusinessProfile, PricingSettings, EmailIntegration, SmsTemplates)
    await db.user.delete({ where: { id: userId } });

    // 5. Check if workspace has other users — if not, clean up the whole workspace
    const remainingUsers = await db.user.count({ where: { workspaceId } });
    if (remainingUsers === 0) {
      // Delete all workspace-level data
      // First delete deeply nested records (activities, tasks on deals, etc.)
      const deals = await db.deal.findMany({ where: { workspaceId }, select: { id: true } });
      const dealIds = deals.map(d => d.id);

      if (dealIds.length > 0) {
        await db.activity.deleteMany({ where: { dealId: { in: dealIds } } });
        await db.task.deleteMany({ where: { dealId: { in: dealIds } } });
        await db.invoice.deleteMany({ where: { dealId: { in: dealIds } } });
        await db.openHouseLog.deleteMany({ where: { dealId: { in: dealIds } } });
        await db.buyerFeedback.deleteMany({ where: { dealId: { in: dealIds } } });
        await db.jobPhoto.deleteMany({ where: { dealId: { in: dealIds } } });
        await db.customerFeedback.deleteMany({ where: { dealId: { in: dealIds } } });
      }

      // Delete contacts' remaining activities and tasks
      const contacts = await db.contact.findMany({ where: { workspaceId }, select: { id: true } });
      const contactIds = contacts.map(c => c.id);
      if (contactIds.length > 0) {
        await db.activity.deleteMany({ where: { contactId: { in: contactIds } } });
        await db.task.deleteMany({ where: { contactId: { in: contactIds } } });
        await db.customerFeedback.deleteMany({ where: { contactId: { in: contactIds } } });
      }

      // Delete deals and contacts
      await db.deal.deleteMany({ where: { workspaceId } });
      await db.contact.deleteMany({ where: { workspaceId } });

      // Delete workspace-level resources
      await db.chatMessage.deleteMany({ where: { workspaceId } });
      await db.messageTemplate.deleteMany({ where: { workspaceId } });
      await db.automation.deleteMany({ where: { workspaceId } });
      await db.material.deleteMany({ where: { workspaceId } });
      await db.key.deleteMany({ where: { workspaceId } });
      await db.repairItem.deleteMany({ where: { workspaceId } });
      await db.$executeRawUnsafe(
        `DELETE FROM "AutomatedMessageRule" WHERE "workspaceId" = $1`,
        workspaceId
      );
      await db.$executeRawUnsafe(
        `DELETE FROM "WorkspaceInvite" WHERE "workspaceId" = $1`,
        workspaceId
      );

      // Finally delete the workspace itself
      await db.workspace.delete({ where: { id: workspaceId } });
    }

    console.log(`[ACCOUNT DELETION] Successfully deleted user ${userId} and cleaned up data`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete account:", error?.message || error);
    console.error("Full error:", JSON.stringify(error, null, 2));
    return { success: false, error: `Failed to delete account: ${error?.message || "Unknown error"}. Please contact support.` };
  }
}
