"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"
import { Compass, CalendarClock, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Job {
  id: string
  title: string
  clientName: string
  address: string
  status: string
  scheduledAt?: Date
  lat?: number
  lng?: number
}

interface GoogleMapViewProps {
  jobs: Job[]
  todayIds?: Set<string>
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

export function GoogleMapView({ jobs, todayIds }: GoogleMapViewProps) {
  const [showToday, setShowToday] = useState(true)
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  const apiKey = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "") : ""

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "no-key",
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
    <div className="h-full w-full relative">
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
        mapContainerClassName="rounded-xl"
      >
        {markers.map(({ job, isToday }) => {
          const pos = getJobPosition(job)
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
                  </div>
                </InfoWindow>
              )}
            </Marker>
          )
        })}
      </GoogleMap>

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
