"use client"

import { useRouter } from "next/navigation"
import { useIndustry } from "@/components/providers/industry-provider"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { GeocodedDeal } from "@/actions/geo-actions"
import { MapPin, User, Calendar, DollarSign, Navigation, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { renderToStaticMarkup } from "react-dom/server"

// Custom Marker Icon Generator
const createCustomIcon = (stage: string) => {
  let colorClass = "text-muted-foreground fill-background" // Default
  if (stage === 'won') colorClass = "text-emerald-500 fill-emerald-100"
  if (stage === 'negotiation') colorClass = "text-amber-500 fill-amber-100"
  if (stage === 'contacted') colorClass = "text-primary fill-primary/20"

  const iconHtml = renderToStaticMarkup(
    <div className="relative group cursor-pointer transform transition-transform hover:scale-110">
      <div className={`filter drop-shadow-md ${colorClass}`}>
        <MapPin size={32} strokeWidth={2} className="w-8 h-8" fill="currentColor" fillOpacity={0.2} />
      </div>
    </div>
  )

  return L.divIcon({
    html: iconHtml,
    className: "bg-transparent border-none",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

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
    // Navigate based on industry context or general deal page
    router.push(`/dashboard/deals/${dealId}`)
  }

  return (
    // z-index: 0 ensures it doesn't bleed through overlays (UI-3)
    // isolation: isolate creates a new stacking context to prevent z-index issues
    <div className="h-full w-full relative z-0 isolate">
      <style jsx global>{`
          .leaflet-popup-content-wrapper {
            padding: 0 !important;
            overflow: hidden !important;
            border-radius: 0.75rem !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            background: hsl(var(--background)) !important;
            color: hsl(var(--foreground)) !important;
            border: 1px solid hsl(var(--border));
          }
          .leaflet-popup-content {
            margin: 0 !important;
            width: 300px !important;
          }
          .leaflet-container {
            font-family: inherit !important;
            z-index: 0;
          }
          /* Hide Google/Leaflet default controls if needed or style them */
        `}</style>

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        scrollWheelZoom={true}
      >
        {/* CARTO Positron (Premium Light Theme) - Keeping for now as it's a good neutral base */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {deals.map((deal) => (
          <Marker
            key={deal.id}
            position={[deal.latitude, deal.longitude]}
            icon={createCustomIcon(deal.stage.toLowerCase())}
          >
            <Popup className="custom-popup" minWidth={300} closeButton={false}>
              {/* Popup Content - Styled like DealCard (X-17) */}
              <div className="flex flex-col bg-background text-foreground">
                {/* Header Image/Color Strip */}
                <div className={`h-2 w-full ${deal.stage === 'won' ? 'bg-emerald-500' :
                    deal.stage === 'negotiation' ? 'bg-amber-500' :
                      'bg-muted-foreground'
                  }`} />

                <div className="p-4 flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-base text-foreground leading-tight">
                      {deal.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${deal.stage === 'won' ? 'bg-emerald-500/10 text-emerald-500' :
                        deal.stage === 'negotiation' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-muted text-muted-foreground'
                      }`}>
                      {deal.stage}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5">
                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <span className="leading-snug line-clamp-2">{deal.address}</span>
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <span>{deal.contactName}</span>
                    </div>

                    {/* Time */}
                    {deal.scheduledAt && (
                      <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-2 py-1.5 rounded-md border border-primary/20">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{format(new Date(deal.scheduledAt), "EEE, MMM d • h:mm a")}</span>
                      </div>
                    )}

                    {/* Value */}
                    {deal.value > 0 && (
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>${deal.value.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-2 pt-3 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 shadow-sm"
                      onClick={() => handlePopupClick(deal.id)}
                    >
                      View Job <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8 border-border/50 hover:bg-muted text-foreground"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${deal.latitude},${deal.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="mr-1 h-3 w-3" />
                        Directions
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
