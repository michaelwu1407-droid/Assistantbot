import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function TeachTraceyPage() {
  redirect("/crm/settings/agent")
}
