import { Separator } from "@/components/ui/separator"
import { AutomationList } from "./automation-list"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { getAutomations } from "@/actions/automation-actions"

export const dynamic = "force-dynamic"

export default async function AutomationsPage() {
    const userId = (await getAuthUserId()) as string;
    const workspace = await getOrCreateWorkspace(userId)
    const automations = await getAutomations(workspace.id)

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Automations</h3>
                <p className="text-sm text-muted-foreground">
                    Configure "If This Then That" rules to automate your workflow.
                </p>
            </div>
            <Separator />
            <AutomationList initialAutomations={automations} workspaceId={workspace.id} />
        </div>
    )
}

