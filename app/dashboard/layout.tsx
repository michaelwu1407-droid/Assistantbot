"use client"

import { Shell } from "@/components/layout/Shell"
import { DashboardProvider } from "@/components/providers/dashboard-provider"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <DashboardProvider>
            <Shell>
                {children}
            </Shell>
        </DashboardProvider>
    )
}
