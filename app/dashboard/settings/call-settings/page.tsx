import { Separator } from "@/components/ui/separator"
import { CallSettingsClient } from "@/components/settings/call-settings-client"

export const dynamic = "force-dynamic"

export default function CallSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Automated calling and texting
        </h3>
        <p className="text-sm text-slate-500">
          AI agent number, emergency routing, transcription, behavior, and message templates.
        </p>
      </div>
      <Separator />
      <CallSettingsClient />
    </div>
  )
}
