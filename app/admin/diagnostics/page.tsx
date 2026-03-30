import { redirect } from "next/navigation";

export default async function DiagnosticsPage() {
  redirect("/admin/customer-usage?tab=ops#webhooks");
}
