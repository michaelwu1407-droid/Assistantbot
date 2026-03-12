import { NextResponse } from 'next/server';
import { getCustomerAgentReadiness } from '@/lib/customer-agent-readiness';
import { checkDatabaseHealth } from '@/lib/health-check';
import { getVoiceAgentRuntimeDrift } from '@/lib/voice-agent-runtime';
import { auditTwilioMessagingRouting, auditTwilioVoiceRouting } from '@/lib/twilio-drift';
import { getVoiceFleetHealth } from '@/lib/voice-fleet';
import { getVoiceLatencyHealth } from '@/lib/voice-call-latency-health';
import { combineVoiceStatuses } from '@/lib/voice-monitoring';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [database, voiceWorker, voiceFleet, voiceLatency, twilioVoiceRouting, twilioMessagingRouting] = await Promise.all([
      checkDatabaseHealth(),
      getVoiceAgentRuntimeDrift(),
      getVoiceFleetHealth(),
      getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 }),
      auditTwilioVoiceRouting({ apply: false }),
      auditTwilioMessagingRouting({ apply: false }),
    ]);
    const customerFacingAgents = await getCustomerAgentReadiness({
      twilioVoiceRouting,
      twilioMessagingRouting,
      voiceWorker,
      voiceFleet,
      voiceLatency,
    });

    const voiceStatus = combineVoiceStatuses([
      voiceWorker.status,
      voiceFleet.status,
      voiceLatency.status,
      twilioVoiceRouting.status,
    ]);

    const healthCheck = {
      status:
        database.status === 'unhealthy' ||
        customerFacingAgents.overallStatus === 'unhealthy' ||
        twilioMessagingRouting.status === 'unhealthy' ||
        voiceStatus === 'unhealthy'
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
        voiceWorker: voiceStatus,
        twilioVoiceRouting: twilioVoiceRouting.status,
        twilioMessagingRouting: twilioMessagingRouting.status,
        sentry: 'configured',
        posthog: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'configured' : 'disabled',
      },
      customerFacingAgents,
      voiceWorker,
      voiceFleet,
      voiceLatency,
      twilioVoiceRouting,
      twilioMessagingRouting,
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
