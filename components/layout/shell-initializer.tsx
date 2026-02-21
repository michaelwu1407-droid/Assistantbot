"use client"

import { useEffect } from "react"
import { useShellStore } from "@/lib/store"

interface ShellInitializerProps {
    workspaceId: string
    userId: string
    tutorialComplete: boolean
}

/**
 * Invisible client component that syncs server-side auth data
 * into the Zustand store. Rendered once in dashboard layouts.
 */
export function ShellInitializer({ workspaceId, userId, tutorialComplete }: ShellInitializerProps) {
    const setWorkspaceId = useShellStore(s => s.setWorkspaceId)
    const setUserId = useShellStore(s => s.setUserId)
    const setViewMode = useShellStore(s => s.setViewMode)

    useEffect(() => {
        setWorkspaceId(workspaceId)
        setUserId(userId)

        // Explicity trigger tutorial on hard-loads if incomplete.
        if (!tutorialComplete) {
            setViewMode("TUTORIAL")
        }
    }, [workspaceId, userId, tutorialComplete, setWorkspaceId, setUserId, setViewMode])

    return null
}
