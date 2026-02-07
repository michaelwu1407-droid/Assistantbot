"use client"

import { useState, useEffect } from "react"
import { useShellStore } from "@/lib/store"
import { Spotlight } from "./spotlight"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

// Tutorial Steps Definition
const STEPS = [
    {
        id: "welcome",
        targetId: null, // Center screen
        title: "Welcome to Pj Buddy",
        message: "I'm Pj, your AI business partner. I'm here to handle the admin so you can focus on the work. Let's get you set up.",
        actionLabel: "Let's Go",
    },
    {
        id: "modes",
        targetId: "mode-toggle", // Needs to exist in Shell header
        title: "Dual Modes",
        message: "Switch between 'Basic Mode' (just me & chat) and 'Advanced Mode' (full dashboard) anytime.",
        actionLabel: "Got it",
    },
    {
        id: "canvas",
        targetId: "main-canvas", // Needs to exist in Shell
        title: "The Canvas",
        message: "This is your workspace. In 'Advanced Mode', it shows your Maps, Pipeline, or Job details.",
        actionLabel: "Next",
    },
    {
        id: "chat",
        targetId: "assistant-pane", // Needs to exist in Shell
        title: "Your Co-Pilot",
        message: "I live here. Ask me anything: 'Draft a quote', 'Find buyers', or 'Start my day'.",
        actionLabel: "Finish",
    },
]

export function TutorialOverlay() {
    const { viewMode, setViewMode } = useShellStore()
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    // Only run if in TUTORIAL mode
    if (viewMode !== "TUTORIAL") return null

    const step = STEPS[currentStepIndex]

    const handleNext = () => {
        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(curr => curr + 1)
        } else {
            // Finish
            setViewMode("ADVANCED")
        }
    }

    return (
        <>
            {/* Only show Spotlight if there is a target */}
            {step.targetId && (
                <Spotlight targetId={step.targetId}>
                    <Card className="w-[300px] p-4 bg-white dark:bg-slate-900 border-primary/20 shadow-2xl relative">
                        {/* Bot Avatar */}
                        <div className="absolute -top-6 -left-6 h-12 w-12 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white dark:border-slate-800">
                            Pj
                        </div>

                        <h3 className="font-heading font-bold text-lg mb-2 mt-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.message}</p>
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={handleNext}
                                className="bg-primary hover:bg-primary/90 text-white"
                            >
                                {step.actionLabel}
                            </Button>
                        </div>
                    </Card>
                </Spotlight>
            )}

            {/* Center Modal for steps without target (Welcome) */}
            {!step.targetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-w-md w-full"
                    >
                        <Card className="p-8 bg-white dark:bg-slate-900 border-primary/20 shadow-2xl relative overflow-hidden">
                            {/* Decorative Gradient */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl mb-2">
                                    Pj
                                </div>
                                <h2 className="font-heading text-3xl font-bold text-foreground">{step.title}</h2>
                                <p className="text-muted-foreground text-lg leading-relaxed">{step.message}</p>
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    className="w-full text-base font-semibold mt-4 shadow-lg shadow-primary/20"
                                >
                                    {step.actionLabel}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </>
    )
}
