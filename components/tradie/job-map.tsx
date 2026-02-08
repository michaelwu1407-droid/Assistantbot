"use client"

import dynamic from "next/dynamic"
import { RefreshCw } from "lucide-react"

// Dynamically import the Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import("@/components/crm/leaflet-map"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-500">
            <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="text-sm">Loading Map...</span>
            </div>
        </div>
    ),
})

interface JobMapProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deals: any[]
}

export default function JobMap({ deals }: JobMapProps) {
    // Map the deals to the format expected by LeafletMap
    const mappedDeals = deals.map(d => ({
        id: d.id,
        title: d.title,
        address: d.address || "",
        latitude: d.latitude || -33.8688, // Default fallback
        longitude: d.longitude || 151.2093,
        stage: d.stage || "unknown",
        value: d.value || 0,
        contactName: d.clientName || d.contactName || "Client"
    }))

    return <LeafletMap deals={mappedDeals} />
}
