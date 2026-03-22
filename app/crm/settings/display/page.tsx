import { Separator } from "@/components/ui/separator"
import { DisplaySettingsClient } from "@/components/settings/display-settings-client"

export const dynamic = "force-dynamic"

export default function DisplaySettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Display</h3>
        <p className="text-sm text-slate-500">
          Theme, language, accessibility, and mobile preferences.
        </p>
      </div>
      <Separator />
      <DisplaySettingsClient />
    </div>
  )
}
