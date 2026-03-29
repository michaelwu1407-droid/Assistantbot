"use client"

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useShellStore } from "@/lib/store"
import { Header } from "@/components/dashboard/header"
import { ActivityModal } from "@/components/modals/activity-modal"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DashboardHeaderExtraContext } from "@/components/dashboard/dashboard-header-extra-context"
import { isNewJobStage, type NewJobStage } from "@/lib/deal-utils"

/**
 * Brand top bar (search, New Job, notifications, profile) on all dashboard routes
 * except `/crm/settings/*`. Settings keeps its own layout.
 */
export function DashboardMainChrome({ children }: { children: ReactNode }) {
    const isHydrated = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    )
    const pathname = usePathname()
    const isSettings = pathname.startsWith("/crm/settings")
    const [headerExtra, setHeaderExtra] = useState<ReactNode>(null)
    const [activityOpen, setActivityOpen] = useState(false)
    const [newDealOpen, setNewDealOpen] = useState(false)
    const [newDealInitialStage, setNewDealInitialStage] = useState<NewJobStage>("new_request")

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

    useEffect(() => {
        const handleOpenNewDeal = (event: Event) => {
            const requestedStage = (event as CustomEvent<{ initialStage?: string }>).detail?.initialStage
            setNewDealInitialStage(requestedStage && isNewJobStage(requestedStage) ? requestedStage : "new_request")
            setNewDealOpen(true)
        }

        window.addEventListener("open-new-deal-modal", handleOpenNewDeal as EventListener)
        return () => window.removeEventListener("open-new-deal-modal", handleOpenNewDeal as EventListener)
    }, [])

    if (isSettings) {
        return <>{children}</>
    }

    const canRenderHeader = isHydrated && Boolean(workspaceId && userId)
    const hydratedWorkspaceId = workspaceId ?? ""
    const hydratedUserId = userId ?? ""

    const headerActions = (
        <>
            <Button
                id="new-deal-btn"
                type="button"
                size="toolbar"
                onClick={() => {
                    setNewDealInitialStage("new_request")
                    setNewDealOpen(true)
                }}
                className="min-w-[6.25rem] max-w-[7rem] truncate px-4"
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
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {canRenderHeader && (
                    <div className="sticky top-0 z-20 shrink-0">
                        <Header
                            variant="brand"
                            userName={userNameForHeader}
                            userId={hydratedUserId}
                            workspaceId={hydratedWorkspaceId}
                            userRole={userRole}
                            onOpenActivity={() => setActivityOpen(true)}
                            headerActions={headerActions}
                        />
                    </div>
                )}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
                {canRenderHeader && (
                    <>
                    <NewDealModal isOpen={newDealOpen} onClose={() => setNewDealOpen(false)} workspaceId={hydratedWorkspaceId} initialStage={newDealInitialStage} />
                    <ActivityModal isOpen={activityOpen} onClose={() => setActivityOpen(false)} workspaceId={hydratedWorkspaceId} />
                    </>
                )}
            </div>
        </DashboardHeaderExtraContext.Provider>
    )
}
