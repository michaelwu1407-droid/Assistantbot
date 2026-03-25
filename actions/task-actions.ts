"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { runIdempotent } from "@/lib/idempotency";

// ─── Types ──────────────────────────────────────────────────────────

export interface TaskView {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  completed: boolean;
  overdue: boolean;
  dealTitle?: string;
  contactName?: string;
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.coerce.date(),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get pending tasks, sorted by due date.
 * Includes overdue flag for UI highlighting.
 */
export async function getTasks(options?: {
  workspaceId?: string;
  completed?: boolean;
  limit?: number;
}): Promise<TaskView[]> {
  const now = new Date();

  const where: Record<string, unknown> = {};
  if (options?.completed !== undefined) where.completed = options.completed;
  if (options?.workspaceId) {
    where.OR = [
      { deal: { workspaceId: options.workspaceId } },
      { contact: { workspaceId: options.workspaceId } },
    ];
  }

  const tasks = await db.task.findMany({
    where,
    include: {
      deal: { select: { title: true } },
      contact: { select: { name: true } },
    },
    orderBy: { dueAt: "asc" },
    take: options?.limit ?? 50,
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueAt: t.dueAt || null,
    completed: t.completed,
    overdue: !t.completed && (t.dueAt! < now),
    dealTitle: t.deal?.title,
    contactName: t.contact?.name,
  }));
}

/**
 * Create a follow-up reminder.
 * e.g., "Call John next Tuesday"
 */
export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  const parsed = CreateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const dueAtBucket = parsed.data.dueAt.toISOString().slice(0, 13); // YYYY-MM-DDTHH

  const res = await runIdempotent<{ taskId: string }>({
    actionType: "TASK_CREATE",
    parts: [
      parsed.data.dealId ?? "",
      parsed.data.contactId ?? "",
      parsed.data.title.trim().toLowerCase(),
      dueAtBucket,
    ],
    bucketAt: parsed.data.dueAt,
    resultFactory: async () => {
      const task = await db.task.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          dueAt: parsed.data.dueAt,
          dealId: parsed.data.dealId,
          contactId: parsed.data.contactId,
        },
      });
      return { taskId: task.id };
    },
  });

  if (!res.result?.taskId) {
    return { success: false, error: "Idempotent task creation returned no result" };
  }

  return { success: true, taskId: res.result.taskId };
}

/**
 * Mark a task as complete.
 */
export async function completeTask(taskId: string) {
  await db.task.update({
    where: { id: taskId },
    data: { completed: true, completedAt: new Date() },
  });

  return { success: true };
}

/**
 * Get overdue tasks count for dashboard badges.
 */
export async function getOverdueCount(workspaceId: string): Promise<number> {
  const count = await db.task.count({
    where: {
      completed: false,
      dueAt: { lt: new Date() },
      OR: [
        { deal: { workspaceId } },
        { contact: { workspaceId } },
      ],
    },
  });
  return count;
}

/**
 * Delete a task.
 */
export async function deleteTask(taskId: string) {
  await db.task.delete({ where: { id: taskId } });
  return { success: true };
}
