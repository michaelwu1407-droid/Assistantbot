import { Separator } from "@/components/ui/separator"
import { WorkspaceForm } from "./workspace-form"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
    const userId = await getAuthUserId();
    const workspace = await getOrCreateWorkspace(userId);

    return (
        <div className="space-y-6">
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
                    industry: workspace.industryType ?? "TRADES",
                    location: workspace.location ?? undefined,
                }}
            />
        </div>
    )
}
