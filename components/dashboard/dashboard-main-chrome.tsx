"use client"

import { useMemo, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useShellStore } from "@/lib/store"
import { Header } from "@/components/dashboard/header"
import { ActivityModal } from "@/components/modals/activity-modal"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DashboardHeaderExtraContext } from "@/components/dashboard/dashboard-header-extra-context"

/**
 * Brand top bar (search, New Job, notifications, profile) on all dashboard routes
 * except `/crm/settings/*`. Settings keeps its own layout.
 */
export function DashboardMainChrome({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const isSettings = pathname.startsWith("/crm/settings")
    const [headerExtra, setHeaderExtra] = useState<ReactNode>(null)
    const [activityOpen, setActivityOpen] = useState(false)
    const [newDealOpen, setNewDealOpen] = useState(false)

    const workspaceId = useShellStore((s) => s.workspaceId)
    const userId = useShellStore((s) => s.userId)
    const userRole = useShellStore((s) => s.userRole)
    const headerDisplayName = useShellStore((s) => s.headerDisplayName)
    const industry = useShellStore((s) => s.workspaceIndustryType)

    const newDealLabel = useMemo(() => {
        if (industry === "TRADES") return "New Job"
        if (industry === "REAL_ESTATE") return "New Listing"
        return "New Deal"
    }, [industry])

    const userNameForHeader = headerDisplayName?.trim() || (userId ? userId.slice(0, 8) : "User")

    if (isSettings) {
        return <>{children}</>
    }

    const headerActions = (
        <>
            <Button
                id="new-deal-btn"
                type="button"
                onClick={() => setNewDealOpen(true)}
                className="h-9 min-h-9 min-w-[4.75rem] max-w-[4.75rem] px-2.5 text-xs font-bold truncate"
            >
                <Plus className="h-3.5 w-3.5 mr-0.5 shrink-0" />
                {newDealLabel}
            </Button>
            {headerExtra}
        </>
    )

    /* Always provide header-extra context when not on Settings so DashboardClient (and similar) never mounts without the provider — store can be briefly empty before ShellInitializer runs. */
    return (
        <DashboardHeaderExtraContext.Provider value={setHeaderExtra}>
            {workspaceId && userId ? (
                <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="sticky top-0 z-20 shrink-0">
                        <Header
                            variant="brand"
                        userName={userNameForHeader}
                        userId={userId}
                        workspaceId={workspaceId}
                            userRole={userRole}
                            onOpenActivity={() => setActivityOpen(true)}
                            headerActions={headerActions}
                        />
                    </div>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden flex flex-col">{children}</div>
                    <NewDealModal isOpen={newDealOpen} onClose={() => setNewDealOpen(false)} workspaceId={workspaceId} />
                    <ActivityModal isOpen={activityOpen} onClose={() => setActivityOpen(false)} workspaceId={workspaceId} />
                </div>
            ) : (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
            )}
        </DashboardHeaderExtraContext.Provider>
    )
}
