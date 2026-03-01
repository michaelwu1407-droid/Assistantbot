import { Separator } from "@/components/ui/separator"
import { WorkspaceForm } from "./workspace-form"
import { PipelineHealthForm } from "./pipeline-health-form"
import { getOrCreateWorkspace, getWorkspaceWithSettings } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
    const userId = (await getAuthUserId()) as string;
    const workspace = await getOrCreateWorkspace(userId);
    const workspaceWithSettings = await getWorkspaceWithSettings(workspace.id);
    const profile = await db.businessProfile.findUnique({
        where: { userId },
        select: { tradeType: true },
    })

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium">Workspace</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your workspace details and branding.
                </p>
            </div>
            <Separator />
            <WorkspaceForm
                workspaceId={workspace.id}
                initialData={{
                    name: workspace.name,
                    specialty: profile?.tradeType ?? "Plumber",
                    location: workspace.location ?? undefined,
                }}
            />
            <div>
                <h3 className="text-lg font-medium">Pipeline health</h3>
                <p className="text-sm text-muted-foreground">
                    Set how many days without activity before a deal shows as Follow up or Urgent on the board.
                </p>
            </div>
            <Separator />
            <PipelineHealthForm
                workspaceId={workspace.id}
                initialSettings={workspaceWithSettings?.settings ?? {}}
            />
        </div>
    )
}


