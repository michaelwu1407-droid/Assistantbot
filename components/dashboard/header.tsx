"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useIndustry } from "@/components/providers/industry-provider"
import { NotificationsBtn } from "./notifications-btn"
import { Button } from "@/components/ui/button"
import { Plus, Search, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Settings, Play, Menu } from "lucide-react"
import { getWeather } from "@/actions/weather-actions"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useShellStore } from "@/lib/store"
import { GlobalSearch } from "@/components/layout/global-search"

interface HeaderProps {
    userName: string
    userId: string
    workspaceId: string
    onNewDeal: () => void
}

export function Header({ userName, userId, workspaceId, onNewDeal }: HeaderProps) {
    const { industry } = useIndustry()
    const router = useRouter()
    const [weather, setWeather] = useState<{ temp: number, condition: string } | null>(null)

    useEffect(() => {
        const fetchWeather = async (lat: number, lng: number) => {
            try {
                const data = await getWeather(lat, lng)
                if (data) {
                    setWeather({ temp: data.temperature, condition: data.condition })
                }
            } catch (e) {
                console.error("Weather fetch error", e)
            }
        }

        // Try browser geo, fallback to Sydney
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchWeather(-33.8688, 151.2093) // Sydney fallback
            )
        } else {
            fetchWeather(-33.8688, 151.2093)
        }
    }, [])

    const getWeatherIcon = (condition: string) => {
        const c = condition.toLowerCase()
        if (c.includes("rain") || c.includes("drizzle")) return <CloudRain className="h-5 w-5 text-blue-400" />
        if (c.includes("snow")) return <CloudSnow className="h-5 w-5 text-slate-300" />
        if (c.includes("thunder")) return <CloudLightning className="h-5 w-5 text-amber-400" />
        if (c.includes("cloud") || c.includes("fog")) return <Cloud className="h-5 w-5 text-slate-400" />
        return <Sun className="h-5 w-5 text-amber-500" />
    }

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
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2 text-slate-500"
                    onClick={() => useShellStore.getState().setMobileMenuOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight drop-shadow-sm">
                        {getGreeting()}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 font-medium">
                        {getSubtitle()}
                    </p>
                </div>

                {weather && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-full shadow-sm animate-in fade-in slide-in-from-left-2">
                        {getWeatherIcon(weather.condition)}
                        <span className="text-sm font-semibold text-slate-700">{weather.temp}°</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Global Search - CMD+K */}
                <GlobalSearch workspaceId={workspaceId} className="mr-2 hidden md:flex" />

                {/* Mobile Search Trigger */}
                <Button
                    id="search-btn"
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-slate-500 hover:bg-slate-100"
                    onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                >
                    <Search className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-slate-100">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => useShellStore.getState().setViewMode("TUTORIAL")}>
                            <Play className="mr-2 h-4 w-4" />
                            Replay Tutorial
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <NotificationsBtn userId={userId} />

                <Button id="new-deal-btn" onClick={onNewDeal} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
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
