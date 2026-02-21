"use client";

import posthog from 'posthog-js';
import { PostHogProvider as CSPostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// Initialize PostHog client-side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
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
        }
    });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Optionally capture initial pageview on mount
        if (typeof window !== 'undefined' && posthog.__loaded) {
            // posthog.capture('$pageview');
        }
    }, []);

    return <CSPostHogProvider client={posthog}>{children}</CSPostHogProvider>;
}
