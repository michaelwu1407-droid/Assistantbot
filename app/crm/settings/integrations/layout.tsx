import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isManagerOrAbove } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function IntegrationsLayout({ children }: { children: ReactNode }) {
  if (!(await isManagerOrAbove())) {
    redirect("/crm/settings");
  }

  return children;
}
