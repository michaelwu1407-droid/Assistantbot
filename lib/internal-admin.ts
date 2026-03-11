import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function getInternalAdminAllowlist() {
  return (process.env.INTERNAL_USAGE_DASHBOARD_ALLOWED_EMAILS || "")
    .split(/[,\n]/)
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
}

export function isInternalAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const allowlist = getInternalAdminAllowlist();
  return allowlist.length > 0 && allowlist.includes(normalized);
}

export async function requireInternalAdminAccess() {
  const authUser = await getAuthUser();
  if (!authUser) {
    redirect("/auth");
  }

  if (!isInternalAdminEmail(authUser.email)) {
    notFound();
  }

  return authUser;
}
