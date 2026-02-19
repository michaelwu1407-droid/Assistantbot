"use client"

import { GripVertical } from "lucide-react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup>) => (
  <PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <PanelResizeHandle
    className={cn(
      "relative flex w-4 shrink-0 items-center justify-center bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-4 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:flex-col [&[data-panel-group-direction=vertical]>div]:rotate-90",
      "after:absolute after:left-1/2 after:top-1/2 after:h-8 after:w-4 after:-translate-x-1/2 after:-translate-y-1/2",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-8 w-4 items-center justify-center rounded-md border border-border bg-background shadow-sm hover:bg-accent hover:border-primary/30 transition-colors cursor-col-resize">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    )}
  </PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
