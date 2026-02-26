import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getAuthUserId, getAuthUser } from "@/lib/auth";
import { AuthError } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export default async function DebugAuthPage() {
  let serverAuth = null;
  let serverError: AuthError | Error | null = null;
  let userId = null;
  let userError: Error | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    serverAuth = data;
    serverError = error;
  } catch (e) {
    serverError = e instanceof Error ? e : new Error('Unknown error');
  }

  try {
    userId = await getAuthUserId();
  } catch (e) {
    userError = e instanceof Error ? e : new Error('Unknown error');
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Information</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Server-side Supabase Auth:</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({ user: serverAuth?.user, error: serverError?.message || 'No error' }, null, 2)}
          </pre>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">getAuthUserId():</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {userId ? `Success: ${userId}` : `Error: ${userError?.message || 'Unknown error'}`}
          </pre>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Environment Variables:</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({
              NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
              NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
              SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
            }, null, 2)}
          </pre>
        </div>

        <ClientDebug />
      </div>
    </div>
  );
}

function ClientDebug() {
  return (
    <div className="p-4 border rounded">
      <h2 className="font-semibold mb-2">Client-side Auth Check:</h2>
      <div id="client-auth-result" className="text-sm bg-gray-100 p-2 rounded">
        Checking client-side auth...
      </div>
    </div>
  );
}
