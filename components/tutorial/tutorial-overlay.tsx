"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useShellStore } from "@/lib/store"
import { Spotlight } from "./spotlight"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { TUTORIAL_STEPS } from "./tutorial-steps"

interface TutorialOverlayProps {
    onComplete?: () => void
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { viewMode, setViewMode, setTutorialComplete, setTutorialStepIndex } = useShellStore()
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    // Sync step index so Shell can open the chat panel on the chat step (step 4)
    useEffect(() => {
        if (viewMode === "TUTORIAL") setTutorialStepIndex(currentStepIndex)
    }, [viewMode, currentStepIndex, setTutorialStepIndex])

    // Steps 1–2 must be shown in chat mode: ensure we're on dashboard root
    useEffect(() => {
        if (viewMode === "TUTORIAL" && (currentStepIndex === 0 || currentStepIndex === 1) && pathname !== "/dashboard") {
            router.push("/dashboard")
        }
    }, [viewMode, currentStepIndex, pathname, router])

    // Navigate to inbox page when showing the inbox step (card 7)
    useEffect(() => {
        if (viewMode === "TUTORIAL" && TUTORIAL_STEPS[currentStepIndex]?.id === "nav-inbox") {
            router.push("/dashboard/inbox")
        }
    }, [viewMode, currentStepIndex, router])

    // Navigate to schedule page when showing the schedule step
    useEffect(() => {
        if (viewMode === "TUTORIAL" && TUTORIAL_STEPS[currentStepIndex]?.id === "nav-schedule") {
            router.push("/dashboard/schedule")
        }
    }, [viewMode, currentStepIndex, router])

    // Navigate to map page when showing the map step
    useEffect(() => {
        if (viewMode === "TUTORIAL" && TUTORIAL_STEPS[currentStepIndex]?.id === "nav-map") {
            router.push("/dashboard/map")
        }
    }, [viewMode, currentStepIndex, router])

    // Navigate to contacts page when showing the contacts step
    useEffect(() => {
        if (viewMode === "TUTORIAL" && TUTORIAL_STEPS[currentStepIndex]?.id === "nav-contacts") {
            router.push("/dashboard/contacts")
        }
    }, [viewMode, currentStepIndex, router])

    // Navigate to team page when showing the team step
    useEffect(() => {
        if (viewMode === "TUTORIAL" && TUTORIAL_STEPS[currentStepIndex]?.id === "nav-team") {
            router.push("/dashboard/team")
        }
    }, [viewMode, currentStepIndex, router])

    // Navigate to settings page when showing the settings step
    useEffect(() => {
        if (viewMode === "TUTORIAL" && TUTORIAL_STEPS[currentStepIndex]?.id === "nav-settings") {
            router.push("/dashboard/settings")
        }
    }, [viewMode, currentStepIndex, router])

