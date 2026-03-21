"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Single-line text: on hover, if truncated, slowly scrolls horizontally so the full string is visible (ticker).
 * Use `textClassName` for column titles vs card names.
 */
export function HoverScrollName({
  text,
  className,
  textClassName,
}: {
  text: string
  className?: string
  /** Overrides default `text-sm` styling (e.g. Kanban column header). */
  textClassName?: string
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const run = () => {
      const o = outerRef.current
      const i = innerRef.current
      if (!o || !i) return
      setShift(Math.max(0, i.scrollWidth - o.clientWidth))
    }
    run()
    const ro = new ResizeObserver(run)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [text])

  return (
    <div
      ref={outerRef}
      className={cn("min-w-0 flex-1 overflow-hidden", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        ref={innerRef}
        className={cn(
          "inline-block max-w-none whitespace-nowrap text-left text-sm font-bold leading-tight",
          textClassName,
          hover && shift > 0 && "animate-[kanban-card-name-ticker_1.6s_ease-in-out_infinite_alternate]"
        )}
        style={{ ["--kanban-name-shift" as string]: `${shift}px` }}
        title={text}
      >
        {text || "No name"}
      </span>
    </div>
  )
}
