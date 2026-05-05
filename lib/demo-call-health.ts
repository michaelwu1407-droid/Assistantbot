import { db, isDatabaseConfigured } from "@/lib/db";
import { isDemoCallValidationMessage } from "@/lib/demo-call-errors";
import type { RuntimeStatus } from "@/lib/voice-fleet";

export type DemoCallHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  checkedAt: string;
  lookbackMinutes: number;
  totalAttempts: number;
  initiatedAttempts: number;
  failedAttempts: number;
  validationFailures: number;
  systemFailures: number;
  stalePendingAttempts: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  sourceCounts: Record<string, number>;
  recentFailures: Array<{
    id: string;
    source: string;
    createdAt: string;
    callError: string | null;
  }>;
};

export async function getDemoCallHealth(options?: {
  lookbackMinutes?: number;
  stalePendingMinutes?: number;
  limit?: number;
}): Promise<DemoCallHealth> {
  const checkedAt = new Date();
  const lookbackMinutes = options?.lookbackMinutes ?? 180;
  const stalePendingMinutes = options?.stalePendingMinutes ?? 5;
  const limit = options?.limit ?? 50;

  if (!isDatabaseConfigured) {
    return {
      status: "degraded",
      summary: "Demo callback health cannot be checked because the database is not configured.",
      warnings: ["DATABASE_URL is missing, so recent demo callback outcomes cannot be monitored."],
      checkedAt: checkedAt.toISOString(),
      lookbackMinutes,
      totalAttempts: 0,
      initiatedAttempts: 0,
      failedAttempts: 0,
      validationFailures: 0,
      systemFailures: 0,
      stalePendingAttempts: 0,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      sourceCounts: {},
      recentFailures: [],
    };
  }

  const since = new Date(checkedAt.getTime() - lookbackMinutes * 60_000);
  const stalePendingSince = new Date(checkedAt.getTime() - stalePendingMinutes * 60_000);
  const attempts = await db.demoLead.findMany({
    where: {
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      source: true,
      callStatus: true,
      callError: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const initiatedAttempts = attempts.filter((attempt) => attempt.callStatus === "INITIATED");
  const failedAttempts = attempts.filter((attempt) => attempt.callStatus === "FAILED");
  const validationFailures = failedAttempts.filter((attempt) => isDemoCallValidationMessage(attempt.callError || ""));
  const systemFailures = failedAttempts.filter((attempt) => !isDemoCallValidationMessage(attempt.callError || ""));
  const stalePendingAttempts = attempts.filter(
    (attempt) => attempt.callStatus === "PENDING" && attempt.updatedAt <= stalePendingSince,
  );
  const sourceCounts = attempts.reduce<Record<string, number>>((counts, attempt) => {
    counts[attempt.source] = (counts[attempt.source] || 0) + 1;
    return counts;
  }, {});

  const warnings: string[] = [];
  if (stalePendingAttempts.length > 0) {
    warnings.push(
      `${stalePendingAttempts.length} demo callback attempt(s) have been stuck in PENDING for at least ${stalePendingMinutes} minute(s).`,
    );
  }
  if (systemFailures.length > 0) {
    warnings.push(
      `${systemFailures.length} recent demo callback attempt(s) failed with system errors.`,
    );
  }
  if (validationFailures.length > 0) {
    warnings.push(
      `${validationFailures.length} recent demo callback attempt(s) were rejected because the phone number was invalid.`,
    );
  }

  let status: RuntimeStatus = "healthy";
  let summary = `No public demo callback attempts were recorded in the last ${lookbackMinutes} minute(s).`;

  if (attempts.length > 0) {
    if (stalePendingAttempts.length > 0 || (systemFailures.length > 0 && initiatedAttempts.length === 0)) {
      status = "unhealthy";
      summary =
        stalePendingAttempts.length > 0
          ? warnings[0] || "Recent demo callback attempts are stuck in PENDING."
          : `${systemFailures.length} recent public demo callback attempt(s) failed and none succeeded.`;
    } else if (systemFailures.length > 0) {
      status = "degraded";
      summary = `${systemFailures.length} recent public demo callback attempt(s) failed, but at least one succeeded.`;
    } else if (validationFailures.length > 0 && initiatedAttempts.length === 0) {
      summary = "Recent public demo callback attempts were rejected for invalid phone input, but the callback service itself did not show system failures.";
    } else {
      summary = `Public demo callback attempts are succeeding in the last ${lookbackMinutes} minute(s).`;
    }
  }

  return {
    status,
    summary,
    warnings,
    checkedAt: checkedAt.toISOString(),
    lookbackMinutes,
    totalAttempts: attempts.length,
    initiatedAttempts: initiatedAttempts.length,
    failedAttempts: failedAttempts.length,
    validationFailures: validationFailures.length,
    systemFailures: systemFailures.length,
    stalePendingAttempts: stalePendingAttempts.length,
    lastAttemptAt: attempts[0]?.createdAt.toISOString() || null,
    lastSuccessAt: initiatedAttempts[0]?.createdAt.toISOString() || null,
    lastFailureAt: failedAttempts[0]?.createdAt.toISOString() || null,
    sourceCounts,
    recentFailures: systemFailures.slice(0, 5).map((attempt) => ({
      id: attempt.id,
      source: attempt.source,
      createdAt: attempt.createdAt.toISOString(),
      callError: attempt.callError,
    })),
  };
}
