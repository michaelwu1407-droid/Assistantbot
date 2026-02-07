"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, MessageSquare, Plus } from "lucide-react"
import Link from "next/link"

export function TutorialView() {
    const [step, setStep] = useState(0)

    const tutorials = [
        {
            title: "Simpler than a CRM",
            description: "Pj Buddy works like a chat. Instead of clicking buttons, just tell the assistant what to do.",
            prompt: "Add a new lead named John Smith",
            icon: MessageSquare,
            color: "bg-blue-500"
        },
        {
            title: "Instant Actions",
            description: "Need to create a job? Just ask. We'll handle the database work for you.",
            prompt: "Create a quote for 123 Main St",
            icon: Plus,
            color: "bg-emerald-500"
        }
    ]

    const handleNext = () => {
        if (step < tutorials.length - 1) {
            setStep(step + 1)
        }
    }

    const isLastStep = step === tutorials.length - 1

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Left Pane - Feature Highlight */}
            <div className={`w-1/2 flex items-center justify-center p-12 transition-colors duration-500 ${step === 0 ? "bg-blue-600" : "bg-emerald-600"}`}>
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
