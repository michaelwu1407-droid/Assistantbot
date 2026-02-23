"use client"

import { useState, useEffect } from "react"
import { useShellStore } from "@/lib/store"
import { Spotlight } from "./spotlight"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, X, Send, MessageSquare } from "lucide-react"
import { TUTORIAL_STEPS } from "./tutorial-steps"

interface TutorialOverlayProps {
    onComplete?: () => void
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
    const { viewMode, setViewMode, setTutorialComplete } = useShellStore()
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

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

    const handleSkip = () => {
        handleFinish()
    }

    const handleFinish = () => {
        setIsVisible(false)
        setTutorialComplete()
        setViewMode("BASIC")
        onComplete?.()
    }

    if (!shouldShow) return null

    // Build the card content (shared between spotlight and modal)
    const cardContent = (
        <>
            {/* Section badge */}
            {step.section && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full w-fit mb-2">
                    {step.section}
                </div>
            )}

            <h3 className="font-heading font-bold text-lg mb-2 pr-6">{step.title}</h3>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed whitespace-pre-line">{step.message}</p>

            {/* Chat Example Box */}
            {step.chatExample && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-border/50 p-3 mb-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Try typing this</span>
                    </div>
                    {/* User input */}
                    <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-xl rounded-br-sm px-3 py-1.5 max-w-[90%]">
                            <p className="text-xs leading-relaxed">{step.chatExample.input}</p>
                        </div>
                    </div>
                    {/* AI response */}
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 border border-border/50 rounded-xl rounded-bl-sm px-3 py-1.5 max-w-[90%]">
                            <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">{step.chatExample.output}</p>
                        </div>
                    </div>
                </div>
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

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={handlePrev} disabled={isFirstStep} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground font-mono">
                        {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
                    </span>
                </div>
                <div className="flex gap-2">
                    {!isLastStep && (
                        <Button size="sm" variant="ghost" onClick={handleSkip} className="text-xs">
                            Skip Tour
                        </Button>
                    )}
                    <Button size="sm" onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {step.actionLabel}
                        {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                    </Button>
                </div>
            </div>
        </>
    )

    return (
        <>
            {/* Spotlight mode: step has a target element */}
            {step.targetId && (
                <Spotlight targetId={step.targetId}>
                    <Card className="w-[360px] p-5 bg-card text-card-foreground border-border shadow-2xl relative">
                        <button onClick={handleSkip} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                        <div className="absolute -top-6 -left-6 h-12 w-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-lg ring-4 ring-background">
                            Pj
                        </div>
                        <div className="mt-2">
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
                        <Card className="p-8 bg-card border-border shadow-2xl relative overflow-hidden">
                            {!isLastStep && (
                                <button onClick={handleSkip} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500" />
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-xl mb-2">
                                    Pj
                                </div>
                                {cardContent}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </>
    )
}
