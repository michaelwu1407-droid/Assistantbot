"use client"

import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { useDashboard } from "@/components/providers/dashboard-provider"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { subDays } from "date-fns"

const MOCK_DEALS = [
    {
        id: "1",
        title: "Website Redesign",
        company: "Acme Corp",
        value: 5000,
        stage: "new",
        lastActivityDate: new Date(),
        contactName: "John Doe",
    },
    {
        id: "2",
        title: "Mobile App Phase 1",
        company: "Stark Ind",
        value: 12000,
        stage: "contacted",
        lastActivityDate: subDays(new Date(), 2),
        contactName: "Tony Stark",
    },
    {
        id: "3",
        title: "Consulting Retainer",
        company: "Wayne Ent",
        value: 2000,
        stage: "negotiation",
        lastActivityDate: subDays(new Date(), 8), // Stale (Amber)
        contactName: "Bruce Wayne",
    },
    {
        id: "4",
        title: "Legacy Migration",
        company: "Cyberdyne",
        value: 45000,
        stage: "negotiation",
        lastActivityDate: subDays(new Date(), 15), // Rotting (Red)
        contactName: "Sarah Connor",
    },
    {
        id: "5",
        title: "Q1 Campaign",
        company: "Massive Dynamic",
        value: 8500,
        stage: "won",
        lastActivityDate: subDays(new Date(), 3),
        contactName: "Nina Sharp",
    },
]

export default function DashboardPage() {
    const { mode } = useDashboard()

    if (mode === "chat") {
        // In Chat Mode, the main canvas is hidden or effectively empty to let the Assistant Pane (expanded) take focus.
        // However, we still render a skeleton or minimal view structure behind it or just return null if width is 0.
        // Our layout handles width=0, but we can also return visible content that gets squeezed.
        return (
            <div className="h-full flex items-center justify-center opacity-50">
                <p className="text-slate-400">Focusing on Chat...</p>
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

            {/* Main Content Area */}
            <div className="flex-1 w-full flex gap-6 overflow-hidden min-h-0">
                {/* Left: Kanban Board (70% approx) */}
                <div className="flex-1 min-w-[300px] h-full overflow-hidden">
                    <KanbanBoard deals={MOCK_DEALS} />
                </div>

                {/* Right: Activity Feed / Widgets (30% approx) - Hidden on small screens */}
                <div className="hidden xl:block w-[350px] shrink-0 h-full overflow-hidden">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    )
}
