"use client"

import Link from "next/link"
import { ChevronLeft, Edit } from "lucide-react"

interface DealHeaderMobileProps {
  title: string
  stageLabel: string
  dealId: string
}

export function DealHeaderMobile({ title, stageLabel, dealId }: DealHeaderMobileProps) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-emerald-900 pt-safe text-white">
      <div className="flex items-center gap-2 px-2 pb-3 pt-2">
        <Link
          href="/crm/dashboard"
          aria-label="Back to pipeline"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-tight">{title}</p>
          <p className="text-[12px] text-emerald-200/80">{stageLabel}</p>
        </div>
        <Link
          href={`/crm/deals/${dealId}/edit`}
          aria-label="Edit deal"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700/60 text-white"
        >
          <Edit className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}
