import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DealHealthWidget } from "@/components/crm/deal-health-widget"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    // In a real app, we'd get the user ID from the session
    const workspace = await getOrCreateWorkspace("demo-user")
    const deals = await getDeals(workspace.id)

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
                    <p className="text-sm text-slate-500">Manage your deals and activity</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Deal
                </Button>
            </div>

            {/* Health Widget */}
            <DealHealthWidget deals={deals} />

            {/* Main Content Area */}
            <div className="flex-1 w-full flex gap-6 overflow-hidden min-h-0">
                {/* Left: Kanban Board */}
                <div className="flex-1 min-w-[300px] h-full overflow-hidden">
                    <KanbanBoard deals={deals} />
                </div>

                {/* Right: Activity Feed / Widgets */}
                <div className="hidden xl:block w-[350px] shrink-0 h-full overflow-hidden">
                    {/* Pass workspaceId to feed so it can fetch its own data */}
                    <ActivityFeed />
                </div>
            </div>
        </div>
    )
}
