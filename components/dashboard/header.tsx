"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useIndustry } from "@/components/providers/industry-provider"
import { NotificationsBtn } from "./notifications-btn"
import { Button } from "@/components/ui/button"
import { Plus, Search, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Play, Menu } from "lucide-react"
import { getWeather } from "@/actions/weather-actions"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useShellStore } from "@/lib/store"
import { GlobalSearch } from "@/components/layout/global-search"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { cn } from "@/lib/utils"

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

    const firstName = userName.split(/[@\s\.]/)[0] // Get first part before @, space, or dot

    const [greeting, setGreeting] = useState(`Hey ${firstName}`)

    useEffect(() => {
        const hour = new Date().getHours()
        const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

        if (industry === "TRADES") {
            setGreeting(`G'day, ${firstName}`)
        } else if (industry === "REAL_ESTATE") {
            setGreeting(`Hey ${firstName}`)
        } else {
            setGreeting(`${timeGreeting}, ${firstName}`)
        }
    }, [industry, firstName])

    const getSubtitle = () => {
        if (industry === "TRADES") return "Here's what's happening on site today."
        if (industry === "REAL_ESTATE") return "Here's your pipeline update."
        return "Here's the latest update on your business."
    }

    return (
        <div className="flex items-center justify-between shrink-0 pb-6 pt-2">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2 text-muted-foreground"
                    onClick={() => useShellStore.getState().setMobileMenuOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <div>
                    <Breadcrumbs className="mb-2" />
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground tracking-tight drop-shadow-sm">
                            {greeting}
                        </h1>
                        {weather && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-full shadow-sm animate-in fade-in slide-in-from-left-2">
                                {getWeatherIcon(weather.condition)}
                                <span className="text-sm font-semibold text-foreground/80">{weather.temp}°</span>
                            </div>
                        )}
                    </div>
                    <p className="text-base md:text-lg text-muted-foreground mt-1 font-medium">
                        {getSubtitle()}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                {/* Global Search - CMD+K */}
                <GlobalSearch workspaceId={workspaceId} className="mr-2 hidden md:flex" />

                {/* Mobile Search Trigger */}
                <Button
                    id="search-btn"
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-muted-foreground hover:bg-muted"
                    onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                >
                    <Search className="h-5 w-5" />
                </Button>

                <NotificationsBtn userId={userId} />

                <Button
                    id="new-deal-btn"
                    onClick={onNewDeal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 whitespace-nowrap flex-shrink-0 h-11 px-6 rounded-xl transition-all hover:scale-105"
                >
                    <Plus className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span className="hidden sm:inline font-semibold">
                        {industry === "TRADES" ? "New Job" : industry === "REAL_ESTATE" ? "New Listing" : "New Deal"}
                    </span>
                    <span className="sm:hidden">New</span>
                </Button>
            </div>
        </div>
    )
}
