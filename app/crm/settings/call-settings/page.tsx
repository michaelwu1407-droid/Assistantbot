import { Separator } from "@/components/ui/separator"
import { CallSettingsClient } from "@/components/settings/call-settings-client"

export const dynamic = "force-dynamic"

export default function CallSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Calls & texting
        </h3>
        <p className="text-sm text-slate-500">
          Set when Tracey may contact customers, how urgent calls are handled, and the text messages she sends.
        </p>
      </div>
      <Separator />
      <CallSettingsClient />
    </div>
  )
}
