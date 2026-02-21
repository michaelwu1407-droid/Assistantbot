// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6766432707e282e24650d02db54ce08a@o4510923609079808.ingest.us.sentry.io/4510923609276416",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

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
          event.request.data = "[Scrubbed Sensitive Client Data]";
        }
      } catch (e) {
        // Silent catch for non-stringifiable payloads
      }
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
