import { db, isDatabaseConfigured } from "@/lib/db";
import type { RuntimeStatus } from "@/lib/voice-fleet";
import { VOICE_OUTBOUND_CALL_ACTION_TYPE } from "@/lib/outbound-call-queue";

export type OutboundCallHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  checkedAt: string;
  lookbackMinutes: number;
  totalAttempts: number;
  completedAttempts: number;
  failedAttempts: number;
  inProgressAttempts: number;
  staleInProgressAttempts: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  recentFailures: Array<{
    idempotencyKey: string;
    createdAt: string;
    error: string | null;
  }>;
};

export async function getOutboundCallHealth(options?: {
  lookbackMinutes?: number;
  staleInProgressMinutes?: number;
  limit?: number;
}): Promise<OutboundCallHealth> {
  const checkedAt = new Date();
  const lookbackMinutes = options?.lookbackMinutes ?? 180;
  const staleInProgressMinutes = options?.staleInProgressMinutes ?? 3;
  const limit = options?.limit ?? 50;

  if (!isDatabaseConfigured) {
    return {
      status: "degraded",
      summary: "Outbound call health cannot be checked because the database is not configured.",
      warnings: ["DATABASE_URL is missing, so queued outbound call outcomes cannot be monitored."],
      checkedAt: checkedAt.toISOString(),
      lookbackMinutes,
      totalAttempts: 0,
      completedAttempts: 0,
      failedAttempts: 0,
      inProgressAttempts: 0,
      staleInProgressAttempts: 0,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      recentFailures: [],
    };
  }

  const since = new Date(checkedAt.getTime() - lookbackMinutes * 60_000);
  const staleSince = new Date(checkedAt.getTime() - staleInProgressMinutes * 60_000);
  const attempts = await db.actionExecution.findMany({
    where: {
      actionType: VOICE_OUTBOUND_CALL_ACTION_TYPE,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      idempotencyKey: true,
      status: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const completedAttempts = attempts.filter((attempt) => attempt.status === "COMPLETED");
  const failedAttempts = attempts.filter((attempt) => attempt.status === "FAILED");
  const inProgressAttempts = attempts.filter((attempt) => attempt.status === "IN_PROGRESS");
  const staleInProgressAttempts = inProgressAttempts.filter((attempt) => attempt.updatedAt <= staleSince);

  const warnings: string[] = [];
  if (staleInProgressAttempts.length > 0) {
    warnings.push(
      `${staleInProgressAttempts.length} queued outbound call request(s) have been stuck in progress for at least ${staleInProgressMinutes} minute(s).`,
    );
  }
  if (failedAttempts.length > 0) {
    warnings.push(`${failedAttempts.length} recent queued outbound call request(s) failed.`);
  }

  let status: RuntimeStatus = "healthy";
  let summary = `No queued outbound calls were recorded in the last ${lookbackMinutes} minute(s).`;

  if (attempts.length > 0) {
    if (staleInProgressAttempts.length > 0 || (failedAttempts.length > 0 && completedAttempts.length === 0)) {
      status = "unhealthy";
      summary = staleInProgressAttempts.length > 0
        ? warnings[0] || "Queued outbound calls are stuck in progress."
        : `${failedAttempts.length} recent queued outbound call request(s) failed and none succeeded.`;
    } else if (failedAttempts.length > 0) {
      status = "degraded";
      summary = `${failedAttempts.length} recent queued outbound call request(s) failed, but at least one succeeded.`;
    } else {
      summary = `Queued outbound calls are succeeding in the last ${lookbackMinutes} minute(s).`;
    }
  }

  return {
    status,
    summary,
    warnings,
    checkedAt: checkedAt.toISOString(),
    lookbackMinutes,
    totalAttempts: attempts.length,
    completedAttempts: completedAttempts.length,
    failedAttempts: failedAttempts.length,
    inProgressAttempts: inProgressAttempts.length,
    staleInProgressAttempts: staleInProgressAttempts.length,
    lastAttemptAt: attempts[0]?.createdAt.toISOString() || null,
    lastSuccessAt: completedAttempts[0]?.createdAt.toISOString() || null,
    lastFailureAt: failedAttempts[0]?.createdAt.toISOString() || null,
    recentFailures: failedAttempts.slice(0, 5).map((attempt) => ({
      idempotencyKey: attempt.idempotencyKey,
      createdAt: attempt.createdAt.toISOString(),
      error: attempt.error,
    })),
  };
}
