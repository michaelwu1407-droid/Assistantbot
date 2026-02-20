"use client"

import { useState, useEffect } from "react"
import { useShellStore } from "@/lib/store"
import { Spotlight } from "./spotlight"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, SkipForward, X } from "lucide-react"

const STEPS = [
    // === INTRO SECTION - PROMOTING CHAT-FIRST ===
    {
        id: "welcome",
        targetId: null,
        title: "Welcome to Pj Buddy! 🎉",
        message: "I'm Pj, your AI business assistant. My goal is to handle the heavy lifting of CRM management so you can focus on the tools, not the tech. Let's take a quick tour!",
        actionLabel: "Let's Go",
    },
    {
        id: "chat-first-intro",
        targetId: null,
        title: "💬 Just Chat — That's It!",
        message: "The EASIEST way to use Pj Buddy is to just talk to me like texting a friend.\n\n📱 Type: \"New job for John Smith\"\n📱 Type: \"Show stale deals\"\n📱 Type: \"Send a quote for $500\"\n\nI'll parse exactly what you mean and update the database instantly.",
        actionLabel: "Cool!",
    },

    // === BASIC MODE SECTION ===
    {
        id: "basic-mode",
        targetId: "assistant-pane",
        title: "Basic Mode — Your AI Companion",
        message: "This is where the magic happens. Basic Mode hides all the complex dashboard widgets and leaves you with an intelligent chat interface. You can type commands in plain English here.",
        position: "left",
        actionLabel: "Next",
    },
    {
        id: "voice-input",
        targetId: "voice-btn",
        title: "Voice Commands (Hands-Free)",
        message: "Dirty hands? No problem. Click the microphone to dictate your instructions directly to me. I'll translate your voice into text and execute the request.",
        position: "left",
        actionLabel: "Next",
    },
    {
        id: "chat-examples",
        targetId: "chat-input",
        title: "What You Can Say",
        message: "You can create jobs, ask for directions, or follow up on quotes simply by typing it out here. Give it a try when we finish the tour!",
        position: "left",
        actionLabel: "Next",
    },

    // === ADVANCED MODE & DASHBOARD (START YOUR DAY) ===
    {
        id: "mode-toggle",
        targetId: "mode-toggle-btn",
        title: "Toggle Advanced Mode",
        message: "Sometimes you need the big picture. Click this button at any time to toggle between Basic (chat) and Advanced (full dashboard) modes.",
        position: "bottom",
        actionLabel: "Next",
    },
    {
        id: "start-your-day",
        targetId: "dashboard-link",
        title: "Start Your Day: The Dashboard",
        message: "When you grab your coffee in the morning, start here. The Home Dashboard gives you an immediate bird's-eye view of your business pipeline so you know exactly what needs attention.",
        position: "right",
        actionLabel: "Got it",
    },
    {
        id: "kpi-cards",
        targetId: "kpi-cards",
        title: "Business Metrics",
        message: "Track your real-time total revenue, win rates, and pending jobs at a glance.",
        position: "bottom",
        actionLabel: "Next",
    },

    // === DASHBOARD UTILITIES ===
    {
        id: "search",
        targetId: "search-btn",
        title: "Global Search",
        message: "Lost a client's number? Use the Global Search (or press Cmd+K) to instantly scan all your deals, contacts, and reports.",
        position: "bottom",
        actionLabel: "Next",
    },
    {
        id: "notifications",
        targetId: "notifications-btn",
        title: "Notifications Hub",
        message: "Important alerts (like incoming quote approvals or scheduled reminders) will pop up right here.",
        position: "bottom",
        actionLabel: "Next",
    },

    // === SIDEBAR DEEP DIVE ===
    {
        id: "sidebar",
        targetId: "sidebar-nav",
        title: "The Command Center",
        message: "The left sidebar is your master navigation. Let's walk through the core tools you have access to.",
        position: "right",
        actionLabel: "Let's look",
    },
    {
        id: "kanban",
        targetId: "kanban-link",
        title: "1. Pipeline (Kanban)",
        message: "Manage your active jobs visually here. Drag a deal from 'Quote Sent' to 'Scheduled', and Pj Buddy can automatically trigger SMS confirmations to the client.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "schedule",
        targetId: "schedule-link",
        title: "2. Smart Schedule",
        message: "View your entire week visually. When the AI creates a job for 'Tomorrow at 2pm', it automatically slots into this calendar.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "contacts",
        targetId: "contacts-link",
        title: "3. Contact Directory",
        message: "Every person you interact with is saved to the CRM automatically. View their job history, phone numbers, and internal notes here.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "inbox",
        targetId: "inbox-link",
        title: "4. Unified Inbox",
        message: "Pj Buddy intercepts SMS replies from your clients and routes them directly into this Inbox, just like email. You can reply straight from here!",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "team",
        targetId: "team-link",
        title: "5. Team Management",
        message: "Have subcontractors or employees? Manage their access and assign them specifically to different jobs via the Team portal.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "reports",
        targetId: "reports-link",
        title: "6. Reports & Analytics",
        message: "Dive deep into your margins. See which postal codes generate the most revenue and monitor month-over-month growth.",
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "map-view",
        targetId: "map-link",
        title: "7. Interactive Route Map",
        message: "Crucial for Tradies! Pj Buddy plots the addresses of all your active jobs onto a live map, making it extremely easy to plan efficient driving routes for the day.",
        position: "right",
        actionLabel: "Awesome",
    },
    {
        id: "settings",
        targetId: "settings-link",
        title: "8. Workspace Settings",
        message: "Update your logo, configure your business industry, or customize your AI Assistant's voice responses.",
        position: "right",
        actionLabel: "Next",
    },

    // === MANUAL ENTRY ===
    {
        id: "new-deal",
        targetId: "new-deal-btn",
        title: "Manual Entry Shortcut",
        message: "Prefer doing things the old-fashioned way? Click the 'New Deal' button up here to manually fill out job request forms without using the AI.",
        position: "bottom",
        actionLabel: "Next",
    },

    // === WRAP UP ===
    {
        id: "finish",
        targetId: null,
        title: "You're Ready to Roll! 🚀",
        message: "That concludes the tour. To get started, try asking the AI to 'Create a new test job'.\n\nIf you ever need a refresher, you can replay this tutorial anytime from the top-right Help menu in Settings.",
        actionLabel: "Start Using Pj Buddy",
    },
]

interface TutorialOverlayProps {
    onComplete?: () => void
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
    const { viewMode, setViewMode, tutorialComplete, setTutorialComplete } = useShellStore()
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    // Determined visibility
    const shouldShow = viewMode === "TUTORIAL" && isVisible

    // If not showing, return null safely for now (since Spotlight handles null targetId, but we want to unmount logic)
    // Actually, to prevent the `removeChild` error, we should return null here.
    // The previous error likely came from `AnimatePresence` getting cut off.
    // With Shell refactored, the parent `div` stays mounted. So returning `null` here IS safe now.
    // But let's be cleaner and use the condition below.
    // if (!shouldShow) return <></>

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
        setTutorialComplete()
        setViewMode("BASIC") // Go to Basic mode after tutorial
        onComplete?.()
    }

    const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100

    if (!shouldShow) return null

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
