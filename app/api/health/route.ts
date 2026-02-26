import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'SET' : 'MISSING',
      },
      services: {
        sentry: 'configured',
        posthog: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'configured' : 'disabled',
      }
    };

    return NextResponse.json(healthCheck);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
