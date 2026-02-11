"use client"

import { Button } from "@/components/ui/button"
import { Play, HelpCircle } from "lucide-react"
import { useShellStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Help & Support
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleReplayTutorial} className="gap-2 cursor-pointer">
                        <Play className="h-4 w-4" />
                        Replay Tutorial
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
                        <HelpCircle className="h-4 w-4" />
                        Documentation (Soon)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
