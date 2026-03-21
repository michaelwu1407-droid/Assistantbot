"use client"

import { useState, useEffect, type ReactNode } from "react"
import { NotificationsBtn } from "./notifications-btn"
import { Button } from "@/components/ui/button"
import { Search, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Menu, Activity } from "lucide-react"
import { getWeather } from "@/actions/weather-actions"
import { useShellStore } from "@/lib/store"
import { GlobalSearch } from "@/components/layout/global-search"

interface HeaderProps {
    userName: string
    userId: string
    workspaceId: string
    userRole?: string
    onOpenActivity: () => void
    onNewDeal?: () => void
    teamMembers?: unknown[]
    filterByUserId?: string | null
    onFilterByUserChange?: (value: string | null) => void
    showFilter?: boolean
    showPrimaryCta?: boolean
    /** Renders between the search bar and weather/activity (e.g. New Job + Filter on dashboard) */
    headerActions?: ReactNode
}

export function Header({ userName, userId, workspaceId, userRole, onOpenActivity, headerActions }: HeaderProps) {
    const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null)

    useEffect(() => {
        const fetchWeather = async (lat: number, lng: number) => {
            try {
                const data = await getWeather(lat, lng)
                if (data) setWeather({ temp: data.temperature, condition: data.condition })
            } catch {
                // Weather is non-critical — silently degrade
            }
        }
        if (typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchWeather(-33.8688, 151.2093)
            )
        } else {
            fetchWeather(-33.8688, 151.2093)
        }
    }, [])

    const getWeatherIcon = (condition: string) => {
        const c = condition.toLowerCase()
        if (c.includes("rain") || c.includes("drizzle")) return <CloudRain className="h-4 w-4 text-primary" />
        if (c.includes("snow")) return <CloudSnow className="h-4 w-4 text-slate-300" />
        if (c.includes("thunder")) return <CloudLightning className="h-4 w-4 text-amber-400" />
        if (c.includes("cloud") || c.includes("fog")) return <Cloud className="h-4 w-4 text-slate-400" />
        return <Sun className="h-4 w-4 text-amber-500" />
    }

    const firstName = userName?.split(/[@\s.]/)[0] || "User"
    const roleLabel = userRole === "OWNER" ? "Owner" : userRole === "MANAGER" ? "Manager" : userRole === "TEAM_MEMBER" ? "Team Member" : "Owner"

    return (
        <header className="glass-panel flex items-center gap-2 md:gap-3 h-12 px-4 md:px-6 shrink-0 min-w-0">
            {/* Left: mobile menu + full-width search bar (template) */}
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2 text-muted-foreground shrink-0"
                    onClick={() => useShellStore.getState().setMobileMenuOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <GlobalSearch
                    workspaceId={workspaceId}
                    variant="bar"
                    className="hidden md:flex flex-1 min-w-0 w-full"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-muted-foreground"
                    onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                >
                    <Search className="h-5 w-5" />
                </Button>
            </div>

            {/* Between search and activity: optional pipeline actions (dashboard: New Job + Filter) */}
            {headerActions ? (
                <div className="flex items-center gap-1 shrink-0">{headerActions}</div>
            ) : null}

            {/* Right: weather + notifications + activity + divider + user identity — h-9 aligns with search + pipeline buttons */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
                <div className="flex items-center gap-1.5">
                    {/* Weather pill */}
                    {weather && (
                        <div className="flex h-9 items-center gap-1.5 px-2.5 bg-primary/5 rounded-full border border-primary/10">
                            {getWeatherIcon(weather.condition)}
                            <span className="text-xs font-bold text-primary tabular-nums">{weather.temp}°</span>
                        </div>
                    )}
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:opacity-100 transition-colors"
                        onClick={onOpenActivity}
                        aria-label="Open recent activity"
                    >
                        <Activity className="h-4 w-4" />
                    </button>
                    <NotificationsBtn userId={userId} />
                </div>
                {/* Divider */}
                <div className="h-6 w-px bg-border/20" />
                {/* User identity */}
                <div className="flex items-center gap-2 pl-1">
                    <div className="text-right hidden sm:block">
                        <p className="text-[13px] font-bold leading-tight">{firstName}</p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{roleLabel}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-muted flex items-center justify-center text-xs font-bold text-primary">
                        {firstName.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    )
}
