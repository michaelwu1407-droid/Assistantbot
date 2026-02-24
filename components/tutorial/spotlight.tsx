"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SpotlightProps {
    targetId: string | null // The ID of the element to highlight
    /** Optional: show a "drag to resize" arrow at this element (e.g. assistant-resize-handle) */
    resizeHandleId?: string | null
    /** Where to place the card: auto, topStrip/bottomStrip, topLeft, or bottomCenter (wider, shorter, bottom centre) */
    cardPlacement?: 'auto' | 'topStrip' | 'bottomStrip' | 'topLeft' | 'bottomCenter'
    /** Optional: extend spotlight ring height (e.g. for assistant-pane so highlight is taller) */
    spotlightExpandBottom?: number
    className?: string
    children?: React.ReactNode
    onBackgroundClick?: () => void
}

const CARD_DEFAULT_HEIGHT = 440
const CARD_DEFAULT_WIDTH = 360
const STRIP_HEIGHT = 220
const STRIP_MARGIN_PCT = 0.05

export function Spotlight({ targetId, resizeHandleId, cardPlacement = 'auto', spotlightExpandBottom = 0, className, children, onBackgroundClick }: SpotlightProps) {
    const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
    const [resizeHandlePosition, setResizeHandlePosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, width: CARD_DEFAULT_WIDTH, height: CARD_DEFAULT_HEIGHT })

    useEffect(() => {
        if (!targetId) {
            setPosition(null)
            return
        }

        const updatePosition = () => {
            const element = document.getElementById(targetId)
            if (element) {
                const rect = element.getBoundingClientRect()
                setPosition({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                })
            }
        }

        updatePosition()
        window.addEventListener("resize", updatePosition)
        window.addEventListener("scroll", updatePosition, true)

        return () => {
            window.removeEventListener("resize", updatePosition)
            window.removeEventListener("scroll", updatePosition, true)
        }
    }, [targetId])

    useEffect(() => {
        if (!resizeHandleId) {
            setResizeHandlePosition(null)
            return
        }
        const update = () => {
            const el = document.getElementById(resizeHandleId)
            if (el) {
                const rect = el.getBoundingClientRect()
                setResizeHandlePosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
            }
        }
        update()
        window.addEventListener("resize", update)
        window.addEventListener("scroll", update, true)
        return () => {
            window.removeEventListener("resize", update)
            window.removeEventListener("scroll", update, true)
        }
    }, [resizeHandleId])

    useEffect(() => {
        if (!position) return

        const minMargin = 20
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth

        let top: number
        let left: number
        let width = CARD_DEFAULT_WIDTH
        let height = CARD_DEFAULT_HEIGHT

        if (cardPlacement === 'topLeft') {
            // Compact card in top-left corner so center (e.g. chat window) stays visible
            left = minMargin
            top = minMargin
            width = CARD_DEFAULT_WIDTH
            height = CARD_DEFAULT_HEIGHT
        } else if (cardPlacement === 'topStrip') {
            // Wide strip at top so the target stays visible below
            const stripWidth = Math.round(viewportWidth * (1 - 2 * STRIP_MARGIN_PCT))
            left = viewportWidth * STRIP_MARGIN_PCT
            top = minMargin
            width = stripWidth
            height = STRIP_HEIGHT
        } else if (cardPlacement === 'bottomStrip') {
            // Wide strip at bottom when top is inappropriate (e.g. target is at top)
            const stripWidth = Math.round(viewportWidth * (1 - 2 * STRIP_MARGIN_PCT))
            left = viewportWidth * STRIP_MARGIN_PCT
            top = viewportHeight - STRIP_HEIGHT - minMargin
            width = stripWidth
            height = STRIP_HEIGHT
        } else if (cardPlacement === 'bottomCenter') {
            // Wider card at bottom centre, height tuned to fit content without cramping
            width = Math.min(560, Math.round(viewportWidth * 0.92))
            height = 260
            left = (viewportWidth - width) / 2
            top = viewportHeight - height - minMargin
        } else {
            const gap = 16
            const tooltipHeight = CARD_DEFAULT_HEIGHT
            const tooltipWidth = CARD_DEFAULT_WIDTH

            // When target is on the right (e.g. chat panel), place card to the LEFT so it doesn't cover the chatbox
            const targetInRightHalf = position.left + position.width / 2 > viewportWidth / 2
            // When target is large and centered (e.g. full chat area), use top strip so chat + toggle are visible
            const targetLargeAndCentered = position.width > viewportWidth * 0.45

            if (targetInRightHalf) {
                left = position.left - tooltipWidth - gap
                top = position.top + position.height / 2 - tooltipHeight / 2
            } else if (targetLargeAndCentered) {
                left = viewportWidth * STRIP_MARGIN_PCT
                top = minMargin
                width = Math.round(viewportWidth * (1 - 2 * STRIP_MARGIN_PCT))
                height = STRIP_HEIGHT
            } else {
                // Prefer card above target; fall back to below if no room
                const wouldFitAbove = position.top - tooltipHeight - gap >= minMargin
                if (wouldFitAbove) {
                    top = position.top - tooltipHeight - gap
                    left = position.left + (position.width / 2) - (tooltipWidth / 2)
                } else {
                    top = position.top + position.height + gap
                    left = position.left + (position.width / 2) - (tooltipWidth / 2)
                    if (top + tooltipHeight > viewportHeight - minMargin) {
                        top = position.top - tooltipHeight - gap
                    }
                }
            }

            // Vertical clamp (only when not using strip dimensions)
            if (height === CARD_DEFAULT_HEIGHT) {
                if (top < minMargin) top = minMargin
                if (top + height > viewportHeight - minMargin) {
                    top = viewportHeight - height - minMargin
                }
            }

            // Horizontal clamp
            if (left < minMargin) left = minMargin
            if (left + width > viewportWidth - minMargin) width = viewportWidth - left - minMargin
        }

        setTooltipPosition({ top, left, width, height })
    }, [position, cardPlacement])

    // When targetId is set but position not yet measured (e.g. right after step change), show card in fallback position so tutorial doesn't disappear
    const fallbackPosition = !position && targetId && typeof window !== "undefined" ? (() => {
        const minMargin = 20
        const vh = window.innerHeight
        const vw = window.innerWidth
        if (cardPlacement === "bottomCenter") {
            const w = Math.min(560, Math.round(vw * 0.92))
            const h = 260
            return { top: vh - h - minMargin, left: (vw - w) / 2, width: w, height: h }
        }
        if (cardPlacement === "topLeft") {
            return { top: minMargin, left: minMargin, width: CARD_DEFAULT_WIDTH, height: CARD_DEFAULT_HEIGHT }
        }
        return { top: vh / 2 - CARD_DEFAULT_HEIGHT / 2, left: (vw - CARD_DEFAULT_WIDTH) / 2, width: CARD_DEFAULT_WIDTH, height: CARD_DEFAULT_HEIGHT }
    })() : null

    if (!targetId) return null

    return (
        <AnimatePresence>
            {position ? (
            <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 overflow-hidden pointer-events-none"
            >
                {/* Dark overlay with hole punch using box-shadow strategy for better performance/compatibility than mask-image */}
                {/* Actually, box-shadow on the ring is the cleanest way to do the "dim everything else" effect */}
            </motion.div>

            {/* Spotlight Ring with massive shadow to dim background */}
            <motion.div
                layoutId="spotlight-ring"
                className="fixed z-50 border-2 border-primary/50 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] pointer-events-none"
                initial={false}
                animate={{
                    top: position.top - 4,
                    left: position.left - 4,
                    width: position.width + 8,
                    height: position.height + 8 + spotlightExpandBottom,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* Instruction Tooltip */}
            <div
                className="fixed z-50 pointer-events-auto"
                style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                    width: tooltipPosition.width,
                    height: tooltipPosition.height,
                }}
            >
                {children}
            </div>

            {/* Speech bubble with tail pointing at resize handle */}
            {resizeHandleId && resizeHandlePosition && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed z-[51] pointer-events-none relative flex items-center justify-center px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-medium shadow-lg"
                    style={{
                        left: resizeHandlePosition.left - 132,
                        top: resizeHandlePosition.top + resizeHandlePosition.height / 2 - 16,
                        width: 120,
                    }}
                >
                    <span>Drag to resize</span>
                    <div
                        className="absolute border-blue-500"
                        style={{
                            right: -1,
                            top: "50%",
                            transform: "translate(100%, -50%)",
                            width: 0,
                            height: 0,
                            borderWidth: "8px 0 8px 12px",
                            borderStyle: "solid",
                            borderColor: "transparent transparent transparent #3b82f6",
                        }}
                        aria-hidden
                    />
                </motion.div>
            )}
            </>
            ) : fallbackPosition ? (
                <div
                    className="fixed z-50 pointer-events-auto"
                    style={{
                        top: fallbackPosition.top,
                        left: fallbackPosition.left,
                        width: fallbackPosition.width,
                        height: fallbackPosition.height,
                    }}
                >
                    {children}
                </div>
            ) : null}
        </AnimatePresence>
    )
}
