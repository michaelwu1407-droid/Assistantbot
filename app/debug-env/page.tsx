import { createClient } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

export default async function DebugEnvPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  };

  let supabaseTest = "FAILED";
  try {
    const supabase = createClient();
    supabaseTest = "SUCCESS";
  } catch (error) {
    supabaseTest = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Debug</h1>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>
      
      <h2>Supabase Client Test</h2>
      <pre>{supabaseTest}</pre>
      
      <h2>Process Info</h2>
      <pre>
        {JSON.stringify({
          isServer: typeof window === 'undefined',
          runtime: process.env.NEXT_RUNTIME,
          timestamp: new Date().toISOString(),
        }, null, 2)}
      </pre>
    </div>
  );
}
