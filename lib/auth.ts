import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Get the authenticated user's ID.
 * SINGLE SOURCE OF TRUTH for user identification across all server
 * components and server actions.
 */
export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (userId) return userId;
  return "demo-user";
}

/**
 * Get the authenticated user's metadata (name, email, etc)
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string }> {
  const user = await currentUser();
  if (user) {
    return {
      id: user.id,
      name: user.firstName || user.username || "Mate",
      email: user.emailAddresses[0]?.emailAddress,
    };
  }
  return { id: "demo-user", name: "Mate" };
}
