import { describe, expect, it, vi } from "vitest";

const store = new Map<
  string,
  {
    status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
    result: unknown | null;
    error: string | null;
  }
>();

const dbMocks = vi.hoisted(() => ({
  actionExecution: {
    create: vi.fn(async ({ data }: any) => {
      const key = data.idempotencyKey as string;
      if (store.has(key)) {
        throw { code: "P2002" }; // unique constraint violation
      }
      store.set(key, { status: data.status, result: null, error: null });
      return { id: "row_1", idempotencyKey: key };
    }),
    findUnique: vi.fn(async ({ where }: any) => {
      const key = where.idempotencyKey as string;
      const row = store.get(key);
      if (!row) return null;
      return {
        idempotencyKey: key,
        status: row.status,
        result: row.result,
      };
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const key = where.idempotencyKey as string;
      const existing = store.get(key);
      if (!existing) throw new Error("Missing idempotencyKey in mock store");
      const next = {
        ...existing,
        status: data.status,
        result: data.result ?? existing.result,
        error: data.error ?? existing.error,
      };
      store.set(key, next);
      return { idempotencyKey: key, status: next.status };
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      const key = where.idempotencyKey as string;
      const existing = store.get(key);
      if (!existing) return { count: 0 };
      if (existing.status !== where.status) return { count: 0 };
      store.set(key, { ...existing, status: data.status, error: data.error ?? null });
      return { count: 1 };
    }),
  },
}));

vi.mock("@/lib/db", () => ({ db: dbMocks }));

import { makeIdempotencyKey, runIdempotent } from "@/lib/idempotency";

describe("idempotency helpers", () => {
  it("makeIdempotencyKey is deterministic for same inputs", () => {
    const bucketAt = new Date("2026-01-01T10:15:00Z");
    const k1 = makeIdempotencyKey({
      actionType: "X",
      parts: ["a", 1, "b"],
      bucketAt,
    });
    const k2 = makeIdempotencyKey({
      actionType: "X",
      parts: ["a", 1, "b"],
      bucketAt,
    });
    expect(k1).toBe(k2);

    const k3 = makeIdempotencyKey({
      actionType: "X",
      parts: ["a", 1, "b"],
      bucketAt: new Date("2026-01-01T11:15:00Z"),
    });
    expect(k3).not.toBe(k1);
  });

  it("runIdempotent dedupes duplicate calls (winner runs resultFactory once)", async () => {
    store.clear();
    dbMocks.actionExecution.create.mockClear();
    dbMocks.actionExecution.update.mockClear();
    dbMocks.actionExecution.findUnique.mockClear();

    let calls = 0;
    const params = {
      actionType: "TEST_ACTION",
      parts: ["deal_1", "EMAIL"],
      bucketAt: new Date("2026-01-01T10:15:00Z"),
      resultFactory: async () => {
        calls++;
        return { ok: true, at: Date.now() };
      },
    };

    const first = await runIdempotent<{ ok: boolean; at: number }>(params);
    const second = await runIdempotent<{ ok: boolean; at: number }>(params);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(calls).toBe(1);
    expect(second.result?.ok).toBe(true);
  });

  it("runIdempotent reclaims after FAILED so transient failures can retry", async () => {
    store.clear();
    let calls = 0;

    const params = {
      actionType: "TEST_ACTION_RECLAIM",
      parts: ["deal_2", "SMS"],
      bucketAt: new Date("2026-01-01T10:15:00Z"),
      resultFactory: async () => {
        calls++;
        if (calls === 1) throw new Error("Twilio transient error");
        return { ok: true };
      },
      waitForCompletionMs: 2000,
    };

    await expect(runIdempotent<{ ok: boolean }>(params)).rejects.toThrow("Twilio transient error");
    const second = await runIdempotent<{ ok: boolean }>(params);
    expect(second.created).toBe(true);
    expect(second.result?.ok).toBe(true);
    expect(calls).toBe(2);
  });
});

