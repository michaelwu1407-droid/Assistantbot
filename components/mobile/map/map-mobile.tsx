"use client"

import { useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { ChevronLeft, LocateFixed, MapPin } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Job } from "@/components/map/map-view"
import { MapPinSheet } from "./map-pin-sheet"

const MapMobileInner = dynamic(
  () => import("./map-mobile-inner").then((m) => m.MapMobileInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
)

export function MapMobile({ jobs }: { jobs: Job[] }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPosition([coords.latitude, coords.longitude])
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  useEffect(() => {
    const nav = navigator as Navigator & { permissions?: Permissions }
    nav.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((s) => { if (s.state === "granted") locateMe() })
      .catch(() => {})
  }, [locateMe])

  const todayCount = jobs.filter((j) => {
    const d = j.scheduledAt ? new Date(j.scheduledAt) : null
    return d && d.toDateString() === new Date().toDateString()
  }).length

  return (
    <div className="fixed inset-0 z-[200] flex flex-col md:hidden">
      {/* Green header */}
      <div className="shrink-0 bg-emerald-900 pt-safe text-white">
        <div className="flex items-center gap-2 px-2 pb-3 pt-2">
          <Link
            href="/crm/dashboard"
            aria-label="Back to pipeline"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight">Map</p>
            <p className="text-[12px] text-emerald-200/80">
              {todayCount > 0 ? `${todayCount} job${todayCount === 1 ? "" : "s"} today` : "No jobs today"}
            </p>
          </div>
          {jobs.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-700/60 px-2.5 py-1 text-[12px] font-semibold">
              <MapPin className="h-3 w-3" />
              {jobs.length}
            </span>
          )}
        </div>
      </div>

      {/* Full-bleed map */}
      <div className="relative min-h-0 flex-1">
        <MapMobileInner
          jobs={jobs}
          selectedJobId={selectedJob?.id ?? null}
          userPosition={userPosition}
          onSelectJob={setSelectedJob}
        />

        {/* Locate-me overlay */}
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          aria-label={locating ? "Locating…" : "My location"}
          className={cn(
            "absolute right-4 top-4 z-[1000] flex items-center gap-2 rounded-md border border-border bg-card/95 px-3 py-2 shadow-lg",
            locating && "opacity-50",
          )}
        >
          <LocateFixed className={cn("h-4 w-4 text-blue-600", locating && "animate-spin")} />
          <span className="text-xs font-semibold text-muted-foreground">{locating ? "Locating…" : "My Location"}</span>
        </button>
      </div>

      <MapPinSheet
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => { if (!open) setSelectedJob(null) }}
      />
    </div>
  )
}
