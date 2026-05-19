"use client"

import { MessageSquare } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface TraceySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function TraceySheet({ open, onOpenChange, children }: TraceySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] p-0 flex flex-col rounded-t-3xl"
      >
        <SheetHeader className="shrink-0 flex flex-row items-center px-4 py-3 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" />
            Ask Tracey
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {open ? children : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
