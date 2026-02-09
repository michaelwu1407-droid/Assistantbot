"use client"

import { useState, useEffect } from "react"
import { useShellStore } from "@/lib/store"
import { Spotlight } from "./spotlight"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, SkipForward, X } from "lucide-react"

// Complete Tutorial Steps - emphasizing chat-first simplicity
const STEPS = [
    // === INTRO SECTION - PROMOTING CHAT-FIRST ===
    {
        id: "welcome",
        targetId: null,
        title: "Welcome to Pj Buddy! 🎉",
        message: "I'm Pj, your AI business assistant. Unlike other CRM apps, you can just TALK to me — like texting a friend. No learning buttons or menus!",
        actionLabel: "Let's Go",
    },
    {
        id: "chat-first-intro",
        targetId: null,
        title: "💬 Just Chat — That's It!",
        message: "The EASIEST way to use Pj Buddy:\n\n📱 Type: \"New job for John Smith\"\n📱 Type: \"Show stale deals\"\n📱 Type: \"Send a quote for $500\"\n\nI'll do the rest! No buttons, no menus, no learning curve.",
        actionLabel: "Cool!",
    },
    {
        id: "modes-intro",
        targetId: null,
        title: "Two Ways to Work",
        message: "✨ **Basic Mode** (Recommended)\nJust you and me chatting. Perfect for busy tradies!\n\n🖥️ **Advanced Mode**\nFull dashboard for power users who want extra control.\n\nMost users ONLY need Basic Mode!",
        actionLabel: "Show Me",
    },

    // === BASIC MODE SECTION ===
    {
        id: "basic-mode",
        targetId: "assistant-pane",
        title: "Basic Mode — Just Chat!",
        message: "This is where the magic happens. Just type what you need in plain English. I understand context and remember your conversation.",
        position: "left",
        actionLabel: "Next",
    },

    // === ADVANCED MODE FEATURES ===
    {
        id: "mode-toggle",
        targetId: "mode-toggle-btn",
        title: "Switch Modes Anytime",
        message: "Click this button to toggle between Basic (chat) and Advanced (dashboard) mode. Try it out!",
        position: "bottom",
        actionLabel: "Next",
    },
    {
        id: "canvas-overview",
        targetId: "main-canvas",
        title: "The Dashboard Canvas",
        message: "This is your workspace in Advanced Mode. It shows your jobs, pipeline, map, and more.",
        position: "bottom",
        actionLabel: "Next",
    },
    {
        id: "sidebar",
        targetId: "sidebar-nav",
        title: "Navigation Sidebar",
        message: "Jump between different views: Dashboard, Calendar, Contacts, Settings, and more.",
        position: "right",
        actionLabel: "Next",
    },

    // === DASHBOARD FEATURES ===
    {
        id: "kanban",
        targetId: "kanban-board",
        title: "Your Pipeline",
        message: "Drag jobs between stages as they progress. Red borders mean a job needs attention (over 7 days old).",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "new-deal",
        targetId: "new-deal-btn",
        title: "Create New Jobs",
        message: "Click here to add a new job, quote, or listing. I'll help you fill in the details!",
        position: "bottom",
        actionLabel: "Next",
    },
    {
        id: "search",
        targetId: "search-btn",
        title: "Quick Search",
        message: "Press Cmd+K (or Ctrl+K) anytime to search for jobs, contacts, or actions.",
        position: "bottom",
        actionLabel: "Next",
    },
    {
        id: "notifications",
        targetId: "notifications-btn",
        title: "Notifications",
        message: "Stay on top of reminders, follow-ups, and important updates right here.",
        position: "bottom",
        actionLabel: "Next",
    },

    // === TRADIE FEATURES ===
    {
        id: "map-view",
        targetId: "map-link",
        title: "Map View",
        message: "See all your jobs on a map with routes. Perfect for planning your day efficiently.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "calendar",
        targetId: "schedule-link",
        title: "Smart Scheduler",
        message: "Drag and drop jobs onto your calendar. I'll help you optimize travel time.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "estimator",
        targetId: "estimator-link",
        title: "Quote Builder",
        message: "Build professional quotes in seconds. Add line items and I'll handle the math.",
        position: "right",
        actionLabel: "Next",
    },

    // === AGENT FEATURES ===
    {
        id: "contacts",
        targetId: "contacts-link",
        title: "Contact Database",
        message: "All your clients and leads in one place. Track preferences, notes, and history.",
        position: "right",
        actionLabel: "Next",
    },

    // === CHAT FEATURES ===
    {
        id: "voice-input",
        targetId: "voice-btn",
        title: "Voice Commands",
        message: "Click the microphone to talk to me. Great for hands-free operation on the job site!",
        position: "left",
        actionLabel: "Next",
    },
    {
        id: "chat-examples",
        targetId: "chat-input",
        title: "What You Can Say",
        message: "Try commands like:\n• \"Show stale deals\"\n• \"Create a job for plumbing\"\n• \"Find buyers for 12 Smith St\"\n• \"Start my day\"",
        position: "left",
        actionLabel: "Next",
    },

    // === SETTINGS & WRAP UP ===
    {
        id: "settings",
        targetId: "settings-link",
        title: "Settings",
        message: "Customize your workspace, update your profile, and configure preferences here.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "finish",
        targetId: null,
        title: "You're All Set! 🚀",
        message: "That's the tour! Start by telling me about your business, or jump into Advanced Mode to explore.\n\nTip: You can replay this tutorial anytime from Settings.",
        actionLabel: "Start Using Pj Buddy",
    },
]

