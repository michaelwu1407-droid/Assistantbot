"use client"

import dynamic from "next/dynamic"

// Dynamically import to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map/map-view"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-muted-foreground flex items-center justify-center text-muted-foreground">
            Loading Map...
        </div>
    ),
})

export default MapView
