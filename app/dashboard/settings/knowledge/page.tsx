import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function KnowledgeSettingsPage() {
  redirect("/dashboard/settings/my-business")
}
