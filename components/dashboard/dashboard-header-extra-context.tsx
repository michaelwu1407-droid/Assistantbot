"use client"

import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react"

/** Optional slot next to “New Job” on the brand header (e.g. Kanban filter on /crm only). */
export const DashboardHeaderExtraContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null)

export function useDashboardHeaderExtraSetter() {
    const set = useContext(DashboardHeaderExtraContext)
    if (!set) {
        throw new Error("useDashboardHeaderExtraSetter must be used inside DashboardMainChrome")
    }
    return set
}
