"use client"

import { useEffect, useState } from "react"
import { useShellStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Bell, Search, MapPin, Camera, Navigation, Phone, MessageSquare, Wrench, CalendarX } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

// Dynamically import map to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-500">Loading Map...</div>
})

interface Job {
  id: string
  title: string
  clientName: string
  address: string
  status: string
  value: number | null
  scheduledAt: Date
  description: string
}

interface TradieDashboardProps {
  initialJobs: Job[]
}

import { GlobalSearch } from "@/components/layout/global-search"

// ...

interface TradieDashboardProps {
  initialJobs: Job[]
}

export default function TradieDashboard({ initialJobs }: TradieDashboardProps) {
  const { setViewMode, setPersona, workspaceId } = useShellStore() // Get workspaceId
  const [isTraveleling, setIsTraveling] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const currentJob = jobs[0] // Simple "next job" logic
  const router = useRouter()

  // Force Tradie Persona on mount
  useEffect(() => {
    setPersona("TRADIE")
    setViewMode("ADVANCED")
  }, [setPersona, setViewMode])

  return (
    <div className="h-full w-full bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
      {/* 1. Header (Fixed) */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-xl font-bold">Good Morning, Scott</h1>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span>☁️ Cloudy</span>
            <span>•</span>
            <span>22°C</span>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <Button size="icon" variant="secondary" className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 rounded-full" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>
          <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} workspaceId={workspaceId || ""} />
          <div className="relative">
            <Button size="icon" variant="secondary" className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-slate-950"></span>
          </div>
        </div>
      </header>

      {/* 2. The Pulse Widget (Overlay) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-1 text-green-400">
            <span>Wk:</span>
            <span>$4.2k</span>
          </div>
          <div className="h-4 w-[1px] bg-white/20"></div>
          <div className="flex items-center gap-1 text-red-300">
            <span>Owe:</span>
            <span>$850</span>
          </div>
        </div>
      </div>

      {/* 3. Main Canvas (Map View) */}
      <div className="flex-1 bg-slate-900 relative">
        <MapView jobs={jobs} />
      </div>

      {/* 4. Bottom Sheet (Job Details) */}
      {currentJob && (
        <Drawer>
          <DrawerTrigger asChild>
            <div className="absolute bottom-0 left-0 right-0 bg-white text-slate-900 p-4 pb-8 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-slate-50 transition-colors z-40">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Next: {currentJob.clientName}</h3>
                  <p className="text-slate-500 text-sm">{currentJob.title} • {currentJob.address}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                  <Navigation className="h-5 w-5" />
                </div>
              </div>
            </div>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh] bg-slate-50 text-slate-900">
            <DrawerHeader>
              <DrawerTitle>Job Details</DrawerTitle>
              <DrawerDescription>Review details and manage the job.</DrawerDescription>
            </DrawerHeader>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-32">
              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: Navigation, label: "Navigate", color: "bg-blue-100 text-blue-700" },
                  { icon: Phone, label: "Call", color: "bg-green-100 text-green-700" },
                  { icon: MessageSquare, label: "Text", color: "bg-purple-100 text-purple-700" },
                  { icon: Wrench, label: "Parts", color: "bg-orange-100 text-orange-700" },
                ].map((action, i) => (
                  <button key={i} className="flex flex-col items-center gap-2">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm", action.color)}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Job Info */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-semibold text-slate-900">Description</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {currentJob.description}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 pb-8 space-y-3">
              <Button
                variant="outline"
                className="w-full h-12 text-slate-700 border-slate-300"
                onClick={() => router.push(`/dashboard/tradie/jobs/${currentJob.id}`)}
              >
                View Full Details
              </Button>
              <Button
                className={cn(
                  "w-full h-14 text-lg font-bold shadow-lg transition-all",
                  isTraveleling ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-green-500 hover:bg-green-600 text-black"
                )}
                onClick={() => setIsTraveling(!isTraveleling)}
              >
                {isTraveleling ? "ARRIVED AT SITE" : "START TRAVEL"}
              </Button>
            </div>

            {/* FAB */}
            <button className="absolute bottom-24 right-4 h-14 w-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl z-50 hover:scale-105 transition-transform">
              <Camera className="h-6 w-6" />
            </button>

          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
