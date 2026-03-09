import { getCustomerAgentReadiness } from './customer-agent-readiness';
import {
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
  phoneMatches,
} from './earlymark-inbound-config';
import { createAdminClient } from './supabase/server-robust';
import { twilioMasterClient } from './twilio';

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
  const warnings: string[] = [];
  const expectedGatewayUrl = getExpectedVoiceGatewayUrl();
  const knownNumbers = getKnownEarlymarkInboundNumbers();

  if (!expectedGatewayUrl) {
    warnings.push('NEXT_PUBLIC_APP_URL is missing, so the expected Twilio voice gateway URL cannot be verified');
    return { status: 'degraded', warnings };
  }

  if (knownNumbers.length === 0) {
    warnings.push('No Earlymark inbound number is configured in env, so inbound sales routing cannot be verified');
    return { status: 'degraded', warnings };
  }

  if (!twilioMasterClient) {
    warnings.push('Twilio master client is unavailable, so inbound phone webhook config cannot be audited');
    return { status: 'degraded', warnings };
  }

  try {
    const incomingNumbers = await twilioMasterClient.incomingPhoneNumbers.list({ limit: 200 });
    const matchedNumbers = incomingNumbers.filter((record) =>
      knownNumbers.some((number) => phoneMatches(number, record.phoneNumber)),
    );

    if (matchedNumbers.length === 0) {
      warnings.push(`Configured Earlymark inbound number(s) were not found on the Twilio account: ${knownNumbers.join(', ')}`);
      return { status: 'unhealthy', warnings };
    }

    for (const record of matchedNumbers) {
      const voiceUrl = record.voiceUrl || '';
      const voiceApplicationSid = record.voiceApplicationSid || '';
      if (voiceApplicationSid) {
        warnings.push(`Inbound number ${record.phoneNumber} uses Twilio Voice Application ${voiceApplicationSid}; expected direct webhook ${expectedGatewayUrl}`);
      } else if (voiceUrl !== expectedGatewayUrl) {
        warnings.push(`Inbound number ${record.phoneNumber} points to ${voiceUrl || '[empty]'} instead of ${expectedGatewayUrl}`);
      }
    }

    return {
      status: warnings.length === 0 ? 'healthy' : 'degraded',
      warnings,
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'Unknown Twilio inbound routing audit failure');
    return { status: 'degraded', warnings };
  }
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
