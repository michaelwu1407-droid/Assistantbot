"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Validation ─────────────────────────────────────────────────────

const UpdateProfileSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  bio: z.string().optional(),
  urls: z.array(z.object({ value: z.string().url() })).optional(),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get the current user's profile.
 * In a real app, we'd get the ID from the session.
 * For now, we accept an ID or default to demo-user logic.
 */
export async function getUserProfile(userId: string) {
  // If using demo-user, we might need to find the first user in the workspace
  // or just return null if not found.
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    // Fallback for demo mode if no user exists yet
    return null;
  }

  return {
    id: user.id,
    username: user.name || "",
    email: user.email,
    bio: user.bio || "",
    urls: (user.urls as { value: string }[]) || [],
    hasOnboarded: user.hasOnboarded,
  };
}

/**
 * Update the user's profile.
 */
export async function updateUserProfile(userId: string, data: z.infer<typeof UpdateProfileSchema>) {
  const parsed = UpdateProfileSchema.safeParse(data);
  
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.username,
        email: parsed.data.email,
        bio: parsed.data.bio,
        urls: parsed.data.urls ? JSON.parse(JSON.stringify(parsed.data.urls)) : undefined,
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
