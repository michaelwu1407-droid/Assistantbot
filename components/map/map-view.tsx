"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useState, useMemo, useCallback } from "react"
import { Compass, CalendarClock, Layers, Navigation, MapPin, Clock, ChevronDown, ChevronUp, Route, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateJobStatus } from "@/actions/tradie-actions"
import { JobCompletionModal } from "@/components/tradie/job-completion-modal"

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

function hasRealPosition(job: Job): boolean {
  return job.lat != null && job.lng != null
}

function getJobPosition(job: Job): [number, number] {
  return [job.lat!, job.lng!]
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
  const [isMounted, setIsMounted] = useState(false)
  const [showToday, setShowToday] = useState(true)
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [startedJobId, setStartedJobId] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [jobListExpanded, setJobListExpanded] = useState(true)
  const [isRouteMode, setIsRouteMode] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [jobToComplete, setJobToComplete] = useState<Job | null>(null)

  const { jobsToday, jobsUpcoming } = useMemo(() => {
    const today: Job[] = []
    const upcoming: Job[] = []
    const now = new Date()
    jobs.filter(hasRealPosition).forEach((j) => {
      const d = j.scheduledAt ? new Date(j.scheduledAt) : null
      const isToday = todayIds ? todayIds.has(j.id) : d ? isSameDay(d, now) : false
      if (isToday) today.push(j)
      else upcoming.push(j)
    })
    today.sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
      return ta - tb
    })
    return { jobsToday: today, jobsUpcoming: upcoming }
  }, [jobs, todayIds])

  // Identifies the immediate next sequence target
  const activeTargetJob = useMemo(() => {
    return jobsToday.find(j => j.status !== "COMPLETED") || null
  }, [jobsToday])

  // Automatically focus on the active target when Route Mode activates
  useEffect(() => {
    if (isRouteMode && activeTargetJob) {
      setFlyTarget(getJobPosition(activeTargetJob))
      setSelectedJobId(activeTargetJob.id)
    }
  }, [isRouteMode, activeTargetJob])

  const selectJob = useCallback((job: Job) => {
    setSelectedJobId(job.id)
    setFlyTarget(getJobPosition(job))
  }, [])

  const startJob = useCallback((job: Job) => {
    setStartedJobId(job.id)
    setSelectedJobId(job.id)
    setFlyTarget(getJobPosition(job))
    // Open Google Maps navigation to this job
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

  useEffect(() => { setIsMounted(true) }, [])

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500">
        Loading map…
      </div>
    )
  }

  const visiblePositions: [number, number][] = [
    ...(showToday ? jobsToday.map(getJobPosition) : []),
    ...(showUpcoming && !isRouteMode ? jobsUpcoming.map(getJobPosition) : []),
  ]

  // Filter map markers: In Route mode, ONLY show the active target (or nothing if done)
  const visibleTodayJobs = isRouteMode
    ? (activeTargetJob ? [activeTargetJob] : [])
    : jobsToday;

  return (
    <div className="h-full w-full relative flex">
      {/* Job List Sidebar */}
      {jobsToday.length > 0 && (
        <div className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden z-10">
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
              <button onClick={() => setJobListExpanded((e) => !e)}>
                {jobListExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
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
                jobsToday.map((job) => {
                  const time = job.scheduledAt
                    ? new Date(job.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
                    : "No time set"
                  const isSelected = job.id === selectedJobId
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

                      {/* Start Job / Navigate buttons — only shown when selected */}
                      {isSelected && (
                        <div className="px-3 pb-3 flex gap-2">
                          {!isStarted ? (
                            <button
                              onClick={() => startJob(job)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              Start Job
                            </button>
                          ) : (
                            <button
                              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`, "_blank")}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
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

      {/* Map */}
      <div className="flex-1 min-w-0 relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom={true}
          className="h-full w-full z-0 rounded-xl"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
          {!selectedJobId && <FitBounds positions={visiblePositions} />}
          <FlyToJob position={flyTarget} />

          {/* Today's markers (Filtered if Route Mode is active) */}
          {showToday && visibleTodayJobs.map((job) => {
            const [lat, lng] = getJobPosition(job)
            const isSelected = isRouteMode || job.id === selectedJobId
            const isStarted = job.id === startedJobId
            return (
              <Marker
                key={job.id}
                position={[lat, lng]}
                icon={createIcon({ isToday: true, isActive: isSelected, isStarted })}
                eventHandlers={{ click: () => selectJob(job) }}
              >
                <Popup>
                  <div className="text-slate-900 min-w-[180px]">
                    <strong className="block text-sm font-bold">{job.clientName}</strong>
                    <span className="text-xs text-slate-600">{job.title}</span>
                    <br />
                    <span className="text-xs text-slate-500">{job.address}</span>
                    {job.scheduledAt && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(job.scheduledAt).toLocaleDateString(undefined, {
                          weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                    )}
                    <div className="flex gap-2 w-full mt-2">
                      <button
                        onClick={() => startJob(job)}
                        className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Navigation className="h-3 w-3" /> {job.id === startedJobId ? "Navigate" : "Start Job"}
                      </button>
                      {isRouteMode && job.id === startedJobId && (
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
                </Popup>
              </Marker>
            )
          })}

          {/* Upcoming markers (Hidden in Route Mode) */}
          {showUpcoming && !isRouteMode && jobsUpcoming.map((job) => {
            const [lat, lng] = getJobPosition(job)
            return (
              <Marker key={job.id} position={[lat, lng]} icon={defaultIconUpcoming}>
                <Popup>
                  <div className="text-slate-900 min-w-[160px]">
                    <strong className="block text-sm font-bold">{job.clientName}</strong>
                    <span className="text-xs text-slate-600">{job.title}</span>
                    <br />
                    <span className="text-xs text-slate-500">{job.address}</span>
                    {job.scheduledAt && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(job.scheduledAt).toLocaleDateString(undefined, {
                          weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

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
    </div>
  )
}
