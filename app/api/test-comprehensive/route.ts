import { NextResponse, NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = {
    middleware: 'not_tested',
    serverClient: 'not_tested',
    clientClient: 'not_tested',
    errors: [] as string[],
  };

  try {
    // Test middleware function
    const request = new NextRequest('http://localhost:3000/test');
    const response = await updateSession(request);
    results.middleware = 'success';
  } catch (error) {
    results.middleware = 'failed';
    results.errors.push(`Middleware: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Test server client
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    results.serverClient = error ? `error: ${error.message}` : 'success';
  } catch (error) {
    results.serverClient = 'failed';
    results.errors.push(`Server client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Test client client (this should work in API routes)
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.getUser();
    results.clientClient = error ? `error: ${error.message}` : 'success';
  } catch (error) {
    results.clientClient = 'failed';
    results.errors.push(`Client client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return NextResponse.json({
    status: results.errors.length === 0 ? 'ok' : 'partial',
    results,
    timestamp: new Date().toISOString(),
  });
}
