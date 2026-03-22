"use client"

import { useLayoutEffect } from "react"
import { useShellStore, type UserRole } from "@/lib/store"

interface ShellInitializerProps {
    workspaceId: string
    userId: string
    userRole: UserRole
    tutorialComplete: boolean
    headerDisplayName: string
    workspaceIndustryType: "TRADES" | "REAL_ESTATE" | null
}

/**
 * Invisible client component that syncs server-side auth data
 * into the Zustand store. Rendered once in dashboard layouts.
 */
export function ShellInitializer({
    workspaceId,
    userId,
    userRole,
    tutorialComplete,
    headerDisplayName,
    workspaceIndustryType,
}: ShellInitializerProps) {
    const setWorkspaceId = useShellStore(s => s.setWorkspaceId)
    const setUserId = useShellStore(s => s.setUserId)
    const setUserRole = useShellStore(s => s.setUserRole)
    const setViewMode = useShellStore(s => s.setViewMode)
    const setHeaderDisplayName = useShellStore(s => s.setHeaderDisplayName)
    const setWorkspaceIndustryType = useShellStore(s => s.setWorkspaceIndustryType)

    /* Layout effect so workspace/user land before first paint of dashboard chrome */
    useLayoutEffect(() => {
        setWorkspaceId(workspaceId)
        setUserId(userId)
        setUserRole(userRole)
        setHeaderDisplayName(headerDisplayName)
        setWorkspaceIndustryType(workspaceIndustryType)
        if (!tutorialComplete) {
            setViewMode("TUTORIAL")
        }
    }, [
        workspaceId,
        userId,
        userRole,
        headerDisplayName,
        workspaceIndustryType,
        tutorialComplete,
        setWorkspaceId,
        setUserId,
        setUserRole,
        setHeaderDisplayName,
        setWorkspaceIndustryType,
        setViewMode,
    ])

    return null
}
