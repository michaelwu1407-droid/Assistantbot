"use client"

import { useIndustry } from "@/components/providers/industry-provider"
import { NotificationsBtn } from "./notifications-btn"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"

interface HeaderProps {
    userName: string
    userId: string
    onNewDeal: () => void
}

export function Header({ userName, userId, onNewDeal }: HeaderProps) {
    const { industry } = useIndustry()

    const getGreeting = () => {
        const hour = new Date().getHours()
        const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
        
        if (industry === "TRADES") {
            return `G'day, ${userName}`
        }
        if (industry === "REAL_ESTATE") {
            return `Hey ${userName}`
        }
        return `${timeGreeting}, ${userName}`
    }

    const getSubtitle = () => {
        if (industry === "TRADES") return "Here's what's happening on site today."
        if (industry === "REAL_ESTATE") return "Here's your pipeline update."
        return "Here's your daily briefing."
    }

    return (
        <div className="flex items-center justify-between shrink-0 pb-2">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight drop-shadow-sm">
                    {getGreeting()}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">
                    {getSubtitle()}
                </p>
            </div>

            <div className="flex items-center gap-2">
                {/* Mobile Search Trigger (Desktop uses CMD+K) */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden text-slate-500 hover:bg-slate-100"
                    onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                >
                    <Search className="h-5 w-5" />
                </Button>

                <NotificationsBtn userId={userId} />

                <Button onClick={onNewDeal} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">
                        {industry === "TRADES" ? "New Job" : industry === "REAL_ESTATE" ? "New Listing" : "New Deal"}
                    </span>
                    <span className="sm:hidden">New</span>
                </Button>
            </div>
        </div>
    )
}
