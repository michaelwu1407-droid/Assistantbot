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
      username: user.name || user.email?.split("@")[0] || "",
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

    revalidatePath("/crm/settings");
    revalidatePath("/crm", "layout");
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
    revalidatePath("/crm", "layout");
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
  console.log(`[ACCOUNT DELETION] User ${userId} requested deletion. Reason: ${reason}`);
  try {
    return await db.$transaction(async (tx) => {
      // 1. Find the user's workspace
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          workspaceId: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error:
            "User account not found in our database. This might indicate a data synchronization issue. Please contact support for assistance.",
        };
      }

      const workspaceId = user.workspaceId;

      // 2. Clean up user-level records without cascade delete
      await tx.activity.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });

      // 3. Unassign deals from this user
      await tx.$executeRawUnsafe(
        `UPDATE "Deal" SET "assignedToId" = NULL WHERE "assignedToId" = $1`,
        userId
      );

      // 4. Delete user (cascades: BusinessProfile, PricingSettings, EmailIntegration, SmsTemplates)
      await tx.user.delete({ where: { id: userId } });

      // 5. Check if workspace has other users — if not, clean up the whole workspace
      const remainingUsers = await tx.user.count({ where: { workspaceId } });
      if (remainingUsers === 0) {
        // First delete deeply nested records (activities, tasks on deals, etc.)
        const deals = await tx.deal.findMany({
          where: { workspaceId },
          select: { id: true },
        });
        const dealIds = deals.map((d) => d.id);

        if (dealIds.length > 0) {
          await tx.activity.deleteMany({ where: { dealId: { in: dealIds } } });
          await tx.task.deleteMany({ where: { dealId: { in: dealIds } } });
          await tx.invoice.deleteMany({ where: { dealId: { in: dealIds } } });
          await tx.openHouseLog.deleteMany({ where: { dealId: { in: dealIds } } });
          await tx.buyerFeedback.deleteMany({ where: { dealId: { in: dealIds } } });
          await tx.jobPhoto.deleteMany({ where: { dealId: { in: dealIds } } });
          await tx.customerFeedback.deleteMany({ where: { dealId: { in: dealIds } } });
        }

        // Delete contacts' remaining activities and tasks
        const contacts = await tx.contact.findMany({
          where: { workspaceId },
          select: { id: true },
        });
        const contactIds = contacts.map((c) => c.id);
        if (contactIds.length > 0) {
          await tx.activity.deleteMany({ where: { contactId: { in: contactIds } } });
          await tx.task.deleteMany({ where: { contactId: { in: contactIds } } });
          await tx.customerFeedback.deleteMany({ where: { contactId: { in: contactIds } } });
        }

        // Delete deals and contacts
        await tx.deal.deleteMany({ where: { workspaceId } });
        await tx.contact.deleteMany({ where: { workspaceId } });

        // Delete workspace-level resources
        await tx.chatMessage.deleteMany({ where: { workspaceId } });
        await tx.messageTemplate.deleteMany({ where: { workspaceId } });
        await tx.automation.deleteMany({ where: { workspaceId } });
        await tx.material.deleteMany({ where: { workspaceId } });
        await tx.key.deleteMany({ where: { workspaceId } });
        await tx.repairItem.deleteMany({ where: { workspaceId } });
        await tx.$executeRawUnsafe(
          `DELETE FROM "AutomatedMessageRule" WHERE "workspaceId" = $1`,
          workspaceId
        );
        await tx.$executeRawUnsafe(
          `DELETE FROM "WorkspaceInvite" WHERE "workspaceId" = $1`,
          workspaceId
        );

        // Finally delete the workspace itself
        await tx.workspace.delete({ where: { id: workspaceId } });
      }

      return { success: true };
    });
  } catch (error: any) {
    console.error("Failed to delete account:", error?.message || error);
    console.error("Full error:", JSON.stringify(error, null, 2));
    return {
      success: false,
      error: `Failed to delete account: ${error?.message || "Unknown error"}. Please contact support.`,
    };
  }
}
