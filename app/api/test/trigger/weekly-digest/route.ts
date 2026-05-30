import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { shouldSendNotificationEmail } from "@/actions/notification-actions"
import { sendOwnerNotificationEmail } from "@/lib/owner-notification-email"
import { formatCurrency } from "@/lib/format"

const isTestMode =
  process.env.NODE_ENV === "test" || process.env.E2E_MODE === "true"

/**
 * Test-only endpoint: trigger a weekly digest for a specific workspace.
 * Body: { workspaceId: string }
 */
export async function POST(req: NextRequest) {
  if (!isTestMode) {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const { workspaceId } = (await req.json()) as { workspaceId?: string }
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 })
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  })
  if (!workspace) {
    return NextResponse.json({ error: "workspace not found" }, { status: 404 })
  }

  const enabled = await shouldSendNotificationEmail(workspaceId, "emailWeeklySummary")
  if (!enabled) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [newContacts, completedDeals, activeDeals, weekRevenue] = await Promise.all([
    db.contact.count({ where: { workspaceId, createdAt: { gte: sevenDaysAgo } } }),
    db.deal.count({ where: { workspaceId, stage: "COMPLETED", updatedAt: { gte: sevenDaysAgo } } }),
    db.deal.count({ where: { workspaceId, stage: { notIn: ["COMPLETED", "LOST", "DELETED"] } } }),
    db.deal.aggregate({
      where: { workspaceId, stage: "COMPLETED", updatedAt: { gte: sevenDaysAgo }, value: { not: null } },
      _sum: { value: true },
    }),
  ])

  const revenueNum = weekRevenue._sum.value ? Number(weekRevenue._sum.value) : 0
  const revenueStr = revenueNum > 0 ? formatCurrency(revenueNum) : "—"

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
  ].join("\n")

  await sendOwnerNotificationEmail({
    workspaceId,
    subject: `Your week at a glance — ${workspace.name}`,
    text,
    template: "weekly-digest",
  })

  return NextResponse.json({ ok: true, skipped: false })
}
