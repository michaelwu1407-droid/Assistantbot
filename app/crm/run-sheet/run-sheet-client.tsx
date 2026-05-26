"use client"

import { DealView } from "@/actions/deal-actions"
import { formatCurrency, formatTime } from "@/lib/format"
import { MapPin, Clock, CheckCircle2, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface RunSheetClientProps {
  jobs: DealView[]
  timezone: string
}

export function RunSheetClient({ jobs, timezone }: RunSheetClientProps) {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  })

  const totalExpected = jobs.reduce((sum, j) => sum + (j.value || 0), 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="app-field-label">{today}</p>
        <h1 className="app-page-title">Today&apos;s Run Sheet</h1>
        {jobs.length > 0 && (
          <p className="app-body-secondary">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} ·{" "}
            {formatCurrency(totalExpected)} expected
          </p>
        )}
      </div>

      {/* Jobs */}
      {jobs.length === 0 ? (
        <div className="ott-empty-state">
          <div className="ott-empty-state-icon">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="ott-empty-state-title">Nothing scheduled today</p>
          <p className="ott-empty-state-body">
            Enjoy the time off — or check the pipeline for quotes to chase.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/crm/dashboard">Open Pipeline</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <JobCard key={job.id} job={job} index={i + 1} total={jobs.length} />
          ))}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="pt-4 border-t border-border">
          <Button asChild variant="outline" className="w-full">
            <Link href="/crm/schedule">View Full Calendar</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function JobCard({ job, index, total }: { job: DealView; index: number; total: number }) {
  const mapsUrl = job.address
    ? `https://maps.google.com/?q=${encodeURIComponent(job.address)}`
    : null

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">
            {index}/{total}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {job.scheduledAt && (
              <span className="flex items-center gap-1 app-field-label text-foreground font-bold">
                <Clock className="h-3 w-3" />
                {formatTime(job.scheduledAt)}
              </span>
            )}
            <span className="font-semibold text-foreground truncate">{job.title}</span>
          </div>
          <p className="app-body-secondary mt-0.5">{job.contactName}</p>
          {job.address && (
            <p className={cn("app-body-secondary flex items-center gap-1 mt-0.5", "break-words min-w-0")}>
              <MapPin className="h-3 w-3 shrink-0" />
              {job.address}
            </p>
          )}
        </div>
        <span className="font-bold text-foreground shrink-0">
          {formatCurrency(job.value)}
        </span>
      </div>

      {mapsUrl && (
        <Button asChild variant="outline" size="sm" className="w-full gap-2">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-4 w-4" />
            Get directions
          </a>
        </Button>
      )}
    </div>
  )
}
