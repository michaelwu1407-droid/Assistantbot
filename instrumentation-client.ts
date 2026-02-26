// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry in production with DSN
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Add optional integrations for additional features
      integrations: [Sentry.replayIntegration()],

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 0.1, // Reduced sampling rate

      // Enable logs to be sent to Sentry
      enableLogs: true,

      // Define how likely Replay events are sampled.
      replaysSessionSampleRate: 0.1,

      // Define how likely Replay events are sampled when an error occurs.
      replaysOnErrorSampleRate: 1.0,

      // Enable sending user PII (Personally Identifiable Information)
      sendDefaultPii: true,

      beforeSend(event, hint) {
        if (event.request?.data) {
          try {
            const dataStr = typeof event.request.data === 'string'
              ? event.request.data
              : JSON.stringify(event.request.data);

            const strLower = dataStr.toLowerCase();
            if (strLower.includes('password') || strLower.includes('creditcard') || strLower.includes('ssn') || strLower.includes('cardnumber')) {
              event.request.data = "[Scrubbed Sensitive Client Data]";
            }
          } catch (e) {
            // Silent catch for non-stringifiable payloads
          }
        }
        return event;
      },
    });
  } catch (error) {
    console.warn('Failed to initialize Sentry client:', error);
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
