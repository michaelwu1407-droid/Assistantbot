import { createClient } from "@/lib/supabase/client";

export const dynamic = 'force-dynamic';

export default async function MinimalAuthTest() {
  let supabaseTest = "FAILED";
  let error = null;

  try {
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.getSession();
    supabaseTest = authError ? `ERROR: ${authError.message}` : "SUCCESS";
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
    supabaseTest = "FAILED";
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Minimal Auth Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Supabase Client Test:</h2>
        <div style={{ 
          padding: '10px', 
          backgroundColor: supabaseTest === 'SUCCESS' ? '#d4edda' : '#f8d7da',
          borderRadius: '4px'
        }}>
          {supabaseTest}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Error:</h2>
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#f8d7da',
            borderRadius: '4px',
            color: '#721c24'
          }}>
            {error}
          </div>
        </div>
      )}

      <div>
        <h2>Environment:</h2>
        <pre>
          {JSON.stringify({
            NODE_ENV: process.env.NODE_ENV,
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <a href="/auth" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Go to Auth Page
        </a>
      </div>
    </div>
  );
}
