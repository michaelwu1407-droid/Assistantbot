import { redirect } from "next/navigation"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { getDeals } from "@/actions/deal-actions"
import { WrapUpClient } from "./wrap-up-client"
import { resolveWorkspaceTimezone, DEFAULT_WORKSPACE_TIMEZONE } from "@/lib/timezone"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function WrapUpPage() {
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

  const now = new Date()
  const todayStart = new Date(
    now.toLocaleDateString("en-CA", { timeZone: tz }) + "T00:00:00"
  )

  const doneToday = allDeals.filter((d) => {
    if (d.stage !== "completed") return false
    return new Date(d.stageChangedAt).getTime() >= todayStart.getTime()
  })

  const unpaidDeals = allDeals.filter((d) => d.stage === "ready_to_invoice")

  const staleQuotes = allDeals.filter((d) => {
    if (d.stage !== "quote_sent") return false
    const days = Math.floor((now.getTime() - new Date(d.lastActivityDate).getTime()) / 86_400_000)
    return days >= 3
  })

  return (
    <WrapUpClient
      doneToday={doneToday}
      unpaidDeals={unpaidDeals}
      staleQuotes={staleQuotes}
      timezone={tz}
    />
  )
}
