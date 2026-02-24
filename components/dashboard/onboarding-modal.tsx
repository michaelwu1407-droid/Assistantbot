"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useShellStore } from "@/lib/store"

export function OnboardingModal() {
    const [open, setOpen] = React.useState(false) // Default to closed, trigger via effect
    const { viewMode } = useShellStore()

    React.useEffect(() => {
        // In a real app, check localStorage or DB 'hasOnboarded' flag
        const hasSeenOnboarding = localStorage.getItem("pj-buddy-onboarding-complete")
        if (!hasSeenOnboarding) {
            setOpen(true)
        }
    }, [])

    const handleComplete = () => {
        localStorage.setItem("pj-buddy-onboarding-complete", "true")
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
                        <Sparkles className="h-6 w-6 text-emerald-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Welcome to Earlymark!</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Your all-in-one assistant for Tradies and Real Estate Agents.
                        We're here to help you automate the boring stuff.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 border border-slate-100">
                        <p className="font-medium text-slate-900 mb-1">Getting Started:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Switch between <strong>Tradie</strong> and <strong>Agent</strong> modes.</li>
                            <li>Use <strong>Ctrl+K</strong> to jump anywhere fast.</li>
                            <li>Check your <strong>Settings</strong> to customize your profile.</li>
                        </ul>
                    </div>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button type="button" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleComplete}>
                        Let's Go!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
