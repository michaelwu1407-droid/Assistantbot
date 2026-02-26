import { UnifiedAuth } from "@/components/auth/unified-auth";

export const dynamic = 'force-dynamic';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <UnifiedAuth connectionError={params.error === "connection"} />;
}
