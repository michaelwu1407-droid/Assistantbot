"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PhoneForwarded, PhoneOff, Shield } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function CallForwardingCard() {
  const [active, setActive] = useState<"full" | "backup" | "off" | null>(null)

  const handleCopyInstruction = (label: string, code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`${label} code copied`)
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneForwarded className="h-5 w-5" />
          Call forwarding
        </CardTitle>
        <CardDescription>
          One-tap forwarding so your mobile sends calls to your AI agent. Set up on your phone using your carrier&apos;s USSD or settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            variant={active === "full" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            onClick={() => setActive("full")}
          >
            <Shield className="h-5 w-5" />
            <span>Enable 100% AI</span>
            <span className="text-xs font-normal opacity-90">All calls go to AI agent</span>
          </Button>
          <Button
            variant={active === "backup" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            onClick={() => setActive("backup")}
          >
            <PhoneForwarded className="h-5 w-5" />
            <span>Backup AI</span>
            <span className="text-xs font-normal opacity-90">Unanswered → AI</span>
          </Button>
          <Button
            variant={active === "off" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            onClick={() => setActive("off")}
          >
            <PhoneOff className="h-5 w-5" />
            <span>Turn off AI</span>
            <span className="text-xs font-normal opacity-90">Calls to your phone only</span>
          </Button>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">Instructions</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>100% AI:</strong> In your phone&apos;s call settings, set &quot;Call forwarding&quot; or &quot;When busy/unanswered&quot; to your AI business number (shown in Automated calling & texting).</li>
            <li><strong>Backup AI:</strong> Forward only when unanswered (e.g. after 15–30 seconds) to your AI number.</li>
            <li><strong>Turn off:</strong> Disable call forwarding in your phone settings.</li>
          </ul>
          <p className="mt-2 text-xs">Your AI business number is in Settings → Automated calling & texting.</p>
        </div>
      </CardContent>
    </Card>
  )
}
