"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useState, useMemo, useCallback } from "react"
import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight, Clock, Compass, Layers, LocateFixed, MapPin, MessageSquare, Navigation, Route } from "lucide-react"
import { cn } from "@/lib/utils"
import { JobCompletionModal } from "@/components/tradie/job-completion-modal"
import { DealDetailModal } from "@/components/crm/deal-detail-modal"

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function createIcon(opts: { isToday: boolean; isActive?: boolean; isStarted?: boolean }) {
  const color = opts.isStarted ? "#059669" : opts.isActive ? "#2563EB" : opts.isToday ? "#0D9488" : "#64748B"
  const fill = opts.isToday ? color : "transparent"
  const stroke = color
  const size = opts.isActive ? 36 : 28
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="${fill}" stroke="${stroke}" stroke-width="${opts.isToday ? "0" : "2"}"
        stroke-dasharray="${opts.isToday ? "0" : "4 2"}"/>
      <circle cx="12" cy="9" r="2.5" fill="${opts.isToday ? "white" : stroke}"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

const defaultIconUpcoming = createIcon({ isToday: false })

export interface Job {
  id: string
  title: string
  clientName: string
  address: string
  status: string
  value: number
  scheduledAt: Date
  lat?: number
  lng?: number
}

interface MapViewProps {
  jobs: Job[]
  todayIds?: Set<string>
}

const DEFAULT_CENTER: [number, number] = [-37.8136, 144.9631]

function getJobPosition(job: Job): [number, number] {
  if (job.lat != null && job.lng != null) {
    return [job.lat, job.lng]
  }
  const offset = (job.id.charCodeAt(0) % 10 - 5) * 0.004
  return [DEFAULT_CENTER[0] + offset, DEFAULT_CENTER[1] + offset]
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
  }, [map, positions])
  return null
}

