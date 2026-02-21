"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"

interface SettingsLayoutProps {
    children: React.ReactNode
}

const sidebarNavItems = [
    {
        title: "Profile",
        href: "/dashboard/settings",
    },
    {
        title: "Account",
        href: "/dashboard/settings/account",
    },
    {
        title: "Notifications",
        href: "/dashboard/settings/notifications",
    },
    {
        title: "Workspace",
        href: "/dashboard/settings/workspace",
    },
    {
        title: "Display",
        href: "/dashboard/settings/display",
    },
    {
        title: "One-Tap Messages",
        href: "/dashboard/settings/sms-templates",
    },
    {
        title: "Automations",
        href: "/dashboard/settings/automations",
    },
    {
        title: "Integrations",
        href: "/dashboard/settings/integrations",
    },
    {
        title: "AI Voice Agent",
        href: "/dashboard/settings/ai-voice",
    },
    {
        title: "Agent Capabilities",
        href: "/dashboard/settings/agent",
    },
    {
        title: "Repair Glossary",
        href: "/dashboard/settings/glossary",
    }
]

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: {
        href: string
        title: string
    }[]
}

function SidebarNav({ className, items, ...props }: SidebarNavProps) {
    const pathname = usePathname()

    return (
        <nav
            className={cn(
                "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 overflow-x-auto pb-4 lg:pb-0 custom-scrollbar",
                className
            )}
            {...props}
        >
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "justify-start text-left whitespace-nowrap",
                        pathname === item.href
                            ? "bg-mint-50 font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 text-slate-500",
                        "inline-flex h-10 items-center rounded-xl px-4 py-2 text-sm transition-colors"
                    )}
                >
                    {item.title}
                </Link>
            ))}
        </nav>
    )
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    return (
        <div className="space-y-6 p-4 pl-6 pb-16 md:p-8 md:pl-10 lg:p-10 lg:pl-14 max-w-6xl mx-auto w-full">
            {/* WIP Banner */}
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm font-medium">
                    Settings is a work in progress (WIP). Some options may not be fully functional yet.
                </p>
            </div>
            <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h2>
                <p className="text-slate-500 text-sm">
                    Manage your CRM preferences, team structures, and AI agent configuration.
                </p>
            </div>
            <div className="my-6 border-t border-slate-200 dark:border-slate-800" />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="w-full lg:w-[250px] shrink-0">
                    <SidebarNav items={sidebarNavItems} />
                </aside>
                <div className="flex-1 min-w-0 max-w-full lg:max-w-3xl border-slate-100 dark:border-slate-800 lg:border-l lg:pl-10">
                    {children}
                </div>
            </div>
        </div>
    )
}
