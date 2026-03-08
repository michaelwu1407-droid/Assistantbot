import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getTeamMembers } from "@/actions/invite-actions"
import { DealEditForm } from "./deal-edit-form"
import { STAGE_OPTIONS } from "@/lib/deal-utils"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealEditPage({ params }: PageProps) {
  const { id } = await params

  const [deal, teamMembers] = await Promise.all([
    db.deal.findUnique({
      where: { id },
      include: { contact: true, assignedTo: { select: { id: true, name: true } } },
    }),
    getTeamMembers(),
  ])

  if (!deal) notFound()

  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (typeof metadata.notes === "string" ? metadata.notes : "") ?? ""

  const stageMap: Record<string, string> = {
    NEW: "new_request",
    CONTACTED: "quote_sent",
    NEGOTIATION: "scheduled",
    SCHEDULED: "scheduled",
    PIPELINE: "pipeline",
    INVOICED: "ready_to_invoice",
    WON: "completed",
    LOST: "lost",
    DELETED: "deleted",
  }
  const stage = stageMap[deal.stage] ?? "new_request"

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 md:p-6 gap-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/deals/${id}`}
          className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors"
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
