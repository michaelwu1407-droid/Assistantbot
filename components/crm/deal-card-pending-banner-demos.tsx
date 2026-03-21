"use client"

import { Briefcase, MapPin, Trash2, User } from "lucide-react"
import { cn } from "@/lib/utils"

/** Option (1): opaque full-width strip — same typography used for the (3) overlay (with a very light fill). */
const pendingBannerBaseClass =
  "w-full px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-inner dark:text-amber-950"

function PendingApprovalBanner() {
  return (
    <div
      className={cn(pendingBannerBaseClass, "rounded-t-lg bg-amber-400 dark:bg-amber-500")}
      role="presentation"
    >
      Pending approval
    </div>
  )
}

const cardShell =
  "w-full max-w-[240px] overflow-hidden rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/90 shadow-sm dark:border-amber-500/60 dark:bg-amber-950/40"

/** Tighter vertical rhythm for these mocks (compare to older tall cards). */
const bodyPad = "px-2.5 pb-2 pt-2"

function NameRow() {
  return (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <h5 className="w-full truncate text-left text-sm font-bold leading-tight" title="Morgan Smith">
          Morgan Smith
        </h5>
      </div>
      <span className="shrink-0 pl-1 text-[10px] text-muted-foreground">Mar 18</span>
    </div>
  )
}

function AddressRow() {
  return (
    <div className="flex min-h-0 items-center gap-2">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-[10px] leading-tight text-muted-foreground" title="7 Review Cl">
        7 Review Cl
      </span>
    </div>
  )
}

function JobRow() {
  return (
    <div className="flex min-h-0 items-center gap-2">
      <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span
        className="min-w-0 truncate text-[10px] font-medium text-muted-foreground"
        title="[Demo] Pending manager approval"
      >
        [Demo] Pending manager approval
      </span>
    </div>
  )
}

const option3OverlayTint: Record<45 | 55 | 65 | 75, string> = {
  45: "bg-amber-400/45 dark:bg-amber-500/45",
  55: "bg-amber-400/55 dark:bg-amber-500/55",
  65: "bg-amber-400/65 dark:bg-amber-500/65",
  75: "bg-amber-400/75 dark:bg-amber-500/75",
}

/**
 * Same strip as (1) — full card width, over the price row; clicks pass through to bin.
 */
function FooterWithOverlappingBanner({ opacity }: { opacity: 45 | 55 | 65 | 75 }) {
  return (
    <div className="relative mt-0 w-full">
      <div className="relative z-0 flex shrink-0 justify-between border-t border-border/10 px-2.5 pb-2 pt-1.5">
        <div className="rounded-md bg-primary/10 px-2 py-0.5">
          <span className="text-xs font-bold text-primary">$ 5,600</span>
        </div>
        <button
          type="button"
          className="p-1 text-muted-foreground hover:text-destructive"
          aria-label="Delete (demo)"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] flex items-stretch justify-center">
        <div
          className={cn(
            pendingBannerBaseClass,
            "flex w-full items-center justify-center rounded-b-lg",
            option3OverlayTint[opacity]
          )}
        >
          Pending approval
        </div>
      </div>
    </div>
  )
}

/** Shared body for option (3) cards — name/address/job only. */
function Option3CardBody() {
  return (
    <div className={`${bodyPad} pb-0`}>
      <NameRow />
      <div className="mt-1 flex flex-col gap-0.5">
        <AddressRow />
        <JobRow />
      </div>
    </div>
  )
}

function FooterRow() {
  return (
    <div className="mt-1.5 flex shrink-0 justify-between border-t border-border/10 pt-1.5">
      <div className="rounded-md bg-primary/10 px-2 py-0.5">
        <span className="text-xs font-bold text-primary">$ 5,600</span>
      </div>
      <button type="button" className="p-1 text-muted-foreground" aria-label="Delete (demo)" tabIndex={-1}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Static mocks: banner placement reference. **Production Kanban** uses **(3C) at 65%** only (`DealCard`).
 */
export function DealCardPendingBannerDemos() {
  return (
    <div className="space-y-8 border-t border-border/40 p-6 pt-10">
      <div>
        <h2 className="mb-1 text-sm font-semibold">Job status — full-width banner (design reference)</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your <strong>dashboard Kanban</strong> cards use layout <strong>(3C)</strong> with <strong>65% opacity</strong>{" "}
          on the bottom strip — same as <strong>(3c)</strong> below. This page keeps older layout/opacity comparisons
          for designers only; it does not change what users see on the board.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* (1) Top */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            (1) Banner at top — reference
          </p>
          <div className={cardShell}>
            <PendingApprovalBanner />
            <div className={bodyPad}>
              <NameRow />
              <div className="mt-1 flex flex-col gap-0.5">
                <AddressRow />
                <JobRow />
              </div>
              <FooterRow />
            </div>
          </div>
        </div>

        {/* (2) Middle — after name, before address + job */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            (2) Banner in the middle
          </p>
          <div className={cardShell}>
            <div className={`${bodyPad} pb-0`}>
              <NameRow />
            </div>
            <PendingApprovalBanner />
            <div className="px-2.5 pb-2 pt-1.5">
              <div className="flex flex-col gap-0.5">
                <AddressRow />
                <JobRow />
              </div>
              <FooterRow />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">(3) Bottom overlay — opacity variants</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            <strong>Live board:</strong> <strong>(3c) 65%</strong> only. Compare <strong>45% / 55% / 75%</strong> here
            if needed.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">(3a) 45%</p>
            <div className={cardShell}>
              <Option3CardBody />
              <FooterWithOverlappingBanner opacity={45} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">(3b) 55%</p>
            <div className={cardShell}>
              <Option3CardBody />
              <FooterWithOverlappingBanner opacity={55} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              (3c) 65% — <span className="text-primary">dashboard</span>
            </p>
            <div className={cardShell}>
              <Option3CardBody />
              <FooterWithOverlappingBanner opacity={65} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">(3d) 75%</p>
            <div className={cardShell}>
              <Option3CardBody />
              <FooterWithOverlappingBanner opacity={75} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
