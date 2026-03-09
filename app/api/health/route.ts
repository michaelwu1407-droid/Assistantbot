import { NextResponse } from 'next/server';
import { getCustomerAgentReadiness } from '@/lib/customer-agent-readiness';
import { checkDatabaseHealth } from '@/lib/health-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [database, customerFacingAgents] = await Promise.all([
      checkDatabaseHealth(),
      getCustomerAgentReadiness(),
    ]);

    const healthCheck = {
      status:
        database.status === 'unhealthy' || customerFacingAgents.overallStatus === 'unhealthy'
          ? 'degraded'
          : 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'SET' : 'MISSING',
      },
      services: {
        database: database.status,
        sentry: 'configured',
        posthog: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'configured' : 'disabled',
      },
      customerFacingAgents,
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
