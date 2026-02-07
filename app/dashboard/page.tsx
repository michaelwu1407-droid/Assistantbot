import { redirect } from "next/navigation"
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DealHealthWidget } from "@/components/crm/deal-health-widget"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    let workspace, deals;
    try {
        workspace = await getOrCreateWorkspace("demo-user")
        if (!workspace.onboardingComplete) {
            redirect("/setup")
        }
        deals = await getDeals(workspace.id)
    } catch {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Database Not Initialized</h2>
                    <p className="text-slate-500">
                        The database tables have not been created yet. Run these commands with your Supabase DIRECT_URL:
                    </p>
                    <pre className="bg-slate-100 text-slate-800 p-4 rounded-lg text-left text-sm overflow-x-auto">
{`DATABASE_URL="your-direct-url" \\
  npx prisma@6 db push

DATABASE_URL="your-direct-url" \\
  npx prisma@6 db seed`}
                    </pre>
                    <p className="text-xs text-slate-400">
                        Use the DIRECT_URL (port 5432), not the pooler URL.
                    </p>
                </div>
            </div>
        )
    }

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
                    <ActivityFeed />
                </div>
            </div>
        </div>
    )
}
