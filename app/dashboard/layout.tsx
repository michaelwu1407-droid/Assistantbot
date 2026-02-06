"use client"

import { Sidebar } from "@/components/core/sidebar"
import { AssistantPane } from "@/components/core/assistant-pane"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-50">
            {/* 1. Navigation Sidebar (Rail) */}
            <Sidebar />

            {/* 2. Main Canvas (The "Work" Area) - 70% width roughly */}
            <main className="flex-1 relative overflow-auto bg-slate-950 p-6 no-scrollbar">
                {children}
            </main>

            {/* 3. Assistant Pane (The "Help" Area) - 30% width roughly or fixed */}
            <aside className="w-[400px] flex-shrink-0 z-10 shadow-2xl">
                <AssistantPane />
            </aside>
        </div>
    )
}
