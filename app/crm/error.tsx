"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
        fetch('/api/log-crash', { method: 'POST', body: JSON.stringify({ message: error.message, stack: error.stack }) }).catch(() => { })
    }, [error])

    return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-red-50 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Something went wrong!</h2>
            <p className="text-slate-500 mb-6 max-w-sm">
                We encountered an error while loading your dashboard. This might be a temporary issue.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => window.location.reload()} variant="outline">
                    Reload Page
                </Button>
                <Button onClick={() => reset()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                </Button>
            </div>
        </div>
    )
}
