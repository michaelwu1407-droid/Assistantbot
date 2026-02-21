"use client"

import dynamic from "next/dynamic"
import { GoogleMapView } from "@/components/map/google-map-view"

const LeafletMapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500">
      Loading map…
    </div>
  ),
})

import { Job } from "@/components/map/map-view"
export function MapPageClient({ jobs }: { jobs: Job[] }) {
  const useGoogleMaps = !!(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim()
  return (
    <div className="h-full w-full">
      {useGoogleMaps ? <GoogleMapView jobs={jobs} /> : <LeafletMapView jobs={jobs} />}
    </div>
  )
}
