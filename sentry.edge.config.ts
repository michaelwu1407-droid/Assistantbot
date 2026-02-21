// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6766432707e282e24650d02db54ce08a@o4510923609079808.ingest.us.sentry.io/4510923609276416",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

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
          event.request.data = "[Scrubbed Sensitive Edge Data]";
        }
      } catch (e) {
        // Silent catch for non-stringifiable payloads
      }
    }
    return event;
  },
});
