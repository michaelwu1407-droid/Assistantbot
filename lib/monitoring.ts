import * as Sentry from '@sentry/nextjs';

// Safe PostHog import with fallback
let posthog: any;
try {
  posthog = require('posthog-js');
} catch (error) {
  console.warn('PostHog not available:', error);
  posthog = {
    __loaded: false,
    capture: () => {},
    identify: () => {},
    reset: () => {}
  };
}

export const MonitoringService = {
    /**
     * Logs a handled or unhandled exception to Sentry.
     * @param error The Error object or string to log.
     * @param context Additional metadata/context (e.g. tag context or extra data).
     */
    logError: (error: Error | string, context?: Record<string, any>) => {
        try {
            console.error("MonitoringService Caught Error:", error, context);

            // Only try to use Sentry if it's available
            if (typeof Sentry !== 'undefined' && Sentry.captureException) {
                Sentry.withScope((scope) => {
                    if (context) {
                        scope.setExtras(context);

                        // Optionally map specific context keys to Sentry tags for easier filtering
                        if (context.component) scope.setTag('component', context.component);
                        if (context.action) scope.setTag('action', context.action);
                        if (context.userId) scope.setTag('userId', context.userId);
                    }

                    const errorObj = typeof error === 'string' ? new Error(error) : error;
                    Sentry.captureException(errorObj);
                });
            } else {
                console.warn('Sentry not available, error logged to console only');
            }
        } catch (sentryError) {
            console.error('Failed to log error to Sentry:', sentryError);
            console.error('Original error:', error);
        }
    },

    /**
     * Tracks a custom product analytics event via PostHog.
     * @param eventName The specific action being tracked (e.g., 'deal_created').
     * @param properties Associated metadata for the event.
     */
    trackEvent: (eventName: string, properties?: Record<string, any>) => {
        try {
            // Basic PII scrubbing definition
            const scrubbedProperties = { ...properties };

            // Explicitly delete highly sensitive keys if they accidentally get passed
            if (scrubbedProperties.password) delete scrubbedProperties.password;
            if (scrubbedProperties.creditCard) delete scrubbedProperties.creditCard;
            if (scrubbedProperties.ssn) delete scrubbedProperties.ssn;

            // Only fire event if window is defined (client-side) and PostHog is loaded
            if (typeof window !== 'undefined' && posthog && posthog.__loaded) {
                posthog.capture(eventName, scrubbedProperties);
            } else {
                // If we're on the server or posthog hasn't loaded, we log it so we don't lose the footprint in local dev
                console.log(`[SSR Event Skipped/Simulated] ${eventName}`, scrubbedProperties);
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            // Don't re-throw - tracking failures shouldn't break the app
        }
    },

    /**
     * Unifies session identity. Links the authenticated user tightly across both systems.
     * @param userId The unique User ID from the database/auth provider.
     * @param traits Identifying data (Email, Name, Role)
     */
    identifyUser: (userId: string, traits?: { email?: string; name?: string; role?: string }) => {
        try {
            // 1. Identify User in Sentry
            if (typeof Sentry !== 'undefined' && Sentry.setUser) {
                Sentry.setUser({
                    id: userId,
                    email: traits?.email,
                    username: traits?.name,
                    extra: {
                        role: traits?.role,
                    },
                });
            }

            // 2. Identify User in PostHog (only if loaded)
            if (typeof window !== 'undefined' && posthog && posthog.__loaded) {
                posthog.identify(userId, {
                    email: traits?.email,
                    name: traits?.name,
                    role: traits?.role,
                });
            }
        } catch (error) {
            console.error('Error identifying user:', error);
            // Don't re-throw - identification failures shouldn't break the app
        }
    },

    /**
     * Clears the current user's identity from both Sentry and PostHog.
     * Call this on logout to prevent data leakage between sessions.
     */
    clearUser: () => {
        try {
            // Clear from Sentry
            if (typeof Sentry !== 'undefined' && Sentry.setUser) {
                Sentry.setUser(null);
            }

            // Clear from PostHog (only if loaded)
            if (typeof window !== 'undefined' && posthog && posthog.__loaded) {
                posthog.reset();
            }
        } catch (error) {
            console.error('Error clearing user:', error);
            // Don't re-throw - clearing failures shouldn't break the app
        }
    },
};
