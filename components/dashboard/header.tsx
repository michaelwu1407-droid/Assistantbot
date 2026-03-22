"use client"

import { useState, useEffect, type ReactNode } from "react"
import { NotificationsBtn } from "./notifications-btn"
import { Button } from "@/components/ui/button"
import { Search, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Menu, Activity } from "lucide-react"
import { getWeather } from "@/actions/weather-actions"
import { useShellStore } from "@/lib/store"
import { GlobalSearch } from "@/components/layout/global-search"
import { cn } from "@/lib/utils"

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
    /** `brand` = dark green bar + white text (dashboard shell) */
    variant?: "default" | "brand"
}

export function Header({ userName, userId, workspaceId, userRole, onOpenActivity, headerActions, variant = "default" }: HeaderProps) {
    const isBrand = variant === "brand"
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
        const ic = isBrand ? "h-4 w-4 text-emerald-100" : ""
        if (isBrand) {
            if (c.includes("rain") || c.includes("drizzle")) return <CloudRain className={ic} />
            if (c.includes("snow")) return <CloudSnow className={ic} />
            if (c.includes("thunder")) return <CloudLightning className={ic} />
            if (c.includes("cloud") || c.includes("fog")) return <Cloud className={ic} />
            return <Sun className={ic} />
        }
        if (c.includes("rain") || c.includes("drizzle")) return <CloudRain className="h-4 w-4 text-primary" />
        if (c.includes("snow")) return <CloudSnow className="h-4 w-4 text-slate-300" />
        if (c.includes("thunder")) return <CloudLightning className="h-4 w-4 text-amber-400" />
        if (c.includes("cloud") || c.includes("fog")) return <Cloud className="h-4 w-4 text-slate-400" />
        return <Sun className="h-4 w-4 text-amber-500" />
    }

    const firstName = userName?.split(/[@\s.]/)[0] || "User"
    const roleLabel = userRole === "OWNER" ? "Owner" : userRole === "MANAGER" ? "Manager" : userRole === "TEAM_MEMBER" ? "Team Member" : "Owner"

    return (
        <header
            className={cn(
                "flex items-center gap-2 md:gap-3 h-12 px-4 md:px-6 shrink-0 min-w-0",
                isBrand
                    ? "bg-emerald-900 text-white border-b border-emerald-950/50 shadow-sm"
                    : "glass-panel"
            )}
        >
            {/* Left: mobile menu + search — capped width so the bar doesn’t feel like one endless field (three-zone pattern: nav rail | search | actions) */}
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "md:hidden -ml-2 shrink-0",
                        isBrand ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-muted-foreground"
                    )}
                    onClick={() => useShellStore.getState().setMobileMenuOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden min-w-0 flex-1 items-center md:flex">
                    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                        <GlobalSearch
                            workspaceId={workspaceId}
                            variant="bar"
                            tone={isBrand ? "onDark" : "default"}
                            className="w-full min-w-0"
                        />
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "md:hidden",
                        isBrand ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-muted-foreground"
                    )}
                    onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                >
                    <Search className="h-5 w-5" />
                </Button>
            </div>

            {/* Between search and activity: optional pipeline actions (dashboard: New Job + Filter) */}
            {headerActions ? (
                <div
                    className={cn(
                        "flex items-center gap-1 shrink-0",
                        isBrand &&
                            "[&_#new-deal-btn]:bg-white [&_#new-deal-btn]:text-emerald-900 [&_#new-deal-btn]:border-transparent [&_#new-deal-btn]:shadow-sm [&_#new-deal-btn]:hover:bg-emerald-50 [&_#new-deal-btn]:hover:text-emerald-950 [&_#pipeline-filter-trigger]:!bg-white [&_#pipeline-filter-trigger]:!text-emerald-900 [&_#pipeline-filter-trigger]:border [&_#pipeline-filter-trigger]:!border-slate-200/90 [&_#pipeline-filter-trigger]:shadow-sm [&_#pipeline-filter-trigger]:hover:!bg-emerald-50"
                    )}
                >
                    {headerActions}
                </div>
            ) : null}

            {/* Right: weather + notifications + activity + divider + user identity — h-9 aligns with search + pipeline buttons */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
                <div className="flex items-center gap-1.5">
                    {/* Weather pill */}
                    {weather && (
                        <div
                            className={cn(
                                "flex h-9 items-center gap-1.5 px-2.5 rounded-full border",
                                isBrand
                                    ? "bg-white/10 border-white/20"
                                    : "bg-primary/5 border border-primary/10"
                            )}
                        >
                            {getWeatherIcon(weather.condition)}
                            <span
                                className={cn(
                                    "text-xs font-bold tabular-nums",
                                    isBrand ? "text-white" : "text-primary"
                                )}
                            >
                                {weather.temp}°
                            </span>
                        </div>
                    )}
                    <button
                        type="button"
                        className={cn(
                            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                            isBrand
                                ? "text-white/90 hover:bg-white/10"
                                : "text-muted-foreground hover:bg-muted/80 hover:opacity-100"
                        )}
                        onClick={onOpenActivity}
                        aria-label="Open recent activity"
                    >
                        <Activity className="h-4 w-4" />
                    </button>
                    <NotificationsBtn userId={userId} tone={isBrand ? "onDark" : "default"} />
                </div>
                {/* Divider */}
                <div className={cn("h-6 w-px", isBrand ? "bg-white/25" : "bg-border/20")} />
                {/* User identity */}
                <div className="flex items-center gap-2 pl-1">
                    <div className="text-right hidden sm:block">
                        <p className="text-[13px] font-bold leading-tight">{firstName}</p>
                        <p
                            className={cn(
                                "text-[11px] uppercase tracking-wider",
                                isBrand ? "text-emerald-200/80" : "text-muted-foreground"
                            )}
                        >
                            {roleLabel}
                        </p>
                    </div>
                    <div
                        className={cn(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                            isBrand
                                ? "bg-white/15 border-white/30 text-white"
                                : "bg-primary/10 border-muted text-primary"
                        )}
                    >
                        {firstName.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    )
}
