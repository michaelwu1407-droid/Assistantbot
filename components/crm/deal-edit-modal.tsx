"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DealEditForm } from "@/app/crm/deals/[id]/edit/deal-edit-form"
import { getDealRecurrence, type RecurrenceRule } from "@/actions/deal-actions"
import { getTeamMembers } from "@/actions/invite-actions"
import { PRISMA_STAGE_TO_UI_STAGE, STAGE_OPTIONS } from "@/lib/deal-utils"
import { resolveWorkspaceTimezone, toDateTimeLocalValue } from "@/lib/timezone"

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
}

interface DealEditModalProps {
  dealId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDealUpdated?: () => void
  currentUserRole?: string
}

interface LoadedData {
  title: string
  value: number
  stage: string
  notes: string
  address: string
  scheduledAt: string
  assignedToId: string
  workspaceTimezone: string
  teamMembers: TeamMember[]
  recurrence: RecurrenceRule | null
}

export function DealEditModal({ dealId, open, onOpenChange, onDealUpdated, currentUserRole = "TEAM_MEMBER" }: DealEditModalProps) {
  const [data, setData] = useState<LoadedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dealId || !open) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setData(null)
        setError(null)
      }
    })

    const canManageAssignment = currentUserRole !== "TEAM_MEMBER"

    Promise.all([
      fetch(`/api/deals/${dealId}`).then((r) => r.json()),
      canManageAssignment ? getTeamMembers() : Promise.resolve([]),
      getDealRecurrence(dealId),
    ])
      .then(([json, teamMembers, recurrence]) => {
        if (cancelled) return
        const deal = json.deal
        if (!deal) { setError("Deal not found"); setLoading(false); return }
        const tz = resolveWorkspaceTimezone(deal.workspace?.workspaceTimezone)
        const metadata = (deal.metadata || {}) as Record<string, unknown>
        setData({
          title: deal.title ?? "",
          value: Number(deal.value ?? 0),
          stage: PRISMA_STAGE_TO_UI_STAGE[deal.stage as string] ?? "new_request",
          notes: typeof metadata.notes === "string" ? metadata.notes : "",
          address: deal.address ?? "",
          scheduledAt: toDateTimeLocalValue(deal.scheduledAt, tz),
          assignedToId: deal.assignedToId ?? "",
          workspaceTimezone: tz,
          teamMembers: teamMembers as TeamMember[],
          recurrence,
        })
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError("Failed to load deal"); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [dealId, open, currentUserRole])

  function handleSaved() {
    onOpenChange(false)
    onDealUpdated?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ott-dialog max-w-lg flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Edit job</DialogTitle>
        <DialogDescription className="sr-only">
          Update this job's title, value, stage, and team-member assignment.
        </DialogDescription>
        <div className="overflow-y-auto p-6">
          {loading && <p className="app-body-secondary py-8 text-center">Loading…</p>}
          {error && <p className="app-body-secondary py-8 text-center text-destructive">{error}</p>}
          {data && dealId && (
            <DealEditForm
              dealId={dealId}
              initialTitle={data.title}
              initialValue={data.value}
              initialStage={data.stage}
              initialNotes={data.notes}
              initialAddress={data.address}
              initialScheduledAt={data.scheduledAt}
              initialAssignedToId={data.assignedToId}
              workspaceTimezone={data.workspaceTimezone}
              teamMembers={data.teamMembers}
              canManageAssignment={currentUserRole !== "TEAM_MEMBER"}
              stageOptions={STAGE_OPTIONS}
              initialRecurrence={data.recurrence}
              onSaved={handleSaved}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
