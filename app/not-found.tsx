"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center animate-in fade-in duration-500 relative">
            <div className="absolute inset-0 ott-glow -z-10" />

            <div className="mb-8 p-6 bg-card rounded-[24px] shadow-ott border border-border/60">
                <Home className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold text-midnight tracking-tight mb-2">Page Not Found</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                The page you are looking for doesn&apos;t exist or has been moved.
            </p>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.history.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
                <Button asChild>
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        </div>
    )
}
