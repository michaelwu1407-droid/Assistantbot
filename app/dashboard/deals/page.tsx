import { redirect } from "next/navigation"
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUser } from "@/lib/auth"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DealsPage() {
    const authUser = await getAuthUser()
    if (!authUser) redirect("/login")

    let workspace, deals
    try {
        workspace = await getOrCreateWorkspace(authUser.id)
        deals = await getDeals(workspace.id)
    } catch {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="max-w-sm w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2">
                    <h3 className="text-sm font-semibold text-amber-800">Database connection unavailable</h3>
                    <p className="text-xs text-amber-600">Could not load deals. Please try again later.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
                    <p className="text-sm text-slate-500">{deals.length} deals worth ${deals.reduce((s, d) => s + d.value, 0).toLocaleString()}</p>
                </div>
                <Link href="/dashboard">
                    <Button variant="outline" size="sm">Back to Dashboard</Button>
                </Link>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
                <KanbanBoard deals={deals} industryType={workspace.industryType} />
            </div>
        </div>
    )
}
