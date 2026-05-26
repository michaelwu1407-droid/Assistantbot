import { redirect } from "next/navigation"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { getDeals } from "@/actions/deal-actions"
import { RunSheetClient } from "./run-sheet-client"
import { resolveWorkspaceTimezone, DEFAULT_WORKSPACE_TIMEZONE } from "@/lib/timezone"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function RunSheetPage() {
  let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>
  try {
    actor = await requireCurrentWorkspaceAccess()
  } catch {
    redirect("/auth")
  }

  const tz = await db.workspace
    .findUnique({ where: { id: actor.workspaceId }, select: { workspaceTimezone: true } })
    .then((w) => resolveWorkspaceTimezone(w?.workspaceTimezone) ?? DEFAULT_WORKSPACE_TIMEZONE)

  const allDeals = await getDeals(actor.workspaceId)

  // Today in workspace timezone
  const now = new Date()
  const todayStart = new Date(
    now.toLocaleDateString("en-CA", { timeZone: tz }) + "T00:00:00"
  )
  const todayEnd = new Date(todayStart.getTime() + 86_400_000)

  const todaysJobs = allDeals
    .filter((d) => {
      if (!d.scheduledAt) return false
      if (d.stage === "completed" || d.stage === "deleted" || d.stage === "cancelled") return false
      const t = new Date(d.scheduledAt).getTime()
      return t >= todayStart.getTime() && t < todayEnd.getTime()
    })
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())

  return <RunSheetClient jobs={todaysJobs} timezone={tz} />
}
