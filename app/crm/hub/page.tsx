import { redirect } from "next/navigation";

export default function LegacyHubPage() {
  redirect("/crm/dashboard");
}

