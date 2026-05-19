"use client"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Clock, ExternalLink, MapPin, Navigation } from "lucide-react"
import Link from "next/link"
import { formatDate, formatTime } from "@/lib/format"
import type { Job } from "@/components/map/map-view"

interface MapPinSheetProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MapPinSheet({ job, open, onOpenChange }: MapPinSheetProps) {
  if (!job) return null

  function openNav() {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job!.address)}&travelmode=driving`,
      "_blank",
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe px-0 max-h-[55dvh]">
        <div className="px-4 pb-4 pt-2">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />

          <h2 className="app-section-title mb-0.5 truncate min-w-0">{job.clientName}</h2>
          <p className="app-body-secondary truncate min-w-0">{job.title}</p>

          <div className="mt-4 space-y-2 rounded-md bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="app-body-secondary break-words min-w-0">{job.address}</span>
            </div>
            {job.scheduledAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="app-body-secondary">
                  {formatDate(job.scheduledAt)} · {formatTime(job.scheduledAt)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={openNav}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              <Navigation className="h-4 w-4" />
              Navigate
            </button>
            <Link
              href={`/crm/deals/${job.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card py-3 text-sm font-semibold text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              View Job
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
