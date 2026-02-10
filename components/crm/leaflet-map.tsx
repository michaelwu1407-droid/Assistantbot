"use client"

import { useRouter } from "next/navigation"
import { useIndustry } from "@/components/providers/industry-provider"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { GeocodedDeal } from "@/actions/geo-actions"
import { MapPin, User, Calendar, DollarSign, Navigation } from "lucide-react"
import { format } from "date-fns"

// Fix for Leaflet default icon in Next.js/Webpack
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

interface LeafletMapProps {
  deals: GeocodedDeal[]
}

export default function LeafletMap({ deals }: LeafletMapProps) {
  const router = useRouter()
  const { industry } = useIndustry()

  // Default center (Sydney) if no deals
  const center: [number, number] = deals.length > 0
    ? [deals[0].latitude, deals[0].longitude]
    : [-33.8688, 151.2093]

  const handlePopupClick = (dealId: string) => {
    if (industry === "TRADES") {
      router.push(`/dashboard/tradie/jobs/${dealId}`)
    } else {
      router.push(`/dashboard/deals/${dealId}`)
    }
  }

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {deals.map((deal) => (
        <Marker
          key={deal.id}
          position={[deal.latitude, deal.longitude]}
          icon={icon}
        >
          <Popup className="custom-popup">
            <div
              className="min-w-[240px] p-1 cursor-pointer hover:bg-slate-50 transition-colors rounded"
              onClick={() => handlePopupClick(deal.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-base text-slate-900 leading-tight pr-2">
                  {deal.title}
                </h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${deal.stage === 'won' ? 'bg-green-100 text-green-700' :
                    deal.stage === 'negotiation' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                  }`}>
                  {deal.stage}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-snug">{deal.address}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{deal.contactName}</span>
                </div>

                {deal.scheduledAt && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 p-1.5 rounded">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{format(new Date(deal.scheduledAt), "EEE, MMM d • h:mm a")}</span>
                    </div>
                )}

                {deal.value > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <DollarSign className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>${deal.value.toLocaleString()}</span>
                    </div>
                )}
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${deal.latitude},${deal.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-2 w-full py-2 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-800 transition-colors"
              >
                <Navigation className="h-3 w-3" />
                Get Directions
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