function FlyToJob({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 0.8 })
  }, [map, position])
  return null
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function MapView({ jobs, todayIds }: MapViewProps) {
  const [showToday, setShowToday] = useState(true)
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [startedJobId, setStartedJobId] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRouteMode, setIsRouteMode] = useState(false)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [jobToComplete, setJobToComplete] = useState<Job | null>(null)
  const [viewJobDealId, setViewJobDealId] = useState<string | null>(null)
  const [viewJobTab, setViewJobTab] = useState<"activities" | "jobs" | "notes" | undefined>(undefined)

  const { jobsToday, jobsUpcoming } = useMemo(() => {
    const today: Job[] = []
    const upcoming: Job[] = []
    const now = new Date()
    jobs.forEach((job) => {
      const date = job.scheduledAt ? new Date(job.scheduledAt) : null
      const isToday = todayIds ? todayIds.has(job.id) : date ? isSameDay(date, now) : false
      if (isToday) today.push(job)
      else upcoming.push(job)
    })
    today.sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
      return ta - tb
    })
    return { jobsToday: today, jobsUpcoming: upcoming }
  }, [jobs, todayIds])

  const activeTargetJob = useMemo(() => jobsToday.find((job) => job.status !== "COMPLETED") || null, [jobsToday])

  const selectJob = useCallback((job: Job) => {
    setSelectedJobId(job.id)
    setFlyTarget(getJobPosition(job))
  }, [])

  const startJob = useCallback((job: Job) => {
    setStartedJobId(job.id)
    setSelectedJobId(job.id)
    setFlyTarget(getJobPosition(job))
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`, "_blank")
  }, [])

  const finishJob = useCallback(async (job: Job) => {
    setJobToComplete(job)
    setIsCompletionModalOpen(true)
  }, [])

  const handleModalSuccess = useCallback(() => {
    setIsCompletionModalOpen(false)
    setJobToComplete(null)
    setStartedJobId(null)
  }, [])

  const visiblePositions: [number, number][] = [
    ...(showToday ? jobsToday.map(getJobPosition) : []),
    ...(showUpcoming && !isRouteMode ? jobsUpcoming.map(getJobPosition) : []),
  ]

  const visibleTodayJobs = isRouteMode ? (activeTargetJob ? [activeTargetJob] : []) : jobsToday
  const effectiveSelectedJobId = isRouteMode && activeTargetJob ? activeTargetJob.id : selectedJobId
  const effectiveFlyTarget = isRouteMode && activeTargetJob ? getJobPosition(activeTargetJob) : flyTarget

  const locateMe = useCallback(async () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude]
        setUserPosition(coords)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Auto-locate only if permission is already granted (so we don't constantly prompt).
  useEffect(() => {
    let cancelled = false
    const maybeAutoLocate = async () => {
      try {
        const permissions = (navigator as any).permissions
        if (!permissions?.query) return
        const status = await permissions.query({ name: "geolocation" })
        if (cancelled) return
        if (status?.state === "granted") {
          locateMe()
        }
      } catch {
        // Ignore: browser may not support permissions API; user can still click the button.
      }
    }
    maybeAutoLocate()
    return () => {
      cancelled = true
    }
  }, [locateMe])

  const fitPositions: [number, number][] = useMemo(() => {
    const positions: [number, number][] = [...visiblePositions]
    if (userPosition) positions.push(userPosition)
    return positions
  }, [visiblePositions, userPosition])

  return (
    <div className="relative flex h-full w-full min-h-0">
      <div className={cn("z-10 flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200", sidebarCollapsed ? "w-12" : "w-80")}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="flex flex-col items-center gap-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              title="Expand today's jobs"
              aria-label="Expand today's jobs sidebar"
            >
              <MapPin className="h-4 w-4 text-teal-600" />
              <span className="text-[10px] font-medium">Jobs</span>
              <ChevronRight className="h-4 w-4 rotate-180 text-slate-400" />
            </button>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <MapPin className="h-4 w-4 text-teal-600" />
                    Today&apos;s Jobs
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">{jobsToday.length} job{jobsToday.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-200"
                  title="Minimise panel"
                  aria-label="Collapse today's jobs sidebar"
                >
                  <ChevronRight className="h-5 w-5 rotate-180 stroke-[2.5]" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsRouteMode(!isRouteMode)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  isRouteMode ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                )}
              >
                <Route className="h-4 w-4" />
                {isRouteMode ? "Exit Route Mode" : "Enable Route Mode"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {jobsUpcoming.length > 0 && !isRouteMode && (
                <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                  {jobsUpcoming.length} upcoming job{jobsUpcoming.length === 1 ? "" : "s"} are on the map too.
                </div>
              )}

              {!isRouteMode ? (
                jobsToday.length === 0 ? (
                  <div className="p-4">
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">No jobs scheduled for today.</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">Upcoming booked jobs still appear on the map so you can plan ahead.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  jobsToday.map((job) => {
                    const time = job.scheduledAt
                      ? new Date(job.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
                      : "No time set"
                    const isSelected = job.id === effectiveSelectedJobId
                    const isStarted = job.id === startedJobId
                    return (
                      <div key={job.id} className={cn("border-b border-slate-100 transition-all", isSelected && "bg-blue-50", isStarted && "bg-emerald-50")}>
                        <button
                          type="button"
                          onClick={() => selectJob(job)}
                          className={cn(
                            "w-full border-l-4 p-3 text-left transition-all",
                            isStarted ? "border-l-emerald-500" : isSelected ? "border-l-blue-500" : "border-l-transparent hover:bg-slate-50"
                          )}
                          aria-label={`Select job ${job.title} for ${job.clientName}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", isStarted ? "bg-emerald-500" : isSelected ? "bg-blue-500" : "bg-teal-500")} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900">{job.clientName}</p>
                                {isStarted && (
                                  <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                    In Progress
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-slate-600">{job.title}</p>
                              <div className="mt-1 flex items-center gap-3">
                                <span className="flex items-center gap-1 truncate text-xs text-slate-400">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {job.address}
                                </span>
                              </div>
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="h-3 w-3 shrink-0" />
                                {time}
                              </span>
                            </div>
                          </div>
                        </button>

                        {isSelected && (
                          <div className="flex flex-col gap-2 px-3 pb-3">
                            <button
                              type="button"
                              onClick={() => {
                                setViewJobTab(undefined)
                                setViewJobDealId(job.id)
                              }}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                              View Job
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setViewJobTab("activities")
                                setViewJobDealId(job.id)
                              }}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Message
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`, "_blank")}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              Open in Google Maps
                            </button>
                            {isStarted && (
                              <button
                                type="button"
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`, "_blank")}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                Navigate Again
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )
              ) : (
                <div className="flex h-full flex-col p-3">
                  {activeTargetJob ? (
                    <div className="flex flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Active Target</span>
                      </div>
                      <div className="flex flex-col gap-3 p-4">
                        <div>
                          <h4 className="text-lg font-bold leading-tight text-slate-900">{activeTargetJob.clientName}</h4>
                          <p className="mt-0.5 text-sm text-slate-600">{activeTargetJob.title}</p>
                        </div>
                        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                          <div className="flex items-start gap-2 text-sm text-slate-700">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span>{activeTargetJob.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                            <span>{activeTargetJob.scheduledAt ? new Date(activeTargetJob.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }) : "No time set"}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => startJob(activeTargetJob)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                          >
                            <Navigation className="h-4 w-4" />
                            Navigate to Job
                          </button>

                          {activeTargetJob.id === startedJobId && (
                            <button
                              type="button"
                              onClick={() => finishJob(activeTargetJob)}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Complete & Next
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">All Done!</h4>
                      <p className="mt-1 text-sm text-slate-500">You&apos;ve completed all scheduled jobs for today.</p>
                    </div>
                  )}

                  {activeTargetJob && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">Up Next</p>
                      <div className="space-y-2">
                        {jobsToday.filter((job) => job.status !== "COMPLETED" && job.id !== activeTargetJob.id).map((job, idx) => (
                          <div key={job.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 opacity-60">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">
                              {idx + 2}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-700">{job.clientName}</p>
                              <p className="truncate text-[10px] text-slate-500">{job.address}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative min-h-[300px] min-w-0 flex-1">
        <MapContainer
          center={userPosition ?? DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom
          className="h-full w-full rounded-xl"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
          {!effectiveSelectedJobId && <FitBounds positions={fitPositions} />}
          <FlyToJob position={effectiveFlyTarget} />

          {/* Your location marker (appears after geolocation) */}
          {userPosition && (
            <CircleMarker
              center={userPosition}
              radius={7}
              pathOptions={{ color: "#4285F4", weight: 2, fillOpacity: 0.2 }}
            />
          )}

          {showToday && visibleTodayJobs.map((job) => {
            const [lat, lng] = getJobPosition(job)
            const isSelected = isRouteMode || job.id === effectiveSelectedJobId
            const isStarted = job.id === startedJobId
            return (
              <Marker
                key={job.id}
                position={[lat, lng]}
                icon={createIcon({ isToday: true, isActive: isSelected, isStarted })}
                eventHandlers={{ click: () => selectJob(job) }}
              >
                <Popup>
                  <div className="min-w-[180px] text-slate-900">
                    <strong className="block text-sm font-bold">{job.clientName}</strong>
                    <span className="text-xs text-slate-600">{job.title}</span>
                    <br />
                    <span className="text-xs text-slate-500">{job.address}</span>
                    {job.scheduledAt && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(job.scheduledAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    <div className="mt-2 flex w-full gap-2">
                      <button
                        type="button"
                        onClick={() => startJob(job)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        <Navigation className="h-3 w-3" />
                        {job.id === startedJobId ? "Navigate" : "Start Job"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewJobTab("activities")
                          setViewJobDealId(job.id)
                        }}
                        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-indigo-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Message
                      </button>
                      {isRouteMode && job.id === startedJobId && (
                        <button
                          type="button"
                          onClick={() => finishJob(job)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Finish
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {showUpcoming && !isRouteMode && jobsUpcoming.map((job) => {
            const [lat, lng] = getJobPosition(job)
            return (
              <Marker key={job.id} position={[lat, lng]} icon={defaultIconUpcoming}>
                <Popup>
                  <div className="min-w-[160px] text-slate-900">
                    <strong className="block text-sm font-bold">{job.clientName}</strong>
                    <span className="text-xs text-slate-600">{job.title}</span>
                    <br />
                    <span className="text-xs text-slate-500">{job.address}</span>
                    {job.scheduledAt && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(job.scheduledAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {!isRouteMode && (
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className="absolute right-4 top-4 z-[1000] flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg transition-all hover:bg-slate-50 disabled:opacity-50"
            title="Find my location"
            aria-label={locating ? "Locating current position" : "Find my current location"}
          >
            <LocateFixed className={cn("h-4 w-4 text-blue-600", locating && "animate-spin")} />
            <span className="text-xs font-semibold text-slate-600">{locating ? "Locating..." : "My Location"}</span>
          </button>
        )}

        {!isRouteMode && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            <button
              type="button"
              onClick={() => setLegendOpen((open) => !open)}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 shadow-lg transition-all",
                legendOpen ? "p-3" : "px-3 py-2"
              )}
              aria-label={legendOpen ? "Hide map layers" : "Show map layers"}
            >
              <Layers className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">Layers</span>
            </button>
            {legendOpen && (
              <div className="absolute bottom-full left-0 mb-1 min-w-[180px] space-y-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={showToday} onChange={(event) => setShowToday(event.target.checked)} className="rounded border-slate-300" />
                  <span className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Compass className="h-4 w-4 text-teal-600" />
                    Today&apos;s jobs
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={showUpcoming} onChange={(event) => setShowUpcoming(event.target.checked)} className="rounded border-slate-300" />
                  <span className="flex items-center gap-1.5 text-sm text-slate-700">
                    <CalendarClock className="h-4 w-4 text-slate-500" />
                    Upcoming jobs
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {jobToComplete && (
        <JobCompletionModal
          open={isCompletionModalOpen}
          onOpenChange={(open) => {
            setIsCompletionModalOpen(open)
            if (!open) setJobToComplete(null)
          }}
          dealId={jobToComplete.id}
          job={jobToComplete}
          onSuccess={handleModalSuccess}
        />
      )}

      <DealDetailModal
        dealId={viewJobDealId}
        open={!!viewJobDealId}
        onOpenChange={(open) => {
          if (!open) {
            setViewJobDealId(null)
            setViewJobTab(undefined)
          }
        }}
        initialTab={viewJobTab}
      />
    </div>
  )
}
