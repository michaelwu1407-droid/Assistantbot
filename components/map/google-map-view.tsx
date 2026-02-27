"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import { Compass, CalendarClock, Layers, MapPin, Clock, Navigation, ChevronRight, Route, CheckCircle2, LocateFixed } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateJobStatus } from "@/actions/tradie-actions"
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
  /** When Google Maps fails to load (e.g. invalid API key), parent can switch to Leaflet */
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
  const [jobListExpanded, setJobListExpanded] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRouteMode, setIsRouteMode] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [jobToComplete, setJobToComplete] = useState<Job | null>(null)
  const [viewJobDealId, setViewJobDealId] = useState<string | null>(null)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)

  const mapRef = useRef<google.maps.Map | null>(null)

  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim()

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  })

  const { jobsToday, jobsUpcoming } = useMemo(() => {
    const today: Job[] = []
    const upcoming: Job[] = []
    const now = new Date()
    jobs.forEach((j) => {
      const d = j.scheduledAt ? new Date(j.scheduledAt) : null
      const isToday = todayIds
        ? todayIds.has(j.id)
        : d
          ? isSameDay(d, now)
          : false
      if (isToday) today.push(j)
      else upcoming.push(j)
    })
    return { jobsToday: today, jobsUpcoming: upcoming }
  }, [jobs, todayIds])

  // Identifies the immediate next sequence target
  const activeTargetJob = useMemo(() => {
    return jobsToday.find(j => j.status !== "COMPLETED") || null
  }, [jobsToday])

  // Automatically focus on the active target when Route Mode activates
  useEffect(() => {
    if (isRouteMode && activeTargetJob && mapRef.current) {
      mapRef.current.panTo(getJobPosition(activeTargetJob))
      mapRef.current.setZoom(15)
      setActiveJobId(activeTargetJob.id)
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
    if (loadError && onFallbackToLeaflet) onFallbackToLeaflet()
  }, [loadError, onFallbackToLeaflet])

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
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

  useEffect(() => {
    const map = mapRef.current
    if (!map || markers.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    markers.forEach(({ job }) => bounds.extend(getJobPosition(job)))
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    const listener = google.maps.event.addListener(map, "idle", () => {
      const z = map.getZoom()
      if (z && z > 14) map.setZoom(14)
      google.maps.event.removeListener(listener)
    })
  }, [markers])

  if (loadError) {
    if (onFallbackToLeaflet) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-500">
          <span className="text-sm">Loading map…</span>
        </div>
      )
    }
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-600 p-4 text-center">
        <div>
          <p className="font-medium">Map failed to load</p>
          <p className="text-sm mt-1">Check your Google Maps API key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).</p>
        </div>
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-600 p-4 text-center">
        <div>
          <p className="font-medium">Google Maps requires an API key</p>
          <p className="text-sm mt-1">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment.</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500">
        Loading map…
      </div>
    )
  }

  return (
    <div className="h-full w-full relative flex min-h-0">
      {/* Job List Sidebar — collapsible so map can use full width */}
      <div className={cn("shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden z-10 transition-[width] duration-200", sidebarCollapsed ? "w-12" : "w-80")}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-3 gap-2">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                title="Expand Today's Jobs"
              >
                <MapPin className="h-4 w-4 text-teal-600" />
                <span className="text-[10px] font-medium truncate">Jobs</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  Today&apos;s Jobs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{jobsToday.length} job{jobsToday.length !== 1 ? "s" : ""}</p>
              </div>
              <button type="button" onClick={() => setSidebarCollapsed(true)} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors" title="Minimise panel">
                <ChevronRight className="h-5 w-5 rotate-180 stroke-[2.5]" />
              </button>
            </div>

            <button
              onClick={() => setIsRouteMode(!isRouteMode)}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-colors",
                isRouteMode
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              )}
            >
              <Route className="h-4 w-4" />
              {isRouteMode ? "Exit Route Mode" : "Enable Route Mode"}
            </button>
          </div>

          {/* Job Cards */}
          {jobListExpanded && (
            <div className="flex-1 overflow-y-auto">
              {!isRouteMode ? (
                // Standard List View
                jobsToday.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No jobs scheduled for today.</div>
                ) : jobsToday.map((job) => {
                  const time = job.scheduledAt
                    ? new Date(job.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
                    : "No time set"
                  const isSelected = job.id === activeJobId
                  const isStarted = job.id === startedJobId
                  return (
                    <div key={job.id} className={cn(
                      "border-b border-slate-100 transition-all",
                      isSelected && "bg-blue-50",
                      isStarted && "bg-emerald-50"
                    )}>
                      <button
                        onClick={() => selectJob(job)}
                        className={cn(
                          "w-full text-left p-3 border-l-4 transition-all",
                          isStarted
                            ? "border-l-emerald-500"
                            : isSelected
                              ? "border-l-blue-500"
                              : "border-l-transparent hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0 mt-1.5",
                            isStarted ? "bg-emerald-500" : isSelected ? "bg-blue-500" : "bg-teal-500"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">{job.clientName}</p>
                              {isStarted && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                  In Progress
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 truncate">{job.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-400 flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />{job.address}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 shrink-0" />{time}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* View Job (deal card modal) / Open in Google Maps — only shown when selected */}
                      {isSelected && (
                        <div className="px-3 pb-3 flex flex-col gap-2">
                          <button
                            onClick={() => setViewJobDealId(job.id)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            View Job
                          </button>
                          <button
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`, "_blank")}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Open in Google Maps
                          </button>
                          {isStarted && (
                            <button
                              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`, "_blank")}
                              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
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
              ) : (
                // Route Sequential View
                <div className="p-3 flex flex-col h-full">
                  {activeTargetJob ? (
                    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                      <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Active Target</span>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 leading-tight">{activeTargetJob.clientName}</h4>
                          <p className="text-sm text-slate-600 mt-0.5">{activeTargetJob.title}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2 text-sm text-slate-700">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                            <span>{activeTargetJob.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                            <span>{activeTargetJob.scheduledAt ? new Date(activeTargetJob.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }) : "No time set"}</span>
                          </div>
                        </div>

                        {/* Route Actions */}
                        <div className="flex flex-col gap-2 mt-2">
                          <button
                            onClick={() => startJob(activeTargetJob)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            <Navigation className="h-4 w-4" />
                            Navigate to Job
                          </button>

                          {activeTargetJob.id === startedJobId && (
                            <button
                              onClick={() => finishJob(activeTargetJob)}
                              disabled={isCompleting}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {isCompleting ? "Finishing..." : "Complete & Next"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">All Done!</h4>
                      <p className="text-sm text-slate-500 mt-1">You've completed all scheduled jobs for today.</p>
                    </div>
                  )}

                  {/* Future Queue summary */}
                  {activeTargetJob && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 px-1">Up Next</p>
                      <div className="space-y-2">
                        {jobsToday.filter(j => j.status !== "COMPLETED" && j.id !== activeTargetJob.id).map((job, idx) => (
                          <div key={job.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 opacity-60">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 2}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-700 truncate">{job.clientName}</p>
                              <p className="text-[10px] text-slate-500 truncate">{job.address}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
            </div>
          )}
        </div>

      {/* Map */}
      <div className="flex-1 min-w-0 relative min-h-[300px]">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          onLoad={onLoad}
          options={{
            scrollwheel: true,
            mapTypeControl: false,
            streetViewControl: false, // Disabling streetview to keep UI clean
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
              { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
          }}
          mapContainerClassName=""
        >
          {markers.map(({ job, isToday }) => {
            // In Route Mode, suppress ALL markers except the active target
            if (isRouteMode && activeTargetJob && job.id !== activeTargetJob.id) {
              return null;
            }

            const pos = getJobPosition(job)
            const isStarted = job.id === startedJobId;
            return (
              <Marker
                key={job.id}
                position={pos}
                onClick={() => setActiveJobId(activeJobId === job.id ? null : job.id)}
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
                {activeJobId === job.id && (
                  <InfoWindow onCloseClick={() => setActiveJobId(null)}>
                    <div className="text-slate-900 min-w-[160px]">
                      <strong className="block text-sm font-bold">{job.clientName}</strong>
                      <span className="text-xs text-slate-600">{job.title}</span>
                      <br />
                      <span className="text-xs text-slate-500">{job.address}</span>
                      {job.scheduledAt && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          {new Date(job.scheduledAt).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      <div className="flex gap-2 w-full mt-2">
                        <button
                          onClick={() => startJob(job)}
                          className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <Navigation className="h-3 w-3" /> {isStarted ? "Navigate" : "Start Job"}
                        </button>
                        {isRouteMode && isStarted && (
                          <button
                            onClick={() => finishJob(job)}
                            disabled={isCompleting}
                            className="flex-1 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Finish
                          </button>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            )
          })}
          {/* User position marker */}
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

        {/* Locate Me button */}
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="absolute top-4 right-4 z-[1000] rounded-xl border border-slate-200 bg-white/95 shadow-lg px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
          title="Find my location"
        >
          <LocateFixed className={cn("h-4 w-4 text-blue-600", locating && "animate-spin")} />
          <span className="text-xs font-semibold text-slate-600">{locating ? "Locating..." : "My Location"}</span>
        </button>

        {/* Legend (Hidden in Route Mode) */}
        {!isRouteMode && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            <button
              type="button"
              onClick={() => setLegendOpen((o) => !o)}
              className={cn(
                "rounded-xl border border-slate-200 bg-white/95 shadow-lg transition-all flex items-center gap-2",
                legendOpen ? "p-3" : "px-3 py-2"
              )}
            >
              <Layers className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-600">Layers</span>
            </button>
            {legendOpen && (
              <div className="absolute left-0 bottom-full mb-1 rounded-xl border border-slate-200 bg-white/95 shadow-lg p-3 space-y-2 min-w-[180px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showToday} onChange={(e) => setShowToday(e.target.checked)} className="rounded border-slate-300" />
                  <span className="flex items-center gap-1.5 text-sm text-slate-700">
                    <Compass className="h-4 w-4 text-teal-600" />Today&apos;s jobs
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showUpcoming} onChange={(e) => setShowUpcoming(e.target.checked)} className="rounded border-slate-300" />
                  <span className="flex items-center gap-1.5 text-sm text-slate-700">
                    <CalendarClock className="h-4 w-4 text-slate-500" />Upcoming jobs
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completion Modal Integration */}
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
        onOpenChange={(open) => !open && setViewJobDealId(null)}
      />
    </div>
  )
}
