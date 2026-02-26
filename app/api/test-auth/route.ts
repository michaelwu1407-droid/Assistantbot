import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test Supabase client creation
    const supabase = createClient();
    
    // Test a simple auth call
    const { data, error } = await supabase.auth.getSession();
    
    return NextResponse.json({
      status: 'ok',
      supabase: {
        clientCreated: true,
        session: data.session ? 'exists' : 'none',
        error: error ? error.message : null,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
