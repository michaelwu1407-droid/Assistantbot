import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shouldSendNotificationEmail } from "@/actions/notification-actions";
import { sendOwnerNotificationEmail } from "@/lib/owner-notification-email";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { formatCurrency } from "@/lib/format";

/**
 * Cron endpoint: Send weekly summary emails to workspace owners.
 * Run once per week (e.g. Monday 8 AM via GitHub Actions workflow).
 */
export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const workspaces = await db.workspace.findMany({
    where: { subscriptionStatus: { in: ["active", "trialing"] } },
    select: { id: true, name: true },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const workspace of workspaces) {
    try {
      const enabled = await shouldSendNotificationEmail(workspace.id, "emailWeeklySummary");
      if (!enabled) {
        skipped++;
        continue;
      }

      const [newContacts, completedDeals, activeDeals, weekRevenue] = await Promise.all([
        db.contact.count({
          where: { workspaceId: workspace.id, createdAt: { gte: sevenDaysAgo } },
        }),
        db.deal.count({
          where: { workspaceId: workspace.id, stage: "COMPLETED", updatedAt: { gte: sevenDaysAgo } },
        }),
        db.deal.count({
          where: { workspaceId: workspace.id, stage: { notIn: ["COMPLETED", "LOST", "DELETED"] } },
        }),
        db.deal.aggregate({
          where: {
            workspaceId: workspace.id,
            stage: "COMPLETED",
            updatedAt: { gte: sevenDaysAgo },
            value: { not: null },
          },
          _sum: { value: true },
        }),
      ]);

      const revenueNum = weekRevenue._sum.value ? Number(weekRevenue._sum.value) : 0;
      const revenueStr = revenueNum > 0 ? formatCurrency(revenueNum) : "—";

      const text = [
        `Hi, here's your weekly summary for ${workspace.name}:`,
        "",
        `New leads this week:   ${newContacts}`,
        `Jobs completed:        ${completedDeals}`,
        `Revenue invoiced:      ${revenueStr}`,
        `Jobs still in pipeline: ${activeDeals}`,
        "",
        "Keep it up — log in to see the full picture:",
        `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.earlymark.ai"}/crm/dashboard`,
        "",
        "You're receiving this because weekly summary emails are enabled.",
        "To turn them off: Settings → Notifications → Weekly summary.",
      ].join("\n");

      await sendOwnerNotificationEmail({
        workspaceId: workspace.id,
        subject: `Your week at a glance — ${workspace.name}`,
        text,
      });

      sent++;
    } catch (err) {
      errors.push(`${workspace.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors, timestamp: new Date().toISOString() });
}
