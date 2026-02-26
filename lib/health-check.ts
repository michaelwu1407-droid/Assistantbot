import { createAdminClient } from './supabase/server-robust';

// Health check system for database connectivity
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  timestamp: Date;
}> {
  const startTime = Date.now();
  
  try {
    const adminClient = createAdminClient();
    
    // Simple ping query to test connectivity
    const { error, data } = await adminClient
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
        timestamp: new Date()
      };
    }

    return {
      status: 'healthy',
      latency,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Database health check exception:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

// Environment validation
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
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  const warnings: string[] = [];

  // Check for placeholder values
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL contains placeholder value');
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('placeholder')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY contains placeholder value');
  }

  return {
    valid: missing.length === 0 && warnings.length === 0,
    missing,
    warnings
  };
}

// Startup health check - non-blocking, logs warnings but doesn't crash
export async function performStartupHealthCheck(): Promise<void> {
  console.log('🔍 Performing startup health check...');
  
  // Check environment variables - log warnings but don't crash
  const envCheck = validateEnvironment();
  if (!envCheck.valid) {
    console.warn('⚠️ Environment validation issues:', {
      missing: envCheck.missing,
      warnings: envCheck.warnings
    });
    // Don't throw - let the app start and handle errors gracefully
    console.log('⚠️ Continuing despite missing environment variables...');
  }

  // Check database connectivity - log warnings but don't crash
  try {
    const dbCheck = await checkDatabaseHealth();
    if (dbCheck.status === 'unhealthy') {
      console.warn('⚠️ Database health check failed:', dbCheck.error);
      // Don't throw - let the app start and handle errors gracefully
      console.log('⚠️ Continuing despite database connectivity issues...');
    } else {
      console.log('✅ Database health check passed:', {
        database: dbCheck.status,
        latency: dbCheck.latency,
        timestamp: dbCheck.timestamp
      });
    }
  } catch (error) {
    console.warn('⚠️ Database health check exception:', error);
    // Don't throw - let the app start
  }
}
