import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, runIdempotent } = vi.hoisted(() => ({
  db: {
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  },
  runIdempotent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/idempotency", () => ({ runIdempotent }));

import {
  completeTask,
  createTask,
  deleteTask,
  getOverdueCount,
  getTasks,
} from "@/actions/task-actions";

describe("task-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T09:00:00.000Z"));
  });

  it("maps related entity labels and overdue state in getTasks", async () => {
    db.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        title: "Call Alex",
        description: "Confirm booking window",
        dueAt: new Date("2026-04-01T09:00:00.000Z"),
        completed: false,
        deal: { title: "Kitchen plumbing" },
        contact: { name: "Alex" },
      },
      {
        id: "task_2",
        title: "Send invoice",
        description: null,
        dueAt: new Date("2026-04-03T09:00:00.000Z"),
        completed: true,
        deal: null,
        contact: { name: "Jordan" },
      },
    ]);

    const result = await getTasks({ workspaceId: "ws_1", completed: false, limit: 10 });

    expect(db.task.findMany).toHaveBeenCalledWith({
      where: {
        completed: false,
        OR: [{ deal: { workspaceId: "ws_1" } }, { contact: { workspaceId: "ws_1" } }],
      },
      include: {
        deal: { select: { title: true } },
        contact: { select: { name: true } },
      },
      orderBy: { dueAt: "asc" },
      take: 10,
    });
    expect(result).toEqual([
      {
        id: "task_1",
        title: "Call Alex",
        description: "Confirm booking window",
        dueAt: new Date("2026-04-01T09:00:00.000Z"),
        completed: false,
        overdue: true,
        dealTitle: "Kitchen plumbing",
        contactName: "Alex",
      },
      {
        id: "task_2",
        title: "Send invoice",
        description: null,
        dueAt: new Date("2026-04-03T09:00:00.000Z"),
        completed: true,
        overdue: false,
        dealTitle: undefined,
        contactName: "Jordan",
      },
    ]);
  });

  it("uses idempotent task creation and returns the created task id", async () => {
    runIdempotent.mockImplementation(async ({ resultFactory }) => ({
      result: await resultFactory(),
    }));
    db.task.create.mockResolvedValue({ id: "task_123" });

    const result = await createTask({
      title: "  Call Alex  ",
      description: "Confirm scope",
      dueAt: new Date("2026-04-02T15:45:00.000Z"),
      dealId: "deal_1",
      contactId: "contact_1",
    });

    expect(runIdempotent).toHaveBeenCalledWith({
      actionType: "TASK_CREATE",
      parts: ["deal_1", "contact_1", "call alex", "2026-04-02T15"],
      bucketAt: new Date("2026-04-02T15:45:00.000Z"),
      resultFactory: expect.any(Function),
    });
    expect(db.task.create).toHaveBeenCalledWith({
      data: {
        title: "  Call Alex  ",
        description: "Confirm scope",
        dueAt: new Date("2026-04-02T15:45:00.000Z"),
        dealId: "deal_1",
        contactId: "contact_1",
      },
    });
    expect(result).toEqual({ success: true, taskId: "task_123" });
  });

  it("rejects invalid task input before touching the database", async () => {
    const result = await createTask({
      title: "",
      dueAt: "2026-04-02T15:45:00.000Z",
    } as never);

    expect(result).toEqual({ success: false, error: "Too small: expected string to have >=1 characters" });
    expect(runIdempotent).not.toHaveBeenCalled();
  });

  it("updates, counts, and deletes tasks through the task mutation helpers", async () => {
    db.task.count.mockResolvedValue(4);

    await expect(completeTask("task_1")).resolves.toEqual({ success: true });
    await expect(getOverdueCount("ws_1")).resolves.toBe(4);
    await expect(deleteTask("task_1")).resolves.toEqual({ success: true });

    expect(db.task.update).toHaveBeenCalledWith({
      where: { id: "task_1" },
      data: { completed: true, completedAt: expect.any(Date) },
    });
    expect(db.task.count).toHaveBeenCalledWith({
      where: {
        completed: false,
        dueAt: { lt: expect.any(Date) },
        OR: [{ deal: { workspaceId: "ws_1" } }, { contact: { workspaceId: "ws_1" } }],
      },
    });
    expect(db.task.delete).toHaveBeenCalledWith({ where: { id: "task_1" } });
  });
});
