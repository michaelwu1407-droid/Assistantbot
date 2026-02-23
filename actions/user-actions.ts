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
 * Manually cleans up dependent records that don't have onDelete: Cascade.
 */
export async function deleteUserAccount(userId: string, reason: string) {
  try {
    console.log(`[ACCOUNT DELETION] User ${userId} requested deletion. Reason: ${reason}`);

    // Clean up records that reference this user without cascade delete
    await db.activity.deleteMany({ where: { userId } });
    await db.notification.deleteMany({ where: { userId } });
    // Unassign deals (don't delete them, just remove the user assignment)
    await db.$executeRawUnsafe(
      `UPDATE "Deal" SET "assignedToId" = NULL WHERE "assignedToId" = $1`,
      userId
    );

    // Now delete user — BusinessProfile, PricingSettings, EmailIntegration,
    // SmsTemplates will cascade-delete via the schema
    await db.user.delete({
      where: { id: userId }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { success: false, error: "Failed to delete account. Please try again or contact support." };
  }
}
