"use client";

import posthog from 'posthog-js';
import { PostHogProvider as CSPostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// Initialize PostHog client-side with error handling
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    try {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
            person_profiles: 'identified_only', // Only create profiles for logged-in users to save cost
            capture_pageview: false, // We'll handle pageviews manually or let Next.js routing do it if explicitly configured
            session_recording: {
                maskAllInputs: true, // Default privacy measure: mask all typing
                maskTextSelector: '*[data-private="true"]', // Mask specific DOM elements
            },
            loaded: (posthog) => {
                // Enable debug mode only in local development
                if (process.env.NODE_ENV === 'development') {
                    posthog.debug();
                }
            },
            // Add error handling for network issues
            disable_session_recording: !process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY === 'phc_...',
        });
    } catch (error) {
        console.warn('PostHog initialization failed:', error);
    }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Optionally capture initial pageview on mount
        if (typeof window !== 'undefined' && posthog.__loaded) {
            // posthog.capture('$pageview');
        }
    }, []);

    // Only provide PostHog context if it's properly initialized
    if (typeof window !== 'undefined' && posthog.__loaded) {
        return <CSPostHogProvider client={posthog}>{children}</CSPostHogProvider>;
    }

    // Return children without PostHog if not configured
    return <>{children}</>;
}
