import { db } from "@/lib/db"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"
import { getTeamMembers } from "@/actions/invite-actions"
import { DealEditForm } from "./deal-edit-form"
import { PRISMA_STAGE_TO_UI_STAGE, STAGE_OPTIONS } from "@/lib/deal-utils"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealEditPage({ params }: PageProps) {
  const { id } = await params
  const actor = await requireCurrentWorkspaceAccess()

  const [deal, teamMembers] = await Promise.all([
    db.deal.findFirst({
      where: { id, workspaceId: actor.workspaceId },
      include: { contact: true, assignedTo: { select: { id: true, name: true } } },
    }),
    getTeamMembers(),
  ])

  if (!deal) notFound()

  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (typeof metadata.notes === "string" ? metadata.notes : "") ?? ""

  const stage = PRISMA_STAGE_TO_UI_STAGE[deal.stage] ?? "new_request"

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 md:p-6 gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/crm" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <Link href={`/crm/deals/${id}`} className="hover:text-slate-900 transition-colors">
          Job
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-900">Edit</span>
      </nav>

      <div className="flex items-center gap-4">
        <Link
          href={`/crm/deals/${id}`}
          className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors"
          aria-label="Back to job details"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Edit deal</h1>
      </div>

      <DealEditForm
        dealId={id}
        initialTitle={deal.title}
        initialValue={Number(deal.value ?? 0)}
        initialStage={stage}
        initialNotes={notes}
        initialAddress={deal.address ?? ""}
        initialScheduledAt={deal.scheduledAt ? new Date(deal.scheduledAt).toISOString().slice(0, 16) : ""}
        initialAssignedToId={deal.assignedToId ?? ""}
        teamMembers={teamMembers}
        stageOptions={STAGE_OPTIONS}
      />
    </div>
  )
}
