"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { GoogleMapView } from "@/components/map/google-map-view"
import type { Job } from "@/components/map/map-view"

const LeafletMapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500">
      Loading map…
    </div>
  ),
})

export function MapPageClient({ jobs }: { jobs: Job[] }) {
  const hasGoogleKey = !!(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim()
  const [useGoogleMaps, setUseGoogleMaps] = useState(hasGoogleKey)

  if (!useGoogleMaps) {
    return <LeafletMapView jobs={jobs} />
  }

  return (
    <div className="h-full w-full">
      <GoogleMapView jobs={jobs} onFallbackToLeaflet={() => setUseGoogleMaps(false)} />
    </div>
  )
}
