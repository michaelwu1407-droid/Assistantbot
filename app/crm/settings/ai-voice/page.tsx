import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function AIVoiceSettingsPage() {
  redirect("/crm/settings/call-settings")
}
