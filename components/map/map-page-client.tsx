"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { AlertCircle, MapPinned } from "lucide-react"
import { GoogleMapView } from "@/components/map/google-map-view"
import type { Job } from "@/components/map/map-view"

const LeafletMapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
      Loading map...
    </div>
  ),
})

export function MapPageClient({ jobs }: { jobs: Job[] }) {
  const hasGoogleKey = !!(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim()
  const [useGoogleMaps, setUseGoogleMaps] = useState(hasGoogleKey)
  const [fellBackToLeaflet, setFellBackToLeaflet] = useState(false)

  if (jobs.length === 0) {
    return (
      <div className="h-full w-full bg-slate-50 px-6 py-10">
        <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <MapPinned className="h-7 w-7 text-slate-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">No scheduled jobs to map yet</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The map appears once jobs have both a scheduled time and an address. Book or schedule a job first, then return here to plan the route.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/crm/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Open dashboard
              </Link>
              <Link
                href="/crm/schedule"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Go to schedule
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!useGoogleMaps) {
    return (
      <div className="h-full w-full">
        {fellBackToLeaflet && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Google Maps was unavailable, so the app switched to the backup map view.</span>
          </div>
        )}
        <div className={fellBackToLeaflet ? "h-[calc(100%-41px)]" : "h-full"}>
          <LeafletMapView jobs={jobs} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <GoogleMapView
        jobs={jobs}
        onFallbackToLeaflet={() => {
          setFellBackToLeaflet(true)
          setUseGoogleMaps(false)
        }}
      />
    </div>
  )
}
