import { Separator } from "@/components/ui/separator"
import { CallSettingsClient } from "@/components/settings/call-settings-client"

export const dynamic = "force-dynamic"

export default function CallSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="app-section-title">Calls & texting</h3>
        <p className="app-body-secondary">
          Set when Tracey may contact customers and the text messages she sends.
        </p>
      </div>
      <Separator />
      <CallSettingsClient />
    </div>
  )
}
