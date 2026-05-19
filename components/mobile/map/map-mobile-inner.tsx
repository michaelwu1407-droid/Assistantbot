"use client"

import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useMemo } from "react"
import type { Job } from "@/components/map/map-view"

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093]

function getPos(job: Job): [number, number] {
  if (job.lat != null && job.lng != null) return [job.lat, job.lng]
  const offset = (job.id.charCodeAt(0) % 10 - 5) * 0.004
  return [DEFAULT_CENTER[0] + offset, DEFAULT_CENTER[1] + offset]
}

function makePinIcon(isToday: boolean) {
  const color = isToday ? "#059669" : "#64748B"
  const svg = `<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}"/>
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!positions.length) return
    map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 14 })
  }, [map, positions])
  return null
}

function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 0.6 })
  }, [map, position])
  return null
}

interface Props {
  jobs: Job[]
  selectedJobId: string | null
  userPosition: [number, number] | null
  onSelectJob: (job: Job) => void
}

export function MapMobileInner({ jobs, selectedJobId, userPosition, onSelectJob }: Props) {
  const todaySet = useMemo(() => {
    const s = new Set<string>()
    const today = new Date().toDateString()
    jobs.forEach((j) => {
      if (j.scheduledAt && new Date(j.scheduledAt).toDateString() === today) s.add(j.id)
    })
    return s
  }, [jobs])

  const positions = useMemo(() => jobs.map(getPos), [jobs])
  const flyTarget = useMemo(() => {
    const j = jobs.find((x) => x.id === selectedJobId)
    return j ? getPos(j) : null
  }, [jobs, selectedJobId])

  return (
    <MapContainer
      center={userPosition ?? DEFAULT_CENTER}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
      {!selectedJobId && <FitBounds positions={positions} />}
      <FlyTo position={flyTarget} />
      {userPosition && (
        <CircleMarker
          center={userPosition}
          radius={7}
          pathOptions={{ color: "#4285F4", weight: 2, fillOpacity: 0.2 }}
        />
      )}
      {jobs.map((job) => (
        <Marker
          key={job.id}
          position={getPos(job)}
          icon={makePinIcon(todaySet.has(job.id))}
          eventHandlers={{ click: () => onSelectJob(job) }}
        />
      ))}
    </MapContainer>
  )
}
