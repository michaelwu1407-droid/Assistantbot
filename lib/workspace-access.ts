import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireCurrentWorkspaceAccess() {
  const userId = await getAuthUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      workspaceId: true,
      role: true,
    },
  });

  if (!user?.workspaceId) {
    throw new Error("Workspace access not found");
  }

  return user;
}

export async function requireContactInCurrentWorkspace(contactId: string) {
  const actor = await requireCurrentWorkspaceAccess();
  const contact = await db.contact.findFirst({
    where: {
      id: contactId,
      workspaceId: actor.workspaceId,
    },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  return { actor, contact };
}

export async function requireDealInCurrentWorkspace(dealId: string) {
  const actor = await requireCurrentWorkspaceAccess();
  const deal = await db.deal.findFirst({
    where: {
      id: dealId,
      workspaceId: actor.workspaceId,
    },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  return { actor, deal };
}
