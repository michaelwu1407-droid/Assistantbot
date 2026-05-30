import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    task: {
      findMany: vi.fn(),
    },
  },
  evaluateAutomations: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/actions/automation-actions", () => ({
  evaluateAutomations: hoisted.evaluateAutomations,
}));

import { GET } from "@/app/api/cron/task-overdue/route";

const CRON_SECRET = "test-secret";

function makeRequest() {
  return new NextRequest("https://app.example.com/api/cron/task-overdue", {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
}

describe("GET /api/cron/task-overdue (cron-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    hoisted.evaluateAutomations.mockResolvedValue({ triggered: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when authorization header does not match CRON_SECRET", async () => {
    const response = await GET(
      new NextRequest("https://app.example.com/api/cron/task-overdue", {
        headers: { Authorization: "Bearer wrong" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(hoisted.db.task.findMany).not.toHaveBeenCalled();
  });

  it("fires evaluateAutomations once per workspace for overdue tasks", async () => {
    hoisted.db.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        dealId: "deal_1",
        contactId: null,
        deal: { workspaceId: "ws_1" },
        contact: null,
      },
      {
        id: "task_2",
        dealId: "deal_2",
        contactId: null,
        deal: { workspaceId: "ws_1" },
        contact: null,
      },
      {
        id: "task_3",
        dealId: null,
        contactId: "contact_1",
        deal: null,
        contact: { workspaceId: "ws_2" },
      },
    ]);
    hoisted.evaluateAutomations.mockResolvedValue({ triggered: ["auto_1"] });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.workspacesChecked).toBe(2);
    expect(body.overdueTasksFound).toBe(3);
    // evaluateAutomations called once per workspace (2 workspaces)
    expect(hoisted.evaluateAutomations).toHaveBeenCalledTimes(2);
    expect(hoisted.evaluateAutomations).toHaveBeenCalledWith("ws_1", {
      type: "check_tasks",
      dealId: "deal_1",
      contactId: undefined,
    });
    expect(hoisted.evaluateAutomations).toHaveBeenCalledWith("ws_2", {
      type: "check_tasks",
      dealId: undefined,
      contactId: "contact_1",
    });
  });

  it("returns success with zero counts when no tasks are overdue", async () => {
    hoisted.db.task.findMany.mockResolvedValue([]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.workspacesChecked).toBe(0);
    expect(body.overdueTasksFound).toBe(0);
    expect(hoisted.evaluateAutomations).not.toHaveBeenCalled();
  });

  it("returns 500 when the DB query throws", async () => {
    hoisted.db.task.findMany.mockRejectedValue(new Error("DB connection lost"));

    const response = await GET(makeRequest());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to check overdue tasks");
    expect(body.details).toBe("DB connection lost");
  });
});
