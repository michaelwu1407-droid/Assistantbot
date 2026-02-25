import * as Sentry from "@sentry/nextjs";
import { performStartupHealthCheck } from "./lib/health-check";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    
    // Perform startup health check in production
    if (process.env.NODE_ENV === 'production') {
      try {
        await performStartupHealthCheck();
      } catch (error) {
        console.error('❌ Critical startup health check failed:', error);
        Sentry.captureException(error);
        // In production, fail fast to prevent serving broken requests
        throw error;
      }
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
