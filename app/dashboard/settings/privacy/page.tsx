import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { FileText, Shield, Download } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default function PrivacySettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Data and privacy</h3>
        <p className="text-sm text-slate-500">
          Terms, data handling, and export requests.
        </p>
      </div>
      <Separator />

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Terms and conditions
          </CardTitle>
          <CardDescription>
            Legal compliance and acceptance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            By using Pj Buddy you agree to our terms of service and privacy policy.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/terms" target="_blank">View terms</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/privacy" target="_blank">View privacy policy</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            How your data is handled
          </CardTitle>
          <CardDescription>
            Transparency on storage, retention, and use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your CRM data (contacts, deals, messages) is stored securely and used only to provide the service. We do not sell your data. Retention follows our privacy policy.
          </p>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Request data export
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
