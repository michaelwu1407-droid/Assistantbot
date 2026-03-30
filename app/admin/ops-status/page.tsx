import { redirect } from "next/navigation";

export default async function OpsStatusPage() {
  redirect("/admin/customer-usage?tab=ops");
}
