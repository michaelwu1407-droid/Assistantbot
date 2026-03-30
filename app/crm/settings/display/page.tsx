import { Separator } from "@/components/ui/separator"
import { DisplaySettingsClient } from "@/components/settings/display-settings-client"

export const dynamic = "force-dynamic"

export default async function DisplaySettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="app-section-title">Display</h3>
        <p className="app-body-secondary">
          Language, text size, and mobile app settings.
        </p>
      </div>
      <Separator />
      <DisplaySettingsClient />
    </div>
  )
}
