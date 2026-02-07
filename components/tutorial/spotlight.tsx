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

    if (!targetId || !position) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 overflow-hidden pointer-events-none"
            >
                {/* Dark overlay with hole punch */}
                <div
                    className="absolute inset-0 bg-black/60 transition-colors duration-500"
                    style={{
                        maskImage: `radial-gradient(circle at ${position.left + position.width / 2}px ${position.top + position.height / 2}px, transparent ${Math.max(position.width, position.height) / 1.5}px, black ${Math.max(position.width, position.height) / 1.2}px)`,
                        WebkitMaskImage: `radial-gradient(circle at ${position.left + position.width / 2}px ${position.top + position.height / 2}px, transparent ${Math.max(position.width, position.height) / 1.5}px, black ${Math.max(position.width, position.height) / 1.2}px)`
                    }}
                    onClick={onBackgroundClick} // Need pointer-events-auto on this layer?
                />

                {/* Solid overlay parts if CSS mask is too complex, but mask is better for seamless circle */}
                {/* Actually, let's use a simpler approach: SVG Overlay */}

            </motion.div>

            {/* Spotlight Ring */}
            <motion.div
                layoutId="spotlight-ring"
                className="fixed z-50 border-2 border-white rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none"
                initial={false}
                animate={{
                    top: position.top - 4,
                    left: position.left - 4,
                    width: position.width + 8,
                    height: position.height + 8,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* Instruction Tooltip Positioned Relative to Spotlight */}
            <div
                className="fixed z-50 pointer-events-auto"
                style={{
                    top: position.top + position.height + 16,
                    left: position.left + (position.width / 2) - 150 // Center align roughly
                }}
            >
                {children}
            </div>

        </AnimatePresence>
    )
}
