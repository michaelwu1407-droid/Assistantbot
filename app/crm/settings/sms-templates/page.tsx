import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function SmsTemplatesPage() {
  redirect("/crm/settings/call-settings")
}
