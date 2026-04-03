import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isManagerOrAbove } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AnalyticsLayout({ children }: { children: ReactNode }) {
  if (!(await isManagerOrAbove())) {
    redirect("/crm/dashboard");
  }

  return children;
}
