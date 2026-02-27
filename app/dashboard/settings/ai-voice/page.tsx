import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AIVoiceSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Settings Moved</CardTitle>
        <CardDescription>
          Voice and advanced call settings are now inside Automated calling and texting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/dashboard/settings/call-settings">Go to Automated calling and texting</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
