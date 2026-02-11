"use client"

import dynamic from "next/dynamic"
import { JobMapViewProps } from "./job-map-view"

const JobMapView = dynamic(
    () => import("./job-map-view").then((mod) => mod.JobMapView),
    { ssr: false }
)

export function JobMapViewWrapper(props: JobMapViewProps) {
    return <JobMapView {...props} />
}
