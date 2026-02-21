"use client"

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useState, useMemo, useCallback } from "react"
import { Compass, CalendarClock, Layers, Navigation, ChevronRight, MapPin, Clock, Phone, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function createIcon(opts: { isToday: boolean; index?: number; isActive?: boolean }) {
  const color = opts.isActive ? "#059669" : opts.isToday ? "#0D9488" : "#64748B"
  const fill = opts.isToday ? color : "transparent"
  const stroke = color
  const size = opts.isActive ? 36 : 28
  const showNumber = opts.isToday && opts.index != null
  const svg = showNumber
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${fill}" stroke="${stroke}" stroke-width="0"/>
        <text x="12" y="11" text-anchor="middle" font-size="8" font-weight="bold" fill="white" font-family="Arial">${opts.index! + 1}</text>
      </svg>`
    : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill="${fill}" stroke="${stroke}" stroke-width="${opts.isToday ? "0" : "2"}"
          stroke-dasharray="${opts.isToday ? "0" : "4 2"}"/>
        <circle cx="12" cy="9" r="2.5" fill="${opts.isToday ? "white" : stroke}"/>
      </svg>`
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

const defaultIconUpcoming = createIcon({ isToday: false })

interface Job {
  id: string
  title: string
  clientName: string
  address: string
  status: string
  scheduledAt?: Date
  lat?: number
  lng?: number
}

interface MapViewProps {
  jobs: Job[]
  todayIds?: Set<string>
}

const DEFAULT_CENTER: [number, number] = [-37.8136, 144.9631]

function getJobPosition(job: Job): [number, number] {
  const offset = (job.id.charCodeAt(0) % 10 - 5) * 0.004
  return [job.lat ?? DEFAULT_CENTER[0] + offset, job.lng ?? DEFAULT_CENTER[1] + offset]
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
  const [routeMode, setRouteMode] = useState(false)
  const [activeJobIndex, setActiveJobIndex] = useState(0)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)

  const { jobsToday, jobsUpcoming } = useMemo(() => {
    const today: Job[] = []
    const upcoming: Job[] = []
    const now = new Date()
    jobs.forEach((j) => {
      const d = j.scheduledAt ? new Date(j.scheduledAt) : null
      const isToday = todayIds ? todayIds.has(j.id) : d ? isSameDay(d, now) : false
      if (isToday) today.push(j)
      else upcoming.push(j)
    })
    // Sort today's jobs by scheduled time
    today.sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
      return ta - tb
    })
    return { jobsToday: today, jobsUpcoming: upcoming }
  }, [jobs, todayIds])

  // Route line positions for today's jobs
  const routePositions = useMemo(() => jobsToday.map(getJobPosition), [jobsToday])

  const navigateToJob = useCallback((address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, "_blank")
  }, [])

  const focusJob = useCallback((index: number) => {
    setActiveJobIndex(index)
    if (jobsToday[index]) {
      setFlyTarget(getJobPosition(jobsToday[index]))
    }
  }, [jobsToday])

  useEffect(() => { setIsMounted(true) }, [])

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500">
        Loading map…
      </div>
    )
  }

  // All visible positions for FitBounds
  const visiblePositions: [number, number][] = [
    ...(showToday ? jobsToday.map(getJobPosition) : []),
    ...(showUpcoming ? jobsUpcoming.map(getJobPosition) : []),
  ]

  return (
    <div className="h-full w-full relative flex">
      {/* Route Sidebar — only in route mode */}
      {routeMode && jobsToday.length > 0 && (
        <div className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden z-10">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-emerald-600" />
                Today&apos;s Route
              </h3>
              <button
                onClick={() => setRouteMode(false)}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">{jobsToday.length} stops in order</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {jobsToday.map((job, i) => {
              const time = job.scheduledAt
                ? new Date(job.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
                : "No time"
              const isActive = i === activeJobIndex
              return (
                <div key={job.id}>
                  <button
                    onClick={() => focusJob(i)}
                    className={cn(
                      "w-full text-left p-3 transition-all border-l-4",
                      isActive
                        ? "bg-emerald-50 border-l-emerald-500"
                        : "bg-white border-l-transparent hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                        isActive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{job.clientName}</p>
                        <p className="text-xs text-slate-600 truncate">{job.title}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{job.address}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />{time}
                        </p>
                      </div>
                    </div>
                  </button>
                  {isActive && (
                    <div className="px-3 pb-3 flex gap-2">
                      <button
                        onClick={() => navigateToJob(job.address)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Navigate
                      </button>
                      {i < jobsToday.length - 1 && (
                        <button
                          onClick={() => focusJob(i + 1)}
                          className="flex items-center justify-center gap-1 py-2 px-3 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Next <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  {i < jobsToday.length - 1 && (
                    <div className="flex items-center gap-2 px-3 py-1">
                      <div className="w-7 flex justify-center">
                        <div className="w-0.5 h-4 bg-slate-200" />
                      </div>
                      <span className="text-[10px] text-slate-400">↓</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Navigate all button */}
          {jobsToday.length > 1 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  const waypoints = jobsToday.map(j => encodeURIComponent(j.address))
                  const origin = waypoints.shift()
                  const dest = waypoints.pop()
                  const waypointsStr = waypoints.length > 0 ? `&waypoints=${waypoints.join("|")}` : ""
                  window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypointsStr}`, "_blank")
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Navigation className="h-4 w-4" />
                Navigate Full Route
              </button>
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
          {!routeMode && <FitBounds positions={visiblePositions} />}
          {routeMode && <FlyToJob position={flyTarget} />}

          {/* Route line connecting today's jobs */}
          {routeMode && routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{ color: "#059669", weight: 3, dashArray: "8 6", opacity: 0.7 }}
            />
          )}

          {/* Today's markers */}
          {showToday && jobsToday.map((job, i) => {
            const [lat, lng] = getJobPosition(job)
            const isActive = routeMode && i === activeJobIndex
            return (
              <Marker
                key={job.id}
                position={[lat, lng]}
                icon={createIcon({ isToday: true, index: i, isActive })}
                eventHandlers={routeMode ? { click: () => focusJob(i) } : undefined}
              >
                <Popup>
                  <div className="text-slate-900 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <strong className="text-sm font-bold">{job.clientName}</strong>
                    </div>
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
                    <button
                      onClick={() => navigateToJob(job.address)}
                      className="mt-2 w-full py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Navigation className="h-3 w-3" /> Navigate
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Upcoming markers */}
          {showUpcoming && jobsUpcoming.map((job) => {
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

        {/* Route mode toggle */}
        {jobsToday.length > 0 && !routeMode && (
          <button
            onClick={() => { setRouteMode(true); setActiveJobIndex(0); setFlyTarget(getJobPosition(jobsToday[0])); }}
            className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all font-semibold text-sm"
          >
            <Navigation className="h-4 w-4" />
            Start Route ({jobsToday.length} stops)
          </button>
        )}

        {/* Legend */}
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
      </div>
    </div>
  )
}
