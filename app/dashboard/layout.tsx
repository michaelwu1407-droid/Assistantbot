"use client"

import { Sidebar } from "@/components/core/sidebar"
import { AssistantPane } from "@/components/core/assistant-pane"
import { DashboardProvider, useDashboard } from "@/components/providers/dashboard-provider"
import { SearchCommand } from "@/components/core/search-command" // Import
import { cn } from "@/lib/utils"

// Inner component to consume Context
function DashboardContent({ children }: { children: React.ReactNode }) {
    const { mode } = useDashboard()

    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
            <Sidebar />

            {/* 2. Main Canvas (The "Work" Area) */}
            <main className={cn(
                "flex-1 relative overflow-hidden bg-slate-50 transition-all duration-300 ease-in-out p-6",
                mode === "chat" ? "w-0 opacity-0 px-0" : "w-full opacity-100"
            )}>
                <div className="absolute top-6 right-6 z-50">
                    <SearchCommand />
                </div>
                {children}
            </main>

            {/* 3. Assistant Pane (The "Help" Area) */}
            <aside className={cn(
                "flex-shrink-0 z-10 shadow-xl bg-white border-l border-slate-200 transition-all duration-300 ease-in-out",
                mode === "chat" ? "w-full lg:w-[600px] border-l-0" : "w-[400px]"
            )}>
                <AssistantPane />
            </aside>
        </div>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <DashboardProvider>
            <DashboardContent>{children}</DashboardContent>
        </DashboardProvider>
    )
}
