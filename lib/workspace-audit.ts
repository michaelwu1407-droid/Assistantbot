import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type WorkspaceAuditEventInput = {
  workspaceId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function resolveWorkspaceAuditActor(workspaceId: string) {
  const authUser = await getAuthUser();
  if (!authUser?.email) return null;

  return db.user.findFirst({
    where: {
      workspaceId,
      email: authUser.email,
    },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
    },
  });
}

export async function recordWorkspaceAuditEvent(input: WorkspaceAuditEventInput) {
  await db.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      action: input.action,
      entityType: input.entityType ?? undefined,
      entityId: input.entityId ?? undefined,
      metadata: JSON.parse(JSON.stringify(input.metadata ?? {})),
    },
  });
}

export async function recordWorkspaceAuditEventForCurrentActor(
  input: Omit<WorkspaceAuditEventInput, "userId">,
) {
  const actor = await resolveWorkspaceAuditActor(input.workspaceId);
  await recordWorkspaceAuditEvent({
    ...input,
    userId: actor?.id ?? undefined,
  });
  return actor;
}
