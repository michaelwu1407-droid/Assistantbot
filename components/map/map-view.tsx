"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useState } from "react"

// Fix for default marker icon in Next.js/Webpack
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

// Override default icon
const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Job {
    id: string
    title: string
    clientName: string
    address: string
    status: string
    // In a real app we'd have lat/lng. For demo we mock or geocode.
    lat?: number
    lng?: number
}

interface MapViewProps {
    jobs: Job[]
}

export default function MapView({ jobs }: MapViewProps) {
    const [isMounted, setIsMounted] = useState(false)

    // Default center (Melbourne for demo)
    const [center, setCenter] = useState<[number, number]>([-37.8136, 144.9631])

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-500">Loading Map...</div>
    }

    return (
        <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
            style={{ height: "100%", width: "100%" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {jobs.map((job, idx) => {
                // Mock coordinates if missing (staggered for demo)
                const lat = job.lat || -37.8136 + (Math.random() * 0.05 - 0.025)
                const lng = job.lng || 144.9631 + (Math.random() * 0.05 - 0.025)

                return (
                    <Marker key={job.id} position={[lat, lng]}>
                        <Popup>
                            <div className="text-slate-900">
                                <strong className="block text-sm font-bold">{job.clientName}</strong>
                                <span className="text-xs">{job.title}</span><br />
                                <span className="text-xs text-slate-500">{job.address}</span>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    )
}
