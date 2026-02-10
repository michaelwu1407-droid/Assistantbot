import { Separator } from "@/components/ui/separator"
import { ProfileForm } from "./profile-form"
import { AppearanceForm } from "./appearance-form"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { useShellStore } from "@/lib/store"
import { useRouter } from "next/navigation"

export default function SettingsProfilePage() {
    const { setViewMode } = useShellStore()
    const router = useRouter()

    const handleReplayTutorial = () => {
        setViewMode("TUTORIAL")
        router.push("/dashboard")
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Profile</h3>
                    <p className="text-sm text-muted-foreground">
                        This is how others will see you on the site.
                    </p>
                </div>
                <Button variant="outline" onClick={handleReplayTutorial} className="gap-2">
                    <Play className="h-4 w-4" />
                    Replay Tutorial
                </Button>
            </div>
            <Separator />
            <ProfileForm />

            <div className="pt-6">
                <div>
                    <h3 className="text-lg font-medium">Appearance</h3>
                    <p className="text-sm text-muted-foreground">
                        Customize the look and feel of the dashboard.
                    </p>
                </div>
                <Separator className="my-4" />
                <AppearanceForm />
            </div>
        </div>
    )
}
