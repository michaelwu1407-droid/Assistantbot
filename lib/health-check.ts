import { getCustomerAgentReadiness } from './customer-agent-readiness';
import {
  getKnownEarlymarkInboundNumbers,
} from './earlymark-inbound-config';
import { createAdminClient } from './supabase/server-robust';
import { auditTwilioVoiceRouting } from './twilio-drift';
import { getVoiceAgentRuntimeDrift } from './voice-agent-runtime';

export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  timestamp: Date;
}> {
  const startTime = Date.now();

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('workspace')
      .select('count')
      .limit(1)
      .single();

    const latency = Date.now() - startTime;

    if (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }

    return {
      status: 'healthy',
      latency,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Database health check exception:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

export function validateEnvironment(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'DATABASE_URL',
    'DIRECT_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);
  const warnings: string[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL contains placeholder value');
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('placeholder')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY contains placeholder value');
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push('NEXT_PUBLIC_APP_URL is missing; Twilio voice gateway callbacks and diagnostics may drift');
  }

  if (getKnownEarlymarkInboundNumbers().length === 0) {
    warnings.push('No Earlymark inbound phone number is configured (EARLYMARK_INBOUND_PHONE_NUMBERS / EARLYMARK_INBOUND_PHONE_NUMBER / EARLYMARK_PHONE_NUMBER / TWILIO_PHONE_NUMBER)');
  }

  return {
    valid: missing.length === 0 && warnings.length === 0,
    missing,
    warnings,
  };
}

async function auditInboundVoiceRouting(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  warnings: string[];
}> {
  const drift = await auditTwilioVoiceRouting({ apply: false });
  return {
    status: drift.status,
    warnings: drift.warnings.length > 0 ? drift.warnings : [drift.summary].filter(Boolean),
  };
}

export async function performStartupHealthCheck(): Promise<void> {
  console.log('[startup] Performing startup health check...');

  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    console.warn('[startup] Environment validation issues:', envCheck);
  }

  try {
    const dbCheck = await checkDatabaseHealth();
    if (dbCheck.status === 'unhealthy') {
      console.warn('[startup] Database health check failed:', dbCheck.error);
    } else {
      console.log('[startup] Database health check passed:', dbCheck);
    }
  } catch (error) {
    console.warn('[startup] Database health check exception:', error);
  }

  try {
    const voiceAudit = await auditInboundVoiceRouting();
    if (voiceAudit.status !== 'healthy') {
      console.warn('[startup] Inbound voice routing audit issues:', voiceAudit.warnings);
    } else {
      console.log('[startup] Inbound voice routing audit passed');
    }
  } catch (error) {
    console.warn('[startup] Inbound voice routing audit exception:', error);
  }

  try {
    const runtime = await getVoiceAgentRuntimeDrift();
    if (runtime.status !== 'healthy') {
      console.warn('[startup] LiveKit worker runtime drift:', runtime);
    } else {
      console.log('[startup] LiveKit worker runtime fingerprint matches expected env');
    }
  } catch (error) {
    console.warn('[startup] LiveKit worker runtime audit exception:', error);
  }

  try {
    const readiness = await getCustomerAgentReadiness();
    if (readiness.overallStatus !== 'healthy') {
      console.warn('[startup] Customer-facing agent readiness issues:', readiness);
    } else {
      console.log('[startup] Customer-facing agent readiness passed');
    }
  } catch (error) {
    console.warn('[startup] Customer-facing agent readiness audit exception:', error);
  }
}
