import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Get the current user's ID from Clerk.
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

/**
 * Get the current user's metadata from Clerk.
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string }> {
  const user = await currentUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  
  return {
    id: user.id,
    name: user.firstName || user.username || "User",
    email: user.emailAddresses[0]?.emailAddress,
  };
}
