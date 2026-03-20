"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight, Clock, Compass, Layers, LocateFixed, MapPin, MessageSquare, Navigation, Route } from "lucide-react"
import { cn } from "@/lib/utils"
import { JobCompletionModal } from "@/components/tradie/job-completion-modal"
import { DealDetailModal } from "@/components/crm/deal-detail-modal"

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

interface GoogleMapViewProps {
  jobs: Job[]
  todayIds?: Set<string>
  onFallbackToLeaflet?: () => void
}

const DEFAULT_CENTER = { lat: -37.8136, lng: 144.9631 }
const DEFAULT_ZOOM = 12
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" }

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getJobPosition(job: Job): { lat: number; lng: number } {
  const offset = (job.id.charCodeAt(0) % 10 - 5) * 0.004
  return {
    lat: job.lat ?? DEFAULT_CENTER.lat + offset,
    lng: job.lng ?? DEFAULT_CENTER.lng + offset,
  }
}

export function GoogleMapView({ jobs, todayIds, onFallbackToLeaflet }: GoogleMapViewProps) {
  const [showToday, setShowToday] = useState(true)
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [startedJobId, setStartedJobId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRouteMode, setIsRouteMode] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [jobToComplete, setJobToComplete] = useState<Job | null>(null)
  const [viewJobDealId, setViewJobDealId] = useState<string | null>(null)
  const [viewJobTab, setViewJobTab] = useState<"activities" | "jobs" | "notes" | undefined>(undefined)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [hasMapsFailure, setHasMapsFailure] = useState(false)

  const mapRef = useRef<google.maps.Map | null>(null)
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim()

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  })

  const { jobsToday, jobsUpcoming } = useMemo(() => {
    const today: Job[] = []
    const upcoming: Job[] = []
    const now = new Date()
    jobs.forEach((job) => {
      const date = job.scheduledAt ? new Date(job.scheduledAt) : null
      const todayMatch = todayIds ? todayIds.has(job.id) : date ? isSameDay(date, now) : false
      if (todayMatch) today.push(job)
      else upcoming.push(job)
    })
    return { jobsToday: today, jobsUpcoming: upcoming }
  }, [jobs, todayIds])

  const activeTargetJob = useMemo(() => jobsToday.find((job) => job.status !== "COMPLETED") || null, [jobsToday])
  const effectiveActiveJobId = isRouteMode && activeTargetJob ? activeTargetJob.id : activeJobId

  useEffect(() => {
    if (isRouteMode && activeTargetJob && mapRef.current) {
      mapRef.current.panTo(getJobPosition(activeTargetJob))
      mapRef.current.setZoom(15)
    }
  }, [isRouteMode, activeTargetJob])

  const markers: { job: Job; isToday: boolean }[] = useMemo(
    () => [
      ...jobsToday.filter(() => showToday).map((job) => ({ job, isToday: true })),
      ...jobsUpcoming.filter(() => showUpcoming).map((job) => ({ job, isToday: false })),
    ],
    [jobsToday, jobsUpcoming, showToday, showUpcoming]
  )

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const selectJob = useCallback((job: Job) => {
    setActiveJobId(job.id)
    if (mapRef.current) {
      mapRef.current.panTo(getJobPosition(job))
      mapRef.current.setZoom(15)
    }
  }, [])

  const startJob = useCallback((job: Job) => {
    setStartedJobId(job.id)
    setActiveJobId(job.id)
    if (mapRef.current) {
      mapRef.current.panTo(getJobPosition(job))
      mapRef.current.setZoom(15)
    }
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

  useEffect(() => {
    const globalWindow = window as typeof window & { gm_authFailure?: () => void }
    const previous = globalWindow.gm_authFailure
    globalWindow.gm_authFailure = () => {
      setHasMapsFailure(true)
      previous?.()
    }

    return () => {
      globalWindow.gm_authFailure = previous
    }
  }, [])

  useEffect(() => {
    if (hasMapsFailure && onFallbackToLeaflet) {
      onFallbackToLeaflet()
    }
  }, [hasMapsFailure, onFallbackToLeaflet])

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserPosition(coords)
        setLocating(false)
        if (mapRef.current) {
          mapRef.current.panTo(coords)
          mapRef.current.setZoom(15)
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Auto-locate only if permission is already granted (avoid repeated prompts).
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
        // Ignore
      }
    }
    maybeAutoLocate()
    return () => {
      cancelled = true
    }
  }, [locateMe])

  useEffect(() => {
    const map = mapRef.current
    if (!map || markers.length === 0) {
      // If there are no markers yet, but we have user position, center there.
      if (map && userPosition) {
        map.panTo(userPosition)
        map.setZoom(15)
      }
      return
    }
    const bounds = new google.maps.LatLngBounds()
    markers.forEach(({ job }) => bounds.extend(getJobPosition(job)))
    if (userPosition) bounds.extend(userPosition)
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    const listener = google.maps.event.addListener(map, "idle", () => {
      const zoom = map.getZoom()
      if (zoom && zoom > 14) map.setZoom(14)
      google.maps.event.removeListener(listener)
    })
  }, [markers, userPosition])

  if (loadError || hasMapsFailure) {
    if (onFallbackToLeaflet) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
          <span className="text-sm">Loading map...</span>
        </div>
      )
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 p-4 text-center text-slate-600">
        <div>
          <p className="font-medium">Map failed to load</p>
          <p className="mt-1 text-sm">Check your Google Maps API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).</p>
        </div>
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 p-4 text-center text-slate-600">
        <div>
          <p className="font-medium">Google Maps requires an API key</p>
          <p className="mt-1 text-sm">Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to your environment.</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
        Loading map...
      </div>
    )
  }

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
              <span className="truncate text-[10px] font-medium">Jobs</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
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
                    const isSelected = job.id === effectiveActiveJobId
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
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          onLoad={onLoad}
          options={{
            scrollwheel: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
              { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
          }}
        >
          {markers.map(({ job, isToday }) => {
            if (isRouteMode && activeTargetJob && job.id !== activeTargetJob.id) {
              return null
            }

            const pos = getJobPosition(job)
            const isStarted = job.id === startedJobId

            return (
              <Marker
                key={job.id}
                position={pos}
                onClick={() => setActiveJobId(effectiveActiveJobId === job.id ? null : job.id)}
                icon={
                  isToday
                    ? undefined
                    : {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#64748B",
                        fillOpacity: 0.9,
                        strokeColor: "#475569",
                        strokeWeight: 2,
                      }
                }
                zIndex={isToday ? 2 : 1}
              >
                {effectiveActiveJobId === job.id && (
                  <InfoWindow onCloseClick={() => setActiveJobId(null)}>
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
                      <div className="mt-2 flex w-full gap-2">
                        <button
                          type="button"
                          onClick={() => startJob(job)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                          <Navigation className="h-3 w-3" />
                          {isStarted ? "Navigate" : "Start Job"}
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
                        {isRouteMode && isStarted && (
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
                  </InfoWindow>
                )}
              </Marker>
            )
          })}

          {userPosition && (
            <Marker
              position={userPosition}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeColor: "#FFFFFF",
                strokeWeight: 3,
              }}
              zIndex={10}
              title="Your location"
            />
          )}
        </GoogleMap>

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
