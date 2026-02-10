"use client"

import { useEffect } from "react"
import { useShellStore } from "@/lib/store"

interface ShellInitializerProps {
    workspaceId: string
    userId: string
}

/**
 * Invisible client component that syncs server-side auth data
 * into the Zustand store. Rendered once in dashboard layouts.
 */
export function ShellInitializer({ workspaceId, userId }: ShellInitializerProps) {
    const setWorkspaceId = useShellStore(s => s.setWorkspaceId)
    const setUserId = useShellStore(s => s.setUserId)

    useEffect(() => {
        setWorkspaceId(workspaceId)
        setUserId(userId)
    }, [workspaceId, userId, setWorkspaceId, setUserId])

    return null
}
