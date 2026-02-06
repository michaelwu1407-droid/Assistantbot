"use client"

// leaflet-map is a client-only component
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { GeocodedDeal } from "@/actions/geo-actions"

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
  // Default center (Sydney) if no deals
  const center: [number, number] = deals.length > 0
    ? [deals[0].latitude, deals[0].longitude]
    : [-33.8688, 151.2093]

  return (
    <MapContainer 
      center={center} 
      zoom={11} 
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {deals.map((deal) => (
        <Marker 
          key={deal.id} 
          position={[deal.latitude, deal.longitude]}
          icon={icon}
        >
          <Popup>
            <div className="min-w-[200px]">
              <h3 className="font-semibold text-slate-900">{deal.title}</h3>
              <p className="text-sm text-slate-500 mb-2">{deal.address}</p>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  deal.stage === 'won' ? 'bg-green-50 text-green-700 border-green-200' :
                  deal.stage === 'negotiation' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {deal.stage.toUpperCase()}
                </span>
                <span className="text-xs font-medium text-slate-900">
                  ${deal.value.toLocaleString()}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
