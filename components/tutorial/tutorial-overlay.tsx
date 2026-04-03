"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useShellStore } from "@/lib/store"
import { Spotlight } from "./spotlight"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { TUTORIAL_STEPS } from "./tutorial-steps"

interface TutorialOverlayProps {
    onComplete?: () => void
}

// Parse **bold** markdown into React elements
function parseBold(text: string): React.ReactNode[] {
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
    )
}

// Steps that show as bottom cards (full page visible behind them)
const BOTTOM_CARD_IDS = new Set([
    "dashboard-home",
    "nav-inbox",
    "nav-schedule",
    "nav-map",
    "nav-contacts",
    "nav-analytics",
    "nav-team",
    "nav-settings",
])

// Steps excluded from spotlight mode (bottom cards + modals)
const NO_SPOTLIGHT_IDS = new Set([
    ...BOTTOM_CARD_IDS,
])

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { viewMode, setViewMode, setTutorialComplete, setTutorialStepIndex, setLastAdvancedPath } = useShellStore()
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    // Sync step index so Shell can open the chat panel on the chat step
    useEffect(() => {
        if (viewMode === "TUTORIAL") setTutorialStepIndex(currentStepIndex)
    }, [viewMode, currentStepIndex, setTutorialStepIndex])

    // Steps 0–2 must be shown in chat mode: ensure we're on dashboard root
    useEffect(() => {
        if (viewMode === "TUTORIAL" && (currentStepIndex === 0 || currentStepIndex === 1) && pathname !== "/crm/dashboard") {
            router.push("/crm/dashboard")
        }
    }, [viewMode, currentStepIndex, pathname, router])

    // Auto-navigate to the right page for each nav step
    useEffect(() => {
        if (viewMode !== "TUTORIAL") return
        const stepId = TUTORIAL_STEPS[currentStepIndex]?.id
        const routes: Record<string, string> = {
            "nav-inbox": "/crm/inbox",
            "nav-schedule": "/crm/schedule",
            "nav-map": "/crm/map",
            "nav-contacts": "/crm/contacts",
            "nav-analytics": "/crm/analytics",
            "nav-team": "/crm/team",
            "nav-settings": "/crm/settings",
        }
        if (stepId && routes[stepId]) {
            router.push(routes[stepId])
        }
    }, [viewMode, currentStepIndex, router])

    const shouldShow = viewMode === "TUTORIAL" && isVisible
    const step = TUTORIAL_STEPS[currentStepIndex]
    const isFirstStep = currentStepIndex === 0
    const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1
    const progressPercent = ((currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100

    const handleNext = () => {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex(curr => curr + 1)
        } else {
            handleFinish()
        }
    }

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(curr => curr - 1)
        }
    }

    const handleFinish = () => {
        setIsVisible(false)
        setTutorialComplete()
        setTutorialStepIndex(-1)
        setLastAdvancedPath("/crm/dashboard")
        setViewMode("BASIC")
        router.push("/crm/dashboard")
        onComplete?.()
    }

    if (!shouldShow) return null

    // Build the card content (shared between spotlight and modal)
    const cardContent = (
        <>
            <h3 className="font-heading font-bold text-lg mb-2 pr-6">{step.title}</h3>

            {/* Message */}
            <p className="text-sm text-foreground/80 mb-3 leading-relaxed whitespace-pre-line">
                {parseBold(step.message)}
            </p>

            {/* Feature list */}
            {step.features && step.features.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    {step.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                            <span className="shrink-0 mt-[5px] h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{parseBold(feat)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Chat example as bubble mockup */}
            {step.chatExample && (
                <div className="rounded-xl bg-white/60 dark:bg-black/20 border border-sky-200 dark:border-sky-800 p-3 mb-3 space-y-2">
                    <div className="flex justify-end">
                        <span className="inline-block bg-primary/15 text-foreground text-xs px-3 py-1.5 rounded-2xl rounded-br-sm max-w-[85%]">
                            {step.chatExample.input}
                        </span>
                    </div>
                    <div className="flex justify-start">
                        <span className="inline-block bg-white dark:bg-slate-800 text-foreground/80 text-xs px-3 py-1.5 rounded-2xl rounded-bl-sm max-w-[85%] border border-slate-200 dark:border-slate-700">
                            {step.chatExample.output}
                        </span>
                    </div>
                </div>
            )}

            {/* Tip callout */}
            {step.tip && (
                <div className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 mb-3 text-xs text-foreground/70">
                    <span className="shrink-0 text-primary font-bold">TIP</span>
                    <span>{parseBold(step.tip)}</span>
                </div>
            )}

            {/* Progress bar */}
            <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={handlePrev} disabled={isFirstStep} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground font-mono">
                        {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
                    </span>
                </div>
                <div className="flex gap-3 shrink-0 ml-4">
                    <Button size="sm" onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[88px]">
                        {step.actionLabel}
                        {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                    </Button>
                </div>
            </div>
        </>
    )

    return (
        <>
            {/* Bottom card mode: full page is visible behind the card */}
            {BOTTOM_CARD_IDS.has(step.id) && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-2xl"
                    >
                        <Card className="p-4 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl rounded-2xl">
                            {cardContent}
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Spotlight mode: step has a target element and is not a bottom card */}
            {step.targetId && !NO_SPOTLIGHT_IDS.has(step.id) && (
                <Spotlight
                    targetId={step.targetId}
                    resizeHandleId={step.resizeHandleId}
                    cardPlacement={step.id === "two-modes" ? "bottomCenter" : "auto"}
                    spotlightExpandBottom={step.id === "chat-mode" ? 100 : 0}
                >
                    <Card className="w-full h-full max-w-full p-5 !bg-sky-100 dark:!bg-sky-900 text-card-foreground border-sky-300 dark:border-sky-700 shadow-2xl relative flex flex-col min-h-0 overflow-hidden">
                        {currentStepIndex === 0 && (
                            <div className="absolute -top-6 -left-6 h-12 w-12 rounded-full flex items-center justify-center shadow-lg ring-4 ring-background overflow-hidden bg-background">
                                <Image src="/latest-logo.png" alt="Earlymark" width={48} height={48} className="h-12 w-12 object-contain" />
                            </div>
                        )}
                        <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
                            {cardContent}
                        </div>
                    </Card>
                </Spotlight>
            )}

            {/* Center modal mode: no target element */}
            {!step.targetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-w-lg w-full"
                    >
                        <Card className="p-8 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500" />
                            <div className="flex flex-col items-center text-center space-y-4">
                                {currentStepIndex === 0 && (
                                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl mb-2 overflow-hidden">
                                        <Image src="/latest-logo.png" alt="Earlymark" width={64} height={64} className="h-16 w-16 object-contain" />
                                    </div>
                                )}
                                {cardContent}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </>
    )
}
