"use server";

import { db } from "@/lib/db";

export interface WebhookDiagnostic {
  provider: string;
  lastSuccess: string | null;
  lastError: string | null;
  successCount: number;
  errorCount: number;
  recentEvents: {
    id: string;
    eventType: string;
    status: string;
    error: string | null;
    createdAt: Date;
  }[];
}

/**
 * Fetches webhook diagnostics for the admin dashboard.
 * Returns last-seen timestamps and recent events per provider.
 */
export async function getWebhookDiagnostics(): Promise<WebhookDiagnostic[]> {
  const providers = ["stripe", "resend"];

  const results: WebhookDiagnostic[] = [];

  for (const provider of providers) {
    const [lastSuccess, lastError, successCount, errorCount, recentEvents] =
      await Promise.all([
        db.webhookEvent.findFirst({
          where: { provider, status: "success" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        db.webhookEvent.findFirst({
          where: { provider, status: "error" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        db.webhookEvent.count({
          where: { provider, status: "success" },
        }),
        db.webhookEvent.count({
          where: { provider, status: "error" },
        }),
        db.webhookEvent.findMany({
          where: { provider },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            eventType: true,
            status: true,
            error: true,
            createdAt: true,
          },
        }),
      ]);

    results.push({
      provider,
      lastSuccess: lastSuccess?.createdAt.toISOString() ?? null,
      lastError: lastError?.createdAt.toISOString() ?? null,
      successCount,
      errorCount,
      recentEvents,
    });
  }

  return results;
}
