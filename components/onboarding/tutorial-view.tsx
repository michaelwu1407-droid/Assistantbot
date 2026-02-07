"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, MessageSquare, Plus, FileText } from "lucide-react"
import Link from "next/link"
import { useIndustry } from "@/components/providers/industry-provider"

function getTutorials(industry: string | null) {
    if (industry === "TRADES") {
        return [
            {
                title: "Your AI Office Manager",
                description: "Pj Buddy works like a chat. Instead of clicking buttons, just tell the assistant what to do.",
                prompt: "Add a new client named John Smith",
                icon: MessageSquare,
                color: "bg-blue-500"
            },
            {
                title: "Quick Quoting",
                description: "Need to create a quote? Just ask. We'll handle the paperwork for you.",
                prompt: "Create a quote for 123 Main St worth 5000",
                icon: FileText,
                color: "bg-emerald-500"
            },
            {
                title: "Track Your Jobs",
                description: "See all your jobs at a glance. Find stale ones that need follow-up.",
                prompt: "Show stale jobs",
                icon: Plus,
                color: "bg-amber-500"
            }
        ]
    }

    if (industry === "REAL_ESTATE") {
        return [
            {
                title: "Your AI Office Manager",
                description: "Pj Buddy works like a chat. Instead of clicking buttons, just tell the assistant what to do.",
                prompt: "Add a new buyer named Sarah Johnson",
                icon: MessageSquare,
                color: "bg-blue-500"
            },
            {
                title: "Manage Listings",
                description: "Create and track listings effortlessly. Just tell the assistant.",
                prompt: "New deal 42 Ocean Drive for $1,200,000",
                icon: FileText,
                color: "bg-emerald-500"
            },
            {
                title: "Never Miss a Lead",
                description: "Find listings that need attention before they go cold.",
                prompt: "Show stale listings",
                icon: Plus,
                color: "bg-amber-500"
            }
        ]
    }

    // Default/generic
    return [
        {
            title: "Simpler than a CRM",
            description: "Pj Buddy works like a chat. Instead of clicking buttons, just tell the assistant what to do.",
            prompt: "Add a new lead named John Smith",
            icon: MessageSquare,
            color: "bg-blue-500"
        },
        {
            title: "Instant Actions",
            description: "Need to create a deal? Just ask. We'll handle the database work for you.",
            prompt: "New deal Website Redesign for Acme worth 5000",
            icon: Plus,
            color: "bg-emerald-500"
        }
    ]
}

const stepColors = ["bg-blue-600", "bg-emerald-600", "bg-amber-600"]

export function TutorialView() {
    const { industry } = useIndustry()
    const [step, setStep] = useState(0)

    const tutorials = getTutorials(industry)

    const handleNext = () => {
        if (step < tutorials.length - 1) {
            setStep(step + 1)
        }
    }

    const isLastStep = step === tutorials.length - 1

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Left Pane - Feature Highlight */}
            <div className={`w-1/2 flex items-center justify-center p-12 transition-colors duration-500 ${stepColors[step] ?? "bg-blue-600"}`}>
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-white space-y-6 max-w-md"
                >
                    <div className={`w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm`}>
                        {tutorials[step].icon && (() => {
                            const Icon = tutorials[step].icon
                            return <Icon className="h-8 w-8 text-white" />
                        })()}
                    </div>
                    <h2 className="text-4xl font-bold">{tutorials[step].title}</h2>
                    <p className="text-lg text-blue-100/90 leading-relaxed">
                        {tutorials[step].description}
                    </p>

                    {/* Pagination Dots */}
                    <div className="flex gap-2 pt-8">
                        {tutorials.map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-white" : "w-2 bg-white/40"}`}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Right Pane - Assistant Prompt Guide */}
            <div className="w-1/2 flex items-center justify-center p-12 bg-white relative">
                <div className="absolute top-8 right-8">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="text-slate-400 hover:text-slate-900">Skip</Button>
                    </Link>
                </div>

                <div className="max-w-md w-full space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-semibold text-slate-900">Try it out</h3>
                        <p className="text-slate-500">
                            The assistant is ready. Type this command to see the magic happen.
                        </p>
                    </div>

                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 relative group cursor-pointer hover:border-slate-900 transition-colors">
                        <div className="absolute -top-3 left-4 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded">
                            EXAMPLE PROMPT
                        </div>
                        <p className="font-mono text-lg text-slate-700">
                            &quot;{tutorials[step].prompt}&quot;
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        {!isLastStep ? (
                            <Button onClick={handleNext} size="lg" className="w-full">
                                Next Tip <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Link href="/dashboard" className="w-full">
                                <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800">
                                    Go to Dashboard <Check className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