interface TutorialOverlayProps {
    onComplete?: () => void
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
    const { viewMode, setViewMode } = useShellStore()
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    // Only run if in TUTORIAL mode
    if (viewMode !== "TUTORIAL" || !isVisible) return null

    const step = STEPS[currentStepIndex]
    const isFirstStep = currentStepIndex === 0
    const isLastStep = currentStepIndex === STEPS.length - 1

    const handleNext = () => {
        if (currentStepIndex < STEPS.length - 1) {
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
        setViewMode("BASIC") // Go to Basic mode after tutorial
        onComplete?.()
    }

    const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100

    return (
        <>
            {/* Only show Spotlight if there is a target */}
            {step.targetId && (
                <Spotlight targetId={step.targetId}>
                    <Card className="w-[320px] p-5 bg-card text-card-foreground border-border shadow-2xl relative">
                        {/* Skip Button */}
                        <button
                            onClick={handleSkip}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {/* Bot Avatar */}
                        <div className="absolute -top-6 -left-6 h-12 w-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-lg ring-4 ring-background">
                            Pj
                        </div>

                        <h3 className="font-heading font-bold text-lg mb-2 mt-2 pr-6">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed whitespace-pre-line">{step.message}</p>

                        {/* Progress Bar */}
                        <div className="h-1 bg-muted rounded-full mb-4 overflow-hidden">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handlePrev}
                                    disabled={isFirstStep}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-muted-foreground font-mono">
                                    {currentStepIndex + 1} / {STEPS.length}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {!isLastStep && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleSkip}
                                        className="text-xs"
                                    >
                                        Skip Tour
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleNext}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    {step.actionLabel}
                                    {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </Spotlight>
            )}

            {/* Center Modal for steps without target */}
            {!step.targetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="max-w-md w-full"
                    >
                        <Card className="p-8 bg-card border-border shadow-2xl relative overflow-hidden">
                            {/* Skip Button */}
                            {!isLastStep && (
                                <button
                                    onClick={handleSkip}
                                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}

                            {/* Decorative Gradient */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>

                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-xl mb-2">
                                    Pj
                                </div>
                                <h2 className="font-heading text-2xl font-bold text-foreground">{step.title}</h2>
                                <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">{step.message}</p>

                                {/* Progress Bar */}
                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-primary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>

                                <div className="flex items-center gap-4 w-full">
                                    {!isFirstStep && (
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            onClick={handlePrev}
                                            className="flex-1"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Back
                                        </Button>
                                    )}
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        className="flex-1 text-base font-semibold shadow-lg shadow-primary/20"
                                    >
                                        {step.actionLabel}
                                        {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                                    </Button>
                                </div>

                                <span className="text-xs text-muted-foreground">
                                    Step {currentStepIndex + 1} of {STEPS.length}
                                </span>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </>
    )
}
