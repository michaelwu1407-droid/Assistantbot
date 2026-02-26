// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry in production with DSN
if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 0.1, // Reduced sampling rate

      // Enable logs to be sent to Sentry
      enableLogs: true,

      // Enable sending user PII (Personally Identifiable Information)
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
      sendDefaultPii: true,

      beforeSend(event, hint) {
        if (event.request?.data) {
          try {
            const dataStr = typeof event.request.data === 'string'
              ? event.request.data
              : JSON.stringify(event.request.data);

            const strLower = dataStr.toLowerCase();
            if (strLower.includes('password') || strLower.includes('creditcard') || strLower.includes('ssn') || strLower.includes('cardnumber')) {
              event.request.data = "[Scrubbed Sensitive Server Data]";
            }
          } catch (e) {
            // Silent catch for non-stringifiable payloads
          }
        }
        return event;
      },
    });
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
}
