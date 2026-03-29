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
        router.push("/crm/dashboard")
    }

    return (
        <div className="flex items-center justify-between">
            <div>
                <h3 className="app-section-title text-lg">Profile</h3>
                <p className="app-body-secondary">
                    Manage your personal details and account preferences.
                </p>
            </div>

            <Button variant="outline" size="toolbar" className="gap-2" onClick={handleReplayTutorial}>
                <Play className="h-4 w-4" />
                Replay Tutorial
            </Button>
        </div>
    )
}
