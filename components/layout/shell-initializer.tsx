"use client"

import { useEffect } from "react"
import { useShellStore, type UserRole } from "@/lib/store"

interface ShellInitializerProps {
    workspaceId: string
    userId: string
    userRole: UserRole
    tutorialComplete: boolean
}

/**
 * Invisible client component that syncs server-side auth data
 * into the Zustand store. Rendered once in dashboard layouts.
 */
export function ShellInitializer({ workspaceId, userId, userRole, tutorialComplete }: ShellInitializerProps) {
    const setWorkspaceId = useShellStore(s => s.setWorkspaceId)
    const setUserId = useShellStore(s => s.setUserId)
    const setUserRole = useShellStore(s => s.setUserRole)
    const setViewMode = useShellStore(s => s.setViewMode)

    useEffect(() => {
        setWorkspaceId(workspaceId)
        setUserId(userId)
        setUserRole(userRole)

        // Explicity trigger tutorial on hard-loads if incomplete.
        if (!tutorialComplete) {
            setViewMode("TUTORIAL")
        }
    }, [workspaceId, userId, userRole, tutorialComplete, setWorkspaceId, setUserId, setUserRole, setViewMode])

    return null
}
