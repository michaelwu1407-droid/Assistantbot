"use client"

import dynamic from "next/dynamic"

// Dynamically import to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map/map-view"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-500">
            Loading Map...
        </div>
    ),
})

export default MapView
