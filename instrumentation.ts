import * as Sentry from "@sentry/nextjs";
import { performStartupHealthCheck } from "./lib/health-check";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    
    // Perform startup health check in production - non-blocking
    if (process.env.NODE_ENV === 'production') {
      try {
        await performStartupHealthCheck();
      } catch (error) {
        console.warn('⚠️ Startup health check issue:', error);
        // Log to Sentry if available, but don't crash the app
        if (process.env.SENTRY_DSN) {
          try {
            Sentry.captureException(error);
          } catch (sentryError) {
            console.warn('Failed to log health check error to Sentry:', sentryError);
          }
        }
        // Don't throw - let the app continue starting
      }
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
