"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useShellStore } from "@/lib/store"

interface SettingsLayoutProps {
    children: React.ReactNode
}

const MANAGER_ONLY_HREFS = new Set([
    "/dashboard/settings/billing",
    "/dashboard/settings/integrations",
])

const sidebarNavSections: { label?: string; items: { title: string; href: string }[] }[] = [
    {
        items: [
            { title: "Account", href: "/dashboard/settings" },
        ],
    },
    {
        items: [
            { title: "My business", href: "/dashboard/settings/my-business" },
        ],
    },
    {
        items: [
            { title: "Automated calling & texting", href: "/dashboard/settings/call-settings" },
        ],
    },
    {
        items: [
            { title: "AI Assistant", href: "/dashboard/settings/agent" },
        ],
    },
    {
        items: [
            { title: "Knowledge Base", href: "/dashboard/settings/knowledge" },
        ],
    },
    {
        items: [
            { title: "Integrations", href: "/dashboard/settings/integrations" },
        ],
    },
    {
        items: [
            { title: "Notifications", href: "/dashboard/settings/notifications" },
        ],
    },
    {
        items: [
            { title: "Billing", href: "/dashboard/settings/billing" },
        ],
    },
    {
        items: [
            { title: "Display", href: "/dashboard/settings/display" },
        ],
    },
    {
        label: "Other",
        items: [
            { title: "Data & Privacy", href: "/dashboard/settings/privacy" },
        ],
    },
    {
        items: [
            { title: "Help", href: "/dashboard/settings/help" },
        ],
    },
]

function SidebarNav({ className, ...props }: { className?: string } & React.HTMLAttributes<HTMLElement>) {
    const pathname = usePathname()
    const userRole = useShellStore((s) => s.userRole)
    const isManager = userRole === "OWNER" || userRole === "MANAGER"

    // RBAC: filter out manager-only settings for team members
    const visibleSections = sidebarNavSections
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => isManager || !MANAGER_ONLY_HREFS.has(item.href)),
        }))
        .filter((section) => section.items.length > 0)

    return (
        <nav
            className={cn(
                "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 overflow-x-auto pb-4 lg:pb-0 custom-scrollbar",
                className
            )}
            {...props}
        >
            {visibleSections.map((section, si) => (
                <div key={si} className="lg:space-y-1">
                    {section.label && (
                        <p className="hidden lg:block px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {section.label}
                        </p>
                    )}
                    {section.items.map((item) => (
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
                </div>
            ))}
        </nav>
    )
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    return (
        <div className="space-y-6 p-4 pl-6 pb-16 md:p-8 md:pl-10 lg:p-10 lg:pl-14 max-w-6xl mx-auto w-full">
            <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h2>
                <p className="text-slate-500 text-sm">
                    Manage your account, business, AI agent, and preferences.
                </p>
            </div>
            <div className="my-6 border-t border-slate-200 dark:border-slate-800" />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="w-full lg:w-[260px] shrink-0">
                    <SidebarNav />
                </aside>
                <div className="flex-1 min-w-0 max-w-full lg:max-w-3xl border-slate-100 dark:border-slate-800 lg:border-l lg:pl-10">
                    {children}
                </div>
            </div>
        </div>
    )
}