    // Navigate to Settings → Help when showing the Travis Handbook step
    useEffect(() => {
        if (viewMode === "TUTORIAL" && TUTORIAL_STEPS[currentStepIndex]?.id === "travis-handbook") {
            router.push("/dashboard/settings/help")
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
        setViewMode("BASIC")
        onComplete?.()
    }

    if (!shouldShow) return null

    // Build the card content (shared between spotlight and modal)
    const cardContent = (
        <>
            <h3 className="font-heading font-bold text-lg mb-2 pr-6">{step.title}</h3>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed whitespace-pre-line">
                {step.message.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part)}
            </p>

            {/* Schedule step: custom bullets (no generic examples) */}
            {step.id === "nav-schedule" && (
                <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-1 pl-1">
                    <li>Jobs auto-slot when Travis creates them.</li>
                    <li>Travis auto-checks for clashes and suggests alternatives.</li>
                    <li>Best of all, Travis can group nearby jobs together to minimise travel.</li>
                </ul>
            )}

            {/* Example phrases (dot points) - hidden for dashboard/inbox (irrelevant to topic) */}
            {step.chatExample && step.id !== "dashboard-home" && step.id !== "nav-inbox" && step.id !== "nav-schedule" && step.id !== "nav-map" && step.id !== "nav-contacts" && step.id !== "nav-team" && step.id !== "nav-settings" && (
                <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-1 pl-1">
                    {step.id === "chat-preferences" ? (
                        <>
                            <li>&quot;From now on always add 1 hour buffer between jobs&quot;</li>
                            <li>&quot;Always text the client the day before a job&quot;</li>
                            <li>&quot;Default to 2pm when I don&apos;t specify a time&quot;</li>
                            <li>&quot;Never schedule jobs on Fridays&quot;</li>
                        </>
                    ) : (
                        <>
                            <li>&quot;New repair job for Frank at 300 George St for $600 tomorrow 2pm&quot;</li>
                            <li>&quot;Text Steven I&apos;m on my way&quot;</li>
                            <li>&quot;Move John&apos;s job to Completed&quot;</li>
                            <li>&quot;Assign Ben to the Circle St job&quot;</li>
                        </>
                    )}
                </ul>
            )}

            {/* Progress Bar */}
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
            {/* Dashboard step: no spotlight, card fixed at bottom so kanban is visible */}
            {step.id === "dashboard-home" && (
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

            {/* Inbox step: no spotlight, wide card at bottom on inbox page */}
            {step.id === "nav-inbox" && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl"
                    >
                        <Card className="p-4 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl rounded-2xl">
                            {cardContent}
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Schedule step: no spotlight, bottom middle, wider and shorter card */}
            {step.id === "nav-schedule" && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl"
                    >
                        <Card className="p-4 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl rounded-2xl max-h-[240px]">
                            {cardContent}
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Map step: no spotlight, bottom card on map page */}
            {step.id === "nav-map" && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl"
                    >
                        <Card className="p-4 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl rounded-2xl max-h-[240px]">
                            {cardContent}
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Contacts step: no spotlight, bottom middle, wider and shorter card */}
            {step.id === "nav-contacts" && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl"
                    >
                        <Card className="p-4 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl rounded-2xl max-h-[240px]">
                            {cardContent}
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Team step: no spotlight, bottom middle, wider and shorter card */}
            {step.id === "nav-team" && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl"
                    >
                        <Card className="p-4 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl rounded-2xl max-h-[240px]">
                            {cardContent}
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Settings step: no spotlight, bottom middle, wider and shorter card */}
            {step.id === "nav-settings" && (
                <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl"
                    >
                        <Card className="p-4 !bg-sky-100 dark:!bg-sky-900 border-sky-300 dark:border-sky-700 shadow-2xl rounded-2xl max-h-[240px]">
                            {cardContent}
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Spotlight mode: step has a target element (not dashboard, inbox, schedule, map, contacts, team, or settings) */}
            {step.targetId && step.id !== "dashboard-home" && step.id !== "nav-inbox" && step.id !== "nav-schedule" && step.id !== "nav-map" && step.id !== "nav-contacts" && step.id !== "nav-team" && step.id !== "nav-settings" && (
                <Spotlight
                    targetId={step.targetId}
                    resizeHandleId={step.resizeHandleId}
                    cardPlacement={step.id === 'two-modes' ? 'bottomCenter' : 'auto'}
                    spotlightExpandBottom={step.id === 'basic-mode' ? 100 : 0}
                >
                    <Card className="w-full h-full max-w-full p-5 !bg-sky-100 dark:!bg-sky-900 text-card-foreground border-sky-300 dark:border-sky-700 shadow-2xl relative flex flex-col min-h-0 overflow-hidden">
                        {currentStepIndex === 0 && (
                            <div className="absolute -top-6 -left-6 h-12 w-12 rounded-full flex items-center justify-center shadow-lg ring-4 ring-background overflow-hidden bg-background">
                                <img src="/Latest logo.png" alt="Earlymark" className="h-12 w-12 object-contain" />
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
                                        <img src="/Latest logo.png" alt="Earlymark" className="h-16 w-16 object-contain" />
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
