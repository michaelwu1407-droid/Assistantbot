import { Separator } from "@/components/ui/separator"
import { DisplaySettingsClient } from "@/components/settings/display-settings-client"
import { getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace, getWorkspaceWithSettings } from "@/actions/workspace-actions"
import { PipelineHealthForm } from "@/app/crm/settings/workspace/pipeline-health-form"

export const dynamic = "force-dynamic"

export default async function DisplaySettingsPage() {
  const userId = (await getAuthUserId()) as string
  const workspace = await getOrCreateWorkspace(userId)
  const workspaceWithSettings = await getWorkspaceWithSettings(workspace.id)

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Display</h3>
        <p className="text-sm text-slate-500">
          Theme, language, accessibility, and mobile preferences.
        </p>
      </div>
      <Separator />
      <DisplaySettingsClient />
      <Separator />
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Pipeline health</h3>
          <p className="text-sm text-slate-500">
            Set when cards should surface as follow up or urgent on the board.
          </p>
        </div>
        <PipelineHealthForm
          workspaceId={workspace.id}
          initialSettings={workspaceWithSettings?.settings ?? {}}
        />
      </section>
    </div>
  )
}
