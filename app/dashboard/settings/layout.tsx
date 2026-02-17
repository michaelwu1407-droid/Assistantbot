"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

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
        title: "Appearance",
        href: "/dashboard/settings/appearance",
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
        title: "Automations",
        href: "/dashboard/settings/automations",
    },
    {
        title: "Integrations",
        href: "/dashboard/settings/integrations",
    },
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
                "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
                className
            )}
            {...props}
        >
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "justify-start text-left",
                        pathname === item.href
                            ? "bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-50"
                            : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 text-slate-500",
                        "inline-flex h-9 items-center rounded-md px-4 py-2 text-sm transition-colors"
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
        <div className="space-y-6 p-4 pb-16 md:p-10">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">
                    Manage your account settings and set e-mail preferences.
                </p>
            </div>
            <div className="my-6 border-t border-slate-200 dark:border-slate-800" />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="-mx-4 lg:w-1/5">
                    <SidebarNav items={sidebarNavItems} />
                </aside>
                <div className="flex-1 lg:max-w-2xl">{children}</div>
            </div>
        </div>
    )
}
