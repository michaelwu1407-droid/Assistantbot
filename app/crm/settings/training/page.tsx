import { Separator } from "@/components/ui/separator"
import { getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace, getWorkspaceWithSettings } from "@/actions/workspace-actions"
import { db } from "@/lib/db"
import { TrainingTabs } from "./training-tabs"

export const dynamic = "force-dynamic"

export default async function TeachTraceyPage() {
  const userId = (await getAuthUserId()) as string;
  const workspace = await getOrCreateWorkspace(userId)
  const workspaceWithSettings = await getWorkspaceWithSettings(workspace.id)

  const documents = await db.businessDocument.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  })

  const callOutFee = (workspaceWithSettings as { callOutFee?: number })?.callOutFee ?? 0
  const agentMode = (workspaceWithSettings as { agentMode?: string })?.agentMode ?? "DRAFT"
  const aiPreferences = (workspaceWithSettings as { aiPreferences?: string })?.aiPreferences ?? ""
  const workingHoursStart = (workspaceWithSettings as { workingHoursStart?: string })?.workingHoursStart ?? "08:00"
  const workingHoursEnd = (workspaceWithSettings as { workingHoursEnd?: string })?.workingHoursEnd ?? "17:00"

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Teach Tracey</h3>
        <p className="text-sm text-slate-500">
          Everything Tracey needs to represent your business accurately — services, pricing, rules, and documents.
        </p>
      </div>
      <Separator />

      <TrainingTabs
        callOutFee={callOutFee}
        agentMode={agentMode}
        aiPreferences={aiPreferences}
        workingHoursStart={workingHoursStart}
        workingHoursEnd={workingHoursEnd}
        documents={(documents ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          fileUrl: d.fileUrl,
          fileType: d.fileType ?? null,
        }))}
      />
    </div>
  )
}
