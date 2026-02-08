"use client"

import { Shell } from "@/components/layout/Shell"
import { DashboardProvider } from "@/components/providers/dashboard-provider"
import { SyncProvider } from "@/components/providers/sync-provider"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <DashboardProvider>
            <SyncProvider>
                <Shell>
                    {children}
                </Shell>
            </SyncProvider>
        </DashboardProvider>
    )
}
