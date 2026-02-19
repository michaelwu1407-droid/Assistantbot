"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useState, useMemo } from "react"
import { Compass, CalendarClock, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

// Cleaner map tiles (CartoDB Positron - light, minimal)
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Custom icons: solid for today, outline/dashed for upcoming
function createIcon(opts: { isToday: boolean }) {
  const color = opts.isToday ? "#0D9488" : "#64748B"
  const fill = opts.isToday ? color : "transparent"
  const stroke = color
  const size = 28
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

const defaultIconToday = createIcon({ isToday: true })
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
  /** If not provided, jobs are split by scheduledAt being today vs not */
  todayIds?: Set<string>
}

const DEFAULT_CENTER: [number, number] = [-37.8136, 144.9631]

function getJobPosition(job: Job): [number, number] {
  const offset = (job.id.charCodeAt(0) % 10 - 5) * 0.004
  return [job.lat ?? DEFAULT_CENTER[0] + offset, job.lng ?? DEFAULT_CENTER[1] + offset]
}

function FitBounds({ jobs, showToday, showUpcoming }: { jobs: Job[]; showToday: boolean; showUpcoming: boolean }) {
  const map = useMap()
  const visible = useMemo(() => {
    return jobs.filter((j) => {
      const isToday = j.scheduledAt ? isSameDay(new Date(j.scheduledAt), new Date()) : false
      return (isToday && showToday) || (!isToday && showUpcoming)
    })
  }, [jobs, showToday, showUpcoming])

  useEffect(() => {
    if (visible.length === 0) return
    const points = visible.map(getJobPosition)
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
  }, [map, visible])

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

  const center: [number, number] = DEFAULT_CENTER

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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500">
        Loading map…
      </div>
    )
  }

  const markers: { job: Job; isToday: boolean }[] = [
    ...jobsToday.filter(() => showToday).map((job) => ({ job, isToday: true })),
    ...jobsUpcoming.filter(() => showUpcoming).map((job) => ({ job, isToday: false })),
  ]

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full z-0 rounded-xl"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
        <FitBounds jobs={jobs} showToday={showToday} showUpcoming={showUpcoming} />

        {markers.map(({ job, isToday }) => {
          const [lat, lng] = getJobPosition(job)
          return (
            <Marker
              key={job.id}
              position={[lat, lng]}
              icon={isToday ? defaultIconToday : defaultIconUpcoming}
            >
              <Popup>
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
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Legend: click to expand, minimal */}
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
              <input
                type="checkbox"
                checked={showToday}
                onChange={(e) => setShowToday(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                <Compass className="h-4 w-4 text-teal-600" />
                Today&apos;s jobs
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUpcoming}
                onChange={(e) => setShowUpcoming(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                <CalendarClock className="h-4 w-4 text-slate-500" />
                Upcoming jobs
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
