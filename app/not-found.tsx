"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 text-center animate-in fade-in duration-500">
            <div className="mb-8 p-6 bg-white rounded-full shadow-sm border border-slate-100">
                <Home className="h-12 w-12 text-slate-300" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tighter mb-2">Page Not Found</h1>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
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
