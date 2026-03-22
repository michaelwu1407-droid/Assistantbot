"use client"

import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react"

/** No-op when no Provider (should not happen in CRM shell; avoids hard crash if tree order or HMR glitches). */
const noopSetHeaderExtra: Dispatch<SetStateAction<ReactNode>> = () => {}

/** Optional slot next to “New Job” on the brand header (e.g. Kanban filter on /crm only). */
export const DashboardHeaderExtraContext =
    createContext<Dispatch<SetStateAction<ReactNode>>>(noopSetHeaderExtra)

export function useDashboardHeaderExtraSetter() {
    return useContext(DashboardHeaderExtraContext)
}
