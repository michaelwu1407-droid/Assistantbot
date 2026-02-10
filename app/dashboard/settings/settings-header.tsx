"use client"

import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { useShellStore } from "@/lib/store"
import { useRouter } from "next/navigation"

export function SettingsHeader() {
    const { setViewMode } = useShellStore()
    const router = useRouter()

    const handleReplayTutorial = () => {
        setViewMode("TUTORIAL")
        router.push("/dashboard")
    }

    return (
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-lg font-medium">Profile</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your personal details and account preferences.
                </p>
            </div>
            <Button variant="outline" onClick={handleReplayTutorial} className="gap-2">
                <Play className="h-4 w-4" />
                Replay Tutorial
            </Button>
        </div>
    )
}
