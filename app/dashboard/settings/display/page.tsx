import { Separator } from "@/components/ui/separator"

export default function DisplaySettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Display</h3>
                <p className="text-sm text-muted-foreground">
                    Turn items on or off to control what's displayed in the app.
                </p>
            </div>
            <Separator />
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Display settings coming soon.</p>
            </div>
        </div>
    )
}
