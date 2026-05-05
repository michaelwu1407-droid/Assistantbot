import { Separator } from "@/components/ui/separator"
import { AutomationList } from "./automation-list"
import { getAutomations } from "@/actions/automation-actions"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AutomationsPage() {
    let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>
    try {
        actor = await requireCurrentWorkspaceAccess()
    } catch {
        redirect("/auth")
    }

    const automations = await getAutomations(actor.workspaceId)

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Automations</h3>
                <p className="text-sm text-muted-foreground">
                    Configure &quot;If This Then That&quot; rules to automate your workflow.
                </p>
            </div>
            <Separator />
            <AutomationList initialAutomations={automations} workspaceId={actor.workspaceId} />
        </div>
    )
}

