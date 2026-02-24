"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useIndustry } from "@/components/providers/industry-provider"
import { NotificationsBtn } from "./notifications-btn"
import { Button } from "@/components/ui/button"
import { Plus, Search, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Play, Menu, Users, UserX } from "lucide-react"
import { getWeather } from "@/actions/weather-actions"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useShellStore } from "@/lib/store"
import { GlobalSearch } from "@/components/layout/global-search"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { cn } from "@/lib/utils"

interface TeamMemberOption {
    id: string
    name: string | null
    email: string
    role: string
}

interface HeaderProps {
    userName: string
    userId: string
    workspaceId: string
    teamMembers: TeamMemberOption[]
    filterByUserId: string | null
    onFilterByUserChange: (value: string | null) => void
    onNewDeal: () => void
}

const FILTER_ALL = "__all__"
const FILTER_UNASSIGNED = "__unassigned__"

export function Header({ userName, userId, workspaceId, teamMembers, filterByUserId, onFilterByUserChange, onNewDeal }: HeaderProps) {
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
        <div className="flex items-center justify-between shrink-0 pb-2 pt-2">
            <div className="flex items-center gap-6">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2 text-muted-foreground"
                    onClick={() => useShellStore.getState().setMobileMenuOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <div>
                    {/* Compact single-line header */}
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight leading-none whitespace-nowrap">
                            {greeting}
                        </h1>
                        {weather && (
                            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ECFDF5] border border-[#00D28B]/20 rounded-full animate-in fade-in slide-in-from-left-2">
                                {getWeatherIcon(weather.condition)}
                                <span className="text-xs font-bold text-[#00D28B]">{weather.temp}°</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
                {/* Filter by team member - left of search */}
                {teamMembers.length > 0 && (
                    <Select
                        value={filterByUserId ?? FILTER_ALL}
                        onValueChange={(v) => onFilterByUserChange(v === FILTER_ALL ? null : v === FILTER_UNASSIGNED ? FILTER_UNASSIGNED : v)}
                    >
                        <SelectTrigger className="w-[160px] hidden md:flex border-[#E2E8F0] dark:border-slate-600 bg-white dark:bg-slate-900" aria-label="Filter jobs by team member">
                            <Users className="h-4 w-4 mr-1.5 text-slate-500 shrink-0" />
                            <SelectValue placeholder="All jobs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={FILTER_ALL}>All jobs</SelectItem>
                            <SelectItem value={FILTER_UNASSIGNED}>
                                <span className="flex items-center gap-2">
                                    <UserX className="h-3.5 w-3.5 text-slate-400" />
                                    Unassigned
                                </span>
                            </SelectItem>
                            {teamMembers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.name || m.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
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

                {/* PRIMARY CTA: SOLID BLACK PILL */}
                <Button
                    id="new-deal-btn"
                    onClick={onNewDeal}
                    className="ott-btn-primary h-10 px-5 shadow-xl shadow-black/10 hover:shadow-black/20"
                >
                    <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline font-semibold text-sm">
                        {industry === "TRADES" ? "New Job" : industry === "REAL_ESTATE" ? "New Listing" : "New Deal"}
                    </span>
                    <span className="sm:hidden">New</span>
                </Button>
            </div>
        </div>
    )
}
