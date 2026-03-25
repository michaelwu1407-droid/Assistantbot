import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

const BUCKET_MS = 60 * 60 * 1000; // 1 hour

function normalizePart(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.replace(/\s+/g, " ").trim();
}

function hourBucketAt(date: Date): number {
  return Math.floor(date.getTime() / BUCKET_MS);
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Create a short, deterministic idempotency key.
 * The "bucketAt" controls the dedup window (e.g. dueAt, scheduledAt, etc).
 */
export function makeIdempotencyKey(params: {
  actionType: string;
  parts: unknown[];
  bucketAt: Date;
}): string {
  const bucket = hourBucketAt(params.bucketAt);
  const rawParts = params.parts.map(normalizePart).join("|");
  return sha256Hex(`${params.actionType}|${bucket}|${rawParts}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs `resultFactory()` only for the first caller that claims an idempotency key.
 * Duplicate callers return the already-stored result.
 */
export async function runIdempotent<ResultType>(params: {
  actionType: string;
  parts: unknown[];
  bucketAt: Date;
  resultFactory: () => Promise<ResultType>;
  /**
   * If a duplicate occurs but the previous attempt is still in-progress, how long to wait
   * for the first attempt to finish.
   */
  waitForCompletionMs?: number; // default: 1500ms
}): Promise<{ idempotencyKey: string; created: boolean; result: ResultType | null }> {
  const idempotencyKey = makeIdempotencyKey({
    actionType: params.actionType,
    parts: params.parts,
    bucketAt: params.bucketAt,
  });

  async function runAsWinner(): Promise<{ created: boolean; result: ResultType }> {
    try {
      const result = await params.resultFactory();
      await db.actionExecution.update({
        where: { idempotencyKey },
        data: {
          status: "COMPLETED",
          result: result as unknown as object,
          error: null,
        },
      });
      return { created: true, result };
    } catch (err: unknown) {
      await db.actionExecution.update({
        where: { idempotencyKey },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      }).catch(() => {});

      throw err;
    }
  }

  // First attempt: try to claim the idempotency key.
  try {
    await db.actionExecution.create({
      data: {
        idempotencyKey,
        actionType: params.actionType,
        status: "IN_PROGRESS",
      },
    });
    const winner = await runAsWinner();
    return { idempotencyKey, created: winner.created, result: winner.result };
  } catch (err: unknown) {
    // Duplicate claim: return the stored result, wait, or (if previous failed) re-claim.
    const maybeCode =
      err instanceof Prisma.PrismaClientKnownRequestError
        ? err.code
        : (err as { code?: string }).code;

    if (maybeCode !== "P2002") {
      throw err;
    }

    const waitFor = params.waitForCompletionMs ?? 1500;
    const startedAt = Date.now();

    // Poll for completion; if failed, allow a re-claim so transient errors can retry.
    while (Date.now() - startedAt < waitFor) {
      const existing = await db.actionExecution.findUnique({
        where: { idempotencyKey },
      });

      if (existing?.status === "COMPLETED") {
        return {
          idempotencyKey,
          created: false,
          result: (existing.result ?? null) as ResultType | null,
        };
      }

      if (existing?.status === "FAILED") {
        const reClaimed = await db.actionExecution.updateMany({
          where: { idempotencyKey, status: "FAILED" },
          data: { status: "IN_PROGRESS", error: null },
        });

        if (reClaimed.count > 0) {
          const winner = await runAsWinner();
          return { idempotencyKey, created: true, result: winner.result };
        }
        return { idempotencyKey, created: false, result: null };
      }

      await sleep(120);
    }

    const existing = await db.actionExecution.findUnique({
      where: { idempotencyKey },
    });

    return {
      idempotencyKey,
      created: false,
      result: (existing?.result ?? null) as ResultType | null,
    };
  }
}

