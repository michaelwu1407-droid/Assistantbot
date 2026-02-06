"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
// import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css"
// import "leaflet-defaulticon-compatibility"
import { DealView } from "@/actions/deal-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navigation } from "lucide-react"
import L from "leaflet"

interface JobMapProps {
    deals: DealView[]
}

// Mock geocoding helper - in a real app this would use Google Maps API or similar
// For now, we'll scatter points around a center coordinate (e.g., Sydney CBD)
const SYDNEY_CBD = { lat: -33.8688, lng: 151.2093 }

function getMockCoordinates(id: string) {
    // Deterministic randomish based on ID char codes to keep pins stable
    const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const latOffset = (hash % 100) / 1000 - 0.05 // +/- 0.05 degrees
    const lngOffset = ((hash * 13) % 100) / 1000 - 0.05
    return {
        lat: SYDNEY_CBD.lat + latOffset,
        lng: SYDNEY_CBD.lng + lngOffset
    }
}

export default function JobMap({ deals }: JobMapProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Fix for default markers - MUST run on client only
        // This prevents SSR crashes because L.Icon.Default.prototype accesses window/document
        delete (L.Icon.Default.prototype as any)._getIconUrl;

        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        setMounted(true)
    }, [])

    if (!mounted) return <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">Loading Map...</div>

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={[SYDNEY_CBD.lat, SYDNEY_CBD.lng]}
                zoom={11}
                scrollWheelZoom={true}
                className="w-full h-full rounded-xl shadow-inner border border-slate-200"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {deals.map(deal => {
                    const coords = getMockCoordinates(deal.id)
                    return (
                        <Marker key={deal.id} position={[coords.lat, coords.lng]}>
                            <Popup>
                                <div className="p-1 min-w-[200px]">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-sm line-clamp-1">{deal.title}</h3>
                                        <Badge variant="outline" className="text-[10px] h-5">{deal.stage}</Badge>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-3">
                                        {deal.value ? `$${deal.value.toLocaleString()}` : 'No value'}
                                    </div>
                                    <Button size="sm" className="w-full h-7 text-xs" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`)}>
                                        <Navigation className="w-3 h-3 mr-1.5" />
                                        Navigate
                                    </Button>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    )
}
