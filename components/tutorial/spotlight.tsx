"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SpotlightProps {
    targetId: string | null // The ID of the element to highlight
    className?: string
    children?: React.ReactNode
    onBackgroundClick?: () => void
}

export function Spotlight({ targetId, className, children, onBackgroundClick }: SpotlightProps) {
    const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

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
        if (!position) return

        // Simple boundary detection
        const tooltipHeight = 150 // Approx
        const tooltipWidth = 300
        const gap = 16
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth

        let top = position.top + position.height + gap
        let left = position.left + (position.width / 2) - (tooltipWidth / 2)

        // Vertical flip
        if (top + tooltipHeight > viewportHeight) {
            top = position.top - tooltipHeight - gap
        }

        // Horizontal clamp
        if (left < gap) left = gap
        if (left + tooltipWidth > viewportWidth - gap) left = viewportWidth - tooltipWidth - gap

        setTooltipPosition({ top, left })
    }, [position])

    if (!targetId || !position) return null

    return (
        <AnimatePresence>
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
                    height: position.height + 8,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* Instruction Tooltip */}
            <div
                className="fixed z-50 pointer-events-auto"
                style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left
                }}
            >
                {children}
            </div>

        </AnimatePresence>
    )
}
