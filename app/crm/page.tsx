import { redirect } from "next/navigation"

/** Pipeline / Kanban lives at `/crm/dashboard`. `/crm` keeps the segment for shared layout. */
export default function CrmIndexPage() {
  redirect("/crm/dashboard")
}
